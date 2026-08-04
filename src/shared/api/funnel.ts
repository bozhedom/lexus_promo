import type { CarInfo, Utm } from '@/shared/lib/types'

export interface ApiError {
  status: number
  message: string
  field?: string
  fields?: Record<string, string>
}

function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'status' in e && 'message' in e
}

export { isApiError }

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw { status: 0, message: 'Нет связи с сервером' } as ApiError
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw {
      status: res.status,
      message: (json.error as string) ?? 'Что-то пошло не так',
      field: json.field as string | undefined,
      fields: json.fields as Record<string, string> | undefined,
    } as ApiError
  }
  return json as T
}

const jsonInit = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export interface CreateApplicationInput extends Utm {
  plateNumber: string
  sessionId: string
}

export function createApplication(
  input: CreateApplicationInput,
): Promise<{ id: string; plateNumber: string }> {
  return request('/api/applications', jsonInit(input))
}

export interface PatchApplicationInput {
  sessionId: string
  plateNumber?: string
  carBrand?: string
  carModel?: string
  carYear?: number | null
  carDataSource?: 'api' | 'manual'
  fullName?: string
  phone?: string
  consentGiven?: boolean
}

export function patchApplication(
  id: string,
  input: PatchApplicationInput,
): Promise<{ id: string; status: string }> {
  return request(`/api/applications/${id}`, { ...jsonInit(input), method: 'PATCH' })
}

export interface CompleteResult {
  certificate: { id: string; code: string; amount: number; expiresAt: string | null }
  application: {
    id: string
    status: string
    plateNumber: string
    carBrand: string | null
    carModel: string | null
    carYear: number | null
    fullName: string | null
  }
}

export function completeApplication(id: string, sessionId: string): Promise<CompleteResult> {
  return request(`/api/applications/${id}/complete`, jsonInit({ sessionId }))
}

export function lookupCar(plate: string): Promise<CarInfo> {
  return request(`/api/car-info?plate=${encodeURIComponent(plate)}`)
}
