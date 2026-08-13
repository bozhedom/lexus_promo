import { inviteTestEnv, type GreenCredentials } from '../config/env'
import type { Certificate, Channel } from '../model/types'
import { readCertificateFiles } from './assets'

/**
 * Один клиент на все три мессенджера. У GREEN-API отдельный продукт под
 * WhatsApp, Telegram и MAX, но REST у них общий — `{apiUrl}/waInstance{id}/
 * {метод}/{token}` — и различаются только реквизиты инстанса. Поэтому от
 * настройки любого канала требуется одно и то же: idInstance, apiToken, apiUrl.
 *
 * Инстанс привязан к личному аккаунту менеджера, так что пригласительные
 * приходят гостю из диалога с человеком, а не от бота.
 */

export interface GreenWebhook {
  typeWebhook?: string
  instanceData?: { idInstance?: number | string; typeInstance?: string }
  senderData?: { chatId?: string }
  messageData?: {
    typeMessage?: string
    textMessageData?: { textMessage?: string }
    extendedTextMessageData?: { text?: string }
  }
}

/** Тип инстанса, которым GREEN-API подписывает вебхук. */
const INSTANCE_TYPE: Record<Channel, string> = {
  whatsapp: 'whatsapp',
  telegram: 'telegram',
  max: 'max',
}

export const greenCredentials = (channel: Channel): GreenCredentials | null => {
  const green = inviteTestEnv.green[channel]
  return green.instanceId && green.apiToken && green.apiUrl ? green : null
}

export const isGreenReady = (channel: Channel): boolean => greenCredentials(channel) !== null

/** Каналы, у которых заполнены реквизиты инстанса. */
export const greenChannels = (): Channel[] =>
  (['whatsapp', 'telegram', 'max'] as const).filter(isGreenReady)

const endpoint = (green: GreenCredentials, method: string): string =>
  `${green.apiUrl.replace(/\/$/, '')}/waInstance${green.instanceId}/${method}/${green.apiToken}`

async function call<T>(
  channel: Channel,
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const green = greenCredentials(channel)
  if (!green) throw new Error(`GREEN-API: канал ${channel} не настроен`)

  const res = await fetch(endpoint(green, method), {
    method: body ? 'POST' : 'GET',
    ...(body
      ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  })
  const data = (await res.json().catch(() => null)) as (T & { message?: string }) | null
  if (!res.ok || !data) throw new Error(data?.message || `GREEN-API: ${res.status}`)
  return data
}

/**
 * Входящее сообщение. Канал определяем по идентификатору инстанса: вебхук у
 * всех трёх один, а какой инстанс его прислал — видно из тела.
 */
export function parseIncoming(
  update: GreenWebhook | null,
): { channel: Channel; chatId: string; text: string } | null {
  if (update?.typeWebhook !== 'incomingMessageReceived') return null

  const id = update.instanceData?.idInstance
  const type = update.instanceData?.typeInstance
  const channel = greenChannels().find((item) => {
    const green = greenCredentials(item)!
    if (id != null) return String(id) === green.instanceId
    // Инстанса в теле нет — остаётся тип, если он однозначен.
    return type === INSTANCE_TYPE[item]
  })
  if (!channel) return null
  if (type && type !== INSTANCE_TYPE[channel]) return null

  const chatId = update.senderData?.chatId ?? ''
  // Групповые чаты нам не нужны: код присылают из личного диалога.
  if (!chatId.endsWith('@c.us')) return null

  const text =
    update.messageData?.typeMessage === 'textMessage'
      ? update.messageData.textMessageData?.textMessage
      : update.messageData?.typeMessage === 'extendedTextMessage'
        ? update.messageData.extendedTextMessageData?.text
        : null

  return text ? { channel, chatId, text } : null
}

/** GREEN-API отправляет по одному файлу на запрос. */
export async function sendCertificates(
  channel: Channel,
  chatId: string,
  certificates: Certificate[],
  deliveryText: string,
) {
  const files = await readCertificateFiles(certificates)

  for (const [index, file] of files.entries()) {
    await call<{ idMessage: string }>(channel, 'sendFileByUrl', {
      chatId,
      urlFile: file.url,
      fileName: file.name,
      ...(index === files.length - 1 ? { caption: deliveryText } : {}),
    })
  }
}

export const getState = (channel: Channel) =>
  call<{ stateInstance: string }>(channel, 'getStateInstance')

/**
 * Аккаунт, к которому привязан инстанс: `wid` вида `79991234567@c.us`. По нему
 * собирается ссылка на диалог, поэтому номер не нужно дублировать в настройках.
 */
export const getSettings = (channel: Channel) =>
  call<{ wid?: string; webhookUrl?: string }>(channel, 'getSettings')

/**
 * Номер аккаунта инстанса — из него собирается ссылка на диалог. Кэшируем на
 * процесс: номер не меняется, а ссылка нужна на каждую выдачу кода.
 */
const store = globalThis as typeof globalThis & { __greenAccountPhones?: Map<string, string> }
const phones: Map<string, string> = (store.__greenAccountPhones ??= new Map())

export async function accountPhone(channel: Channel): Promise<string> {
  const green = greenCredentials(channel)
  if (!green) return ''

  const cached = phones.get(green.instanceId)
  if (cached !== undefined) return cached

  try {
    const settings = await getSettings(channel)
    const phone = (settings.wid ?? '').split('@')[0]?.replace(/\D/g, '') ?? ''
    phones.set(green.instanceId, phone)
    return phone
  } catch {
    return ''
  }
}

export const configureWebhook = (channel: Channel, url: string) =>
  call<{ saveSettings: boolean }>(channel, 'setSettings', {
    webhookUrl: url,
    webhookUrlToken: inviteTestEnv.green.webhookToken || '',
    incomingWebhook: 'yes',
    outgoingWebhook: 'no',
    outgoingMessageWebhook: 'no',
    outgoingAPIMessageWebhook: 'no',
    stateWebhook: 'no',
    markIncomingMessagesReadedOnReply: 'yes',
  })

export const clearWebhook = (channel: Channel) =>
  call<{ saveSettings: boolean }>(channel, 'setSettings', {
    webhookUrl: '',
    webhookUrlToken: '',
    incomingWebhook: 'no',
  })
