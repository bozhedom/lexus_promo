import type { FunnelData, Utm } from './types'

const SESSION_KEY = 'promo_session_id'
const FUNNEL_KEY = 'promo_funnel'
const UTM_KEY = 'promo_utm'

const hasWindow = () => typeof window !== 'undefined'

// Постоянный id посетителя для склейки событий аналитики (живёт в localStorage)
export function getSessionId(): string {
  if (!hasWindow()) return ''
  let id = ''
  try {
    id = window.localStorage.getItem(SESSION_KEY) ?? ''
  } catch {
    // приватный режим и т.п.
  }
  if (!id) {
    id =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`
    try {
      window.localStorage.setItem(SESSION_KEY, id)
    } catch {
      // если хранилище недоступно: id живёт только в памяти этого вызова
    }
  }
  return id
}

// Данные воронки переживают перезагрузку страницы (sessionStorage)
export function loadFunnel(): FunnelData {
  if (!hasWindow()) return {}
  try {
    const raw = window.sessionStorage.getItem(FUNNEL_KEY)
    return raw ? (JSON.parse(raw) as FunnelData) : {}
  } catch {
    return {}
  }
}

export function saveFunnel(data: FunnelData): void {
  if (!hasWindow()) return
  try {
    window.sessionStorage.setItem(FUNNEL_KEY, JSON.stringify(data))
  } catch {
    // переполнение/приватный режим: игнорируем
  }
}

export function clearFunnel(): void {
  if (!hasWindow()) return
  try {
    window.sessionStorage.removeItem(FUNNEL_KEY)
  } catch {
    // no-op
  }
}

// UTM-метки читаем один раз при заходе и запоминаем на всю воронку
export function captureUtm(): Utm {
  if (!hasWindow()) return {}
  let stored: Utm = {}
  try {
    const raw = window.sessionStorage.getItem(UTM_KEY)
    if (raw) stored = JSON.parse(raw) as Utm
  } catch {
    // no-op
  }

  const params = new URLSearchParams(window.location.search)
  const fromUrl: Utm = {
    utmSource: params.get('utm_source') ?? undefined,
    utmMedium: params.get('utm_medium') ?? undefined,
    utmCampaign: params.get('utm_campaign') ?? undefined,
  }
  const hasUrlUtm = fromUrl.utmSource || fromUrl.utmMedium || fromUrl.utmCampaign

  const result = hasUrlUtm ? fromUrl : stored
  if (hasUrlUtm) {
    try {
      window.sessionStorage.setItem(UTM_KEY, JSON.stringify(result))
    } catch {
      // no-op
    }
  }
  return result
}
