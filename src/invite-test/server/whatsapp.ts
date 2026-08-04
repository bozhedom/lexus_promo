import { inviteTestEnv } from '../config/env'
import type { Certificate } from '../model/types'
import { readCertificateFiles } from './assets'

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

/** Принимаем только входящий текст из личного WhatsApp-чата нашего инстанса. */
export function parseIncomingText(update: GreenWebhook | null) {
  if (update?.typeWebhook !== 'incomingMessageReceived') return null
  if (update.instanceData?.typeInstance && update.instanceData.typeInstance !== 'whatsapp') {
    return null
  }
  if (
    update.instanceData?.idInstance != null &&
    String(update.instanceData.idInstance) !== inviteTestEnv.whatsapp.instanceId
  ) {
    return null
  }

  const chatId = update.senderData?.chatId ?? ''
  if (!chatId.endsWith('@c.us')) return null

  const text =
    update.messageData?.typeMessage === 'textMessage'
      ? update.messageData.textMessageData?.textMessage
      : update.messageData?.typeMessage === 'extendedTextMessage'
        ? update.messageData.extendedTextMessageData?.text
        : null

  return text ? { chatId, text } : null
}

const endpoint = (method: string): string => {
  const { apiUrl, instanceId, apiToken } = inviteTestEnv.whatsapp
  return `${apiUrl.replace(/\/$/, '')}/waInstance${instanceId}/${method}/${apiToken}`
}

async function call<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(endpoint(method), {
    method: body ? 'POST' : 'GET',
    ...(body
      ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  })
  const data = (await res.json().catch(() => null)) as (T & { message?: string }) | null
  if (!res.ok || !data) throw new Error(data?.message || `GREEN-API: ${res.status}`)
  return data
}

/** GREEN-API отправляет по одному файлу на запрос. */
export async function sendCertificates(
  chatId: string,
  certificates: Certificate[],
  deliveryText: string,
) {
  const files = await readCertificateFiles(certificates)

  for (const [index, file] of files.entries()) {
    await call<{ idMessage: string }>('sendFileByUrl', {
      chatId,
      urlFile: file.url,
      fileName: file.name,
      ...(index === files.length - 1 ? { caption: deliveryText } : {}),
    })
  }
}

export const getState = () => call<{ stateInstance: string }>('getStateInstance')

export const configureWebhook = (url: string) =>
  call<{ saveSettings: boolean }>('setSettings', {
    webhookUrl: url,
    webhookUrlToken: inviteTestEnv.whatsapp.webhookToken || '',
    incomingWebhook: 'yes',
    outgoingWebhook: 'no',
    outgoingMessageWebhook: 'no',
    outgoingAPIMessageWebhook: 'no',
    stateWebhook: 'no',
    markIncomingMessagesReadedOnReply: 'yes',
  })

export const clearWebhook = () =>
  call<{ saveSettings: boolean }>('setSettings', {
    webhookUrl: '',
    webhookUrlToken: '',
    incomingWebhook: 'no',
  })
