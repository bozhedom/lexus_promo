import type { PersonalInviteDetails, SessionResponse, StatusResponse } from '../model/types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok || !data) throw new Error(data?.error || 'Сервис недоступен')
  return data
}

/**
 * `owner` — заявка гостя: по ней сервер находит уже выписанные пригласительные,
 * сохраняет их картинки в админку и отдаёт ссылки именно на них.
 */
export const createSession = (
  details: PersonalInviteDetails,
  owner?: { applicationId?: string | null; sessionId?: string | null },
): Promise<SessionResponse> =>
  request('/api/invite-test/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...details, ...owner }),
  })

export const fetchStatus = (code: string): Promise<StatusResponse> =>
  request(`/api/invite-test/status?code=${encodeURIComponent(code)}`)
