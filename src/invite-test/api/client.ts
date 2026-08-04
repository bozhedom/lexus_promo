import type { PersonalInviteDetails, SessionResponse, StatusResponse } from '../model/types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok || !data) throw new Error(data?.error || 'Сервис недоступен')
  return data
}

export const createSession = (details: PersonalInviteDetails): Promise<SessionResponse> =>
  request('/api/invite-test/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(details),
  })

export const fetchStatus = (code: string): Promise<StatusResponse> =>
  request(`/api/invite-test/status?code=${encodeURIComponent(code)}`)
