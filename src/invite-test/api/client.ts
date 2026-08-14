import type {
  Channel,
  DeliverResponse,
  PersonalInviteDetails,
  SessionResponse,
  StatusResponse,
} from '../model/types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok || !data) throw new Error(data?.error || 'Сервис недоступен')
  return data
}

/**
 * `owner` — заявка гостя: по ней сервер находит уже выписанные пригласительные,
 * сохраняет их картинки в админку и отдаёт ссылки именно на них. Вернувшийся
 * гость заявкой не владеет и передаёт только код — по нему сервер достаёт
 * номера выдачи, которые печатаются на кадре.
 */
export const createSession = (
  details: PersonalInviteDetails,
  owner?: { applicationId?: string | null; sessionId?: string | null; certificateCode?: string | null },
): Promise<SessionResponse> =>
  request('/api/invite-test/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...details, ...owner }),
  })

export const fetchStatus = (code: string): Promise<StatusResponse> =>
  request(`/api/invite-test/status?code=${encodeURIComponent(code)}`)

/**
 * Просит менеджера отправить пригласительные гостю первым — на номер из его
 * заявки. Ради MAX: подставить текст в диалог с человеком он не умеет, и без
 * этого гостю пришлось бы вставлять сообщение из буфера обмена.
 */
export const deliverToChat = (code: string, channel: Channel): Promise<DeliverResponse> =>
  request('/api/invite-test/deliver', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code, channel }),
  })
