import { inviteTestEnv } from '../config/env'
import type { Certificate } from '../model/types'

type MaxError = { code?: string; message?: string }

const api = (path: string): string =>
  `${inviteTestEnv.max.apiUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(api(path), {
    ...init,
    headers: {
      Authorization: inviteTestEnv.max.botToken,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  })
  const data = (await res.json().catch(() => null)) as (T & MaxError) | null
  if (!res.ok || !data) throw new Error(data?.message || `MAX API: ${res.status}`)
  return data
}

/**
 * MAX умеет забирать изображения по публичному HTTPS URL. Отправляем оба
 * сертификата одним сообщением, чтобы не упираться в лимит 2 сообщения/сек.
 */
export async function sendCertificates(
  userId: number | string,
  certificates: Certificate[],
  deliveryText: string,
) {
  const base = inviteTestEnv.siteUrl.replace(/\/$/, '')
  const manager = inviteTestEnv.max.managerUsername
  const attachments: Record<string, unknown>[] = certificates.map((certificate) => ({
    type: 'image',
    payload: {
      url: /^https?:\/\//i.test(certificate.image)
        ? certificate.image
        : `${base}/${certificate.image.replace(/^\//, '')}`,
    },
  }))

  if (manager) {
    attachments.push({
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            {
              type: 'link',
              text: 'Написать менеджеру',
              url: `https://max.ru/${manager}`,
            },
          ],
        ],
      },
    })
  }

  await call(`messages?user_id=${encodeURIComponent(String(userId))}`, {
    method: 'POST',
    body: JSON.stringify({
      text: deliveryText,
      attachments,
    }),
  })
}

export const getMe = () => call<Record<string, unknown>>('me')

export const subscribe = (url: string) =>
  call<{ success: boolean; message?: string }>('subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      url,
      update_types: ['bot_started'],
      secret: inviteTestEnv.max.webhookSecret || undefined,
    }),
  })

export const unsubscribe = (url: string) =>
  call<{ success: boolean; message?: string }>(
    `subscriptions?url=${encodeURIComponent(url)}`,
    { method: 'DELETE' },
  )
