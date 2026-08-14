import { validatePhone } from '@/lib/validation'

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
  senderData?: {
    chatId?: string
    chatType?: string
    /** Номер отправителя. Telegram отдаёт его не всегда, MAX и WhatsApp — да. */
    senderPhoneNumber?: number | string
  }
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
  // В API GREEN-API для MAX исторически используется имя версии `v3`.
  max: 'v3',
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

export interface IncomingMessage {
  channel: Channel
  chatId: string
  /** Текст сообщения. Пусто — прислали картинку, стикер или что-то ещё. */
  text: string
  /**
   * Номер отправителя в каноническом виде `+7XXXXXXXXXX`. По нему гость
   * узнаётся, когда кода в тексте нет: в MAX подставить текст в чужой диалог
   * нельзя, и сообщение приходит любое.
   */
  phone: string
}

/**
 * Входящее сообщение. Канал определяем по идентификатору инстанса: вебхук у
 * всех трёх один, а какой инстанс его прислал — видно из тела.
 */
export function parseIncoming(update: GreenWebhook | null): IncomingMessage | null {
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
  // Форматы chatId у продуктов GREEN-API различаются. WhatsApp использует
  // суффиксы @c.us (и новый @lid), а Telegram и MAX — положительный числовой
  // идентификатор без суффикса. Отрицательный id и @g.us означают группу.
  const isPersonalChat =
    channel === 'whatsapp'
      ? chatId.endsWith('@c.us') || chatId.endsWith('@lid')
      : /^\d+$/.test(chatId)
  if (!isPersonalChat) return null

  const text =
    update.messageData?.typeMessage === 'textMessage'
      ? update.messageData.textMessageData?.textMessage
      : update.messageData?.typeMessage === 'extendedTextMessage'
        ? update.messageData.extendedTextMessageData?.text
        : null

  // Номер отправителя: у WhatsApp он же и есть chatId, у MAX и Telegram —
  // отдельным полем. Возвращаем даже сообщение без текста: гость, которому
  // текст подставить некуда, шлёт что придётся, и узнаём мы его по номеру.
  const phone =
    validatePhone(String(update.senderData?.senderPhoneNumber ?? '')) ??
    (channel === 'whatsapp' ? validatePhone(chatId.split('@')[0]!) : null)

  return { channel, chatId, text: text ?? '', phone: phone ?? '' }
}

/**
 * GREEN-API отправляет по одному файлу на запрос, и текст мы шлём отдельным
 * сообщением: подпись под картинкой сливалась со вторым пригласительным, а в
 * чате должно остаться три сообщения — два сертификата и слова менеджера.
 */
export async function sendCertificates(
  channel: Channel,
  chatId: string,
  certificates: Certificate[],
  deliveryText: string,
) {
  const files = await readCertificateFiles(certificates)

  for (const file of files) {
    await call<{ idMessage: string }>(channel, 'sendFileByUrl', {
      chatId,
      urlFile: file.url,
      fileName: file.name,
    })
  }

  if (deliveryText.trim()) {
    await call<{ idMessage: string }>(channel, 'sendMessage', {
      chatId,
      message: deliveryText,
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

export interface GreenAccount {
  /** Номер, на который авторизован инстанс. */
  phone: string
  /** @username того же аккаунта, если он у него есть. */
  username: string
}

/**
 * Аккаунт, к которому привязан инстанс. Ссылку на диалог собираем именно по
 * нему: писать гость должен тому, кто слушает вебхук, иначе сообщение с кодом
 * уйдёт в чужой чат и пригласительные не придут.
 *
 * Кэшируем на процесс: аккаунт не меняется, а ссылка нужна на каждую выдачу.
 */
const store = globalThis as typeof globalThis & { __greenAccounts?: Map<string, GreenAccount> }
const accounts: Map<string, GreenAccount> = (store.__greenAccounts ??= new Map())

const EMPTY: GreenAccount = { phone: '', username: '' }

export async function accountIdentity(channel: Channel): Promise<GreenAccount> {
  const green = greenCredentials(channel)
  if (!green) return EMPTY

  const cached = accounts.get(green.instanceId)
  if (cached !== undefined) return cached

  try {
    const settings = await call<{ phone?: string; username?: string }>(
      channel,
      'getAccountSettings',
    )
    const account: GreenAccount = {
      phone: (settings.phone ?? '').replace(/\D/g, ''),
      username: (settings.username ?? '').replace(/^@/, ''),
    }
    accounts.set(green.instanceId, account)
    return account
  } catch {
    return EMPTY
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
