import type { EventName } from './event-names'

// Клиентский трекер событий. Копит события в очередь и шлёт батчами на
// /api/events через sendBeacon (устойчиво к закрытию вкладки). Параллельно
// дублирует их как цели в Яндекс.Метрику и GA4.

type Payload = Record<string, unknown>

interface Queued {
  name: EventName
  applicationId?: string
  payload?: Payload
}

const ENDPOINT = '/api/events'
const BATCH_LIMIT = 20
const FLUSH_DELAY = 1500

let sessionId = ''
const queue: Queued[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let bound = false

export function initAnalytics(sid: string): void {
  sessionId = sid
  bindFlushOnHide()
}

export function track(name: EventName, applicationId?: string, payload?: Payload): void {
  if (typeof window === 'undefined') return
  queue.push({ name, applicationId, payload })
  forwardToVendors(name, payload)
  if (queue.length >= 10) flush(false)
  else scheduleFlush()
}

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flush(false)
  }, FLUSH_DELAY)
}

function flush(useBeacon: boolean): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (!sessionId || queue.length === 0) return

  const events = queue.splice(0, BATCH_LIMIT)
  const body = JSON.stringify({ sessionId, events })

  try {
    if (useBeacon && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      if (!navigator.sendBeacon(ENDPOINT, blob)) sendFetch(body)
    } else {
      sendFetch(body)
    }
  } catch {
    // не роняем UI из-за аналитики
  }

  // если накопилось больше одного батча: досылаем
  if (queue.length > 0) scheduleFlush()
}

function sendFetch(body: string): void {
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

function bindFlushOnHide(): void {
  if (bound || typeof document === 'undefined') return
  bound = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true)
  })
  window.addEventListener('pagehide', () => flush(true))
}

function forwardToVendors(name: EventName, payload?: Payload): void {
  const w = window as typeof window & {
    ym?: (id: number, action: string, goal: string, params?: Payload) => void
    gtag?: (command: string, action: string, params?: Payload) => void
  }
  const ymId = process.env.NEXT_PUBLIC_YM_ID
  if (ymId && typeof w.ym === 'function') {
    w.ym(Number(ymId), 'reachGoal', name, payload)
  }
  if (typeof w.gtag === 'function') {
    w.gtag('event', name, payload ?? {})
  }
}
