import { EVENT_NAMES, type EventName } from '@/collections/Events'
import { validateSessionId } from '@/lib/validation'

export type IncomingEvent = {
  name: EventName
  applicationId?: string
  payload?: Record<string, unknown>
}

export type EventsBatch = {
  sessionId: string
  events: IncomingEvent[]
}

const MAX_BATCH = 20
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const EVENT_NAME_SET = new Set<string>(EVENT_NAMES)

/**
 * Разбирает и валидирует батч событий. Дедуплицирует одинаковые события
 * внутри батча (двойные клики, ретраи sendBeacon).
 */
export function parseEventsBatch(raw: unknown): EventsBatch | null {
  if (typeof raw !== 'object' || raw === null) return null
  const body = raw as Record<string, unknown>

  const sessionId = validateSessionId(body.sessionId)
  if (!sessionId) return null
  if (!Array.isArray(body.events) || body.events.length === 0) return null

  const seen = new Set<string>()
  const events: IncomingEvent[] = []

  for (const item of body.events.slice(0, MAX_BATCH)) {
    if (typeof item !== 'object' || item === null) continue
    const e = item as Record<string, unknown>
    if (typeof e.name !== 'string' || !EVENT_NAME_SET.has(e.name)) continue

    const applicationId =
      typeof e.applicationId === 'string' && UUID_RE.test(e.applicationId)
        ? e.applicationId
        : undefined

    let payload: Record<string, unknown> | undefined
    if (typeof e.payload === 'object' && e.payload !== null && !Array.isArray(e.payload)) {
      const json = JSON.stringify(e.payload)
      if (json.length <= 2000) payload = e.payload as Record<string, unknown>
    }

    const key = `${e.name}|${applicationId ?? ''}|${payload ? JSON.stringify(payload) : ''}`
    if (seen.has(key)) continue
    seen.add(key)

    events.push({ name: e.name as EventName, applicationId, payload })
  }

  if (events.length === 0) return null
  return { sessionId, events }
}
