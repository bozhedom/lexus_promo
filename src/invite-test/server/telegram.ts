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
 * Оба сертификата одним альбомом. business_connection_id отправляет их от
 * имени менеджера: в переписке бота не видно.
 */
export async function sendCertificates(
  chatId: number | string,
  certificates: Certificate[],
  deliveryText: string,
  businessConnectionId: string,
) {
  const files = await readCertificateFiles(certificates)
  const form = new FormData()
  form.set('business_connection_id', businessConnectionId)
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
  businessConnectionId: string,
) {
  await call('sendMessage', {
    business_connection_id: businessConnectionId,
    chat_id: chatId,
    text,
  })
}

export async function setWebhook(url: string) {
  return call('setWebhook', {
    url,
    secret_token: inviteTestEnv.telegram.webhookSecret || undefined,
    allowed_updates: ['business_connection', 'business_message'],
    drop_pending_updates: true,
  })
}

export async function deleteWebhook() {
  return call('deleteWebhook', { drop_pending_updates: true })
}

export async function getMe() {
  return call('getMe', {})
}
