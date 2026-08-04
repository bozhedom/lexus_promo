// Прокси к API Ortus. Ключ только на сервере, кэш 24ч, таймаут 5с,
// на любой сбой отдаём { found: false }.

export type CarInfo =
  /** Марка известна всегда; модель и год API отдаёт не для каждой машины. */
  | { found: true; brand: string; model: string | null; year: number | null }
  | { found: false }

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 5_000

const cache = new Map<string, { data: CarInfo; expires: number }>()

export async function lookupCar(plate: string): Promise<CarInfo> {
  const cached = cache.get(plate)
  if (cached && cached.expires > Date.now()) return cached.data

  const data = await fetchCarInfo(plate)
  // отрицательные ответы тоже кэшируем, чтобы не долбить внешний API
  cache.set(plate, { data, expires: Date.now() + CACHE_TTL_MS })
  return data
}

async function fetchCarInfo(plate: string): Promise<CarInfo> {
  const apiUrl = process.env.CAR_API_URL
  if (!apiUrl) return { found: false }

  try {
    const url = new URL(apiUrl)
    url.searchParams.set('license_plate', plate)
    const res = await fetch(url, {
      headers: process.env.CAR_API_KEY
        ? { Authorization: `Bearer ${process.env.CAR_API_KEY}` }
        : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) return { found: false }
    return parseCarInfo(await res.json())
  } catch {
    return { found: false }
  }
}

/**
 * Разбирает ответ Ortus: mark и model приходят справочниками, пустой объект
 * значит машины нет в базе. Модель бывает null при известной марке.
 */
export function parseCarInfo(json: unknown): CarInfo {
  if (!json || typeof json !== 'object') return { found: false }
  const raw = json as Record<string, unknown>

  const brand = refTitle(raw.mark)
  if (!brand) return { found: false }

  return {
    found: true,
    brand,
    model: refTitle(raw.model),
    year: typeof raw.year === 'number' && raw.year > 1900 ? raw.year : null,
  }
}

/** Достаёт человекочитаемое название из справочника или строки. */
function refTitle(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (!value || typeof value !== 'object') return null
  const ref = value as Record<string, unknown>
  for (const key of ['title', 'name', 'label']) {
    const v = ref[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}
