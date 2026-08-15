import type { FunnelData, Utm } from './types'

const SESSION_KEY = 'promo_session_id'
const FUNNEL_KEY = 'promo_funnel'
const UTM_KEY = 'promo_utm'

type StoreName = 'localStorage' | 'sessionStorage'

const hasWindow = () => typeof window !== 'undefined'

/**
 * Хранилище браузера может быть недоступно: приватный режим, переполненная
 * квота, запрет сторонних данных. Промо из-за этого падать не должно, поэтому
 * чтение отдаёт null, а запись молча ничего не делает.
 */
function read(store: StoreName, key: string): string | null {
  if (!hasWindow()) return null
  try {
    return window[store].getItem(key)
  } catch {
    return null
  }
}

function write(store: StoreName, key: string, value: string): void {
  if (!hasWindow()) return
  try {
    window[store].setItem(key, value)
  } catch {
    return
  }
}

function remove(store: StoreName, key: string): void {
  if (!hasWindow()) return
  try {
    window[store].removeItem(key)
  } catch {
    return
  }
}

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// Постоянный id посетителя для склейки событий аналитики (живёт в localStorage)
export function getSessionId(): string {
  if (!hasWindow()) return ''
  const stored = read('localStorage', SESSION_KEY)
  if (stored) return stored

  const id =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  // Если хранилище недоступно, id живёт только в памяти этого вызова.
  write('localStorage', SESSION_KEY, id)
  return id
}

// Данные воронки переживают перезагрузку страницы (sessionStorage)
export function loadFunnel(): FunnelData {
  return parse<FunnelData>(read('sessionStorage', FUNNEL_KEY), {})
}

export function saveFunnel(data: FunnelData): void {
  write('sessionStorage', FUNNEL_KEY, JSON.stringify(data))
}

export function clearFunnel(): void {
  remove('sessionStorage', FUNNEL_KEY)
}

// UTM-метки читаем один раз при заходе и запоминаем на всю воронку
export function captureUtm(): Utm {
  if (!hasWindow()) return {}
  const stored = parse<Utm>(read('sessionStorage', UTM_KEY), {})

  const params = new URLSearchParams(window.location.search)
  const fromUrl: Utm = {
    utmSource: params.get('utm_source') ?? undefined,
    utmMedium: params.get('utm_medium') ?? undefined,
    utmCampaign: params.get('utm_campaign') ?? undefined,
  }
  const hasUrlUtm = fromUrl.utmSource || fromUrl.utmMedium || fromUrl.utmCampaign
  if (!hasUrlUtm) return stored

  write('sessionStorage', UTM_KEY, JSON.stringify(fromUrl))
  return fromUrl
}
