import type {
  Channel,
  OpenedResponse,
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
 * Отмечает, что гость ушёл в диалог с менеджером. Ради MAX: текст с кодом туда
 * не подставляется, гость отправляет что угодно, и по этой отметке вебхук
 * понимает, чьи пригласительные слать в ответ.
 */
export const markChatOpened = (code: string, channel: Channel): Promise<OpenedResponse> =>
  request('/api/invite-test/opened', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code, channel }),
  })
