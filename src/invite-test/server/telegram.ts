import { inviteTestEnv } from '../config/env'
import type { Certificate } from '../model/types'
import { readCertificateFiles } from './assets'

const api = (method: string): string =>
  `${inviteTestEnv.telegram.apiUrl}/bot${inviteTestEnv.telegram.botToken}/${method}`

async function call(method: string, body: FormData | Record<string, unknown>) {
  const init: RequestInit =
    body instanceof FormData
      ? { method: 'POST', body }
      : {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }

  const res = await fetch(api(method), init)
  const data = (await res.json()) as { ok: boolean; description?: string; result?: unknown }
  if (!data.ok) throw new Error(data.description || `Telegram API: ${method} не выполнен`)
  return data.result
}

/**
 * Оба сертификата одним альбомом. С `business_connection_id` они уходят от
 * имени менеджера — бота в переписке не видно; без него отвечает сам бот в
 * своём диалоге, куда клиент пришёл по диплинку.
 */
export async function sendCertificates(
  chatId: number | string,
  certificates: Certificate[],
  deliveryText: string,
  businessConnectionId?: string,
) {
  const files = await readCertificateFiles(certificates)
  const form = new FormData()
  if (businessConnectionId) form.set('business_connection_id', businessConnectionId)
  form.set('chat_id', String(chatId))
  form.set(
    'media',
    JSON.stringify(
      files.map((file, i) => ({
        type: 'photo',
        media: `attach://file${i}`,
        ...(i === 0 ? { caption: deliveryText } : {}),
      })),
    ),
  )
  files.forEach((file, i) => form.set(`file${i}`, file.blob, file.name))

  await call('sendMediaGroup', form)
}

export async function sendText(
  chatId: number | string,
  text: string,
  businessConnectionId?: string,
) {
  await call('sendMessage', {
    ...(businessConnectionId ? { business_connection_id: businessConnectionId } : {}),
    chat_id: chatId,
    text,
  })
}

/**
 * Приписка после сертификатов в диалоге с ботом: дальше гость общается с живым
 * менеджером, поэтому даём кнопку прямо в его чат.
 */
export async function sendManagerLink(chatId: number | string) {
  const manager = inviteTestEnv.telegram.manager
  if (!manager) return
  await call('sendMessage', {
    chat_id: chatId,
    text: 'Записаться и задать вопросы можно менеджеру — он на связи без выходных.',
    reply_markup: {
      inline_keyboard: [[{ text: 'Написать менеджеру', url: `https://t.me/${manager}` }]],
    },
  })
}

export async function setWebhook(url: string) {
  return call('setWebhook', {
    url,
    secret_token: inviteTestEnv.telegram.webhookSecret || undefined,
    // `message` — диалог с самим ботом: диплинк `?start=КОД` приходит сюда.
    allowed_updates: ['business_connection', 'business_message', 'message'],
    drop_pending_updates: true,
  })
}

export async function deleteWebhook() {
  return call('deleteWebhook', { drop_pending_updates: true })
}

export async function getMe() {
  return call('getMe', {})
}
