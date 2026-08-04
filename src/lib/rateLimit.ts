// Простой in-memory rate limiter (скользящее окно).
// Достаточно для одного инстанса;

type Bucket = number[]

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 60_000
const MAX_KEYS = 10_000

export function rateLimit(key: string, limit: number): boolean {
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket) {
    if (buckets.size >= MAX_KEYS) {
      // защита от переполнения памяти: сбрасываем самые старые ключи
      for (const [k, b] of buckets) {
        if (b.length === 0 || now - b[b.length - 1]! > WINDOW_MS) buckets.delete(k)
        if (buckets.size < MAX_KEYS / 2) break
      }
    }
    bucket = []
    buckets.set(key, bucket)
  }
  while (bucket.length > 0 && now - bucket[0]! > WINDOW_MS) bucket.shift()
  if (bucket.length >= limit) return false
  bucket.push(now)
  return true
}
