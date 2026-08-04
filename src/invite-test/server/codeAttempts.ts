const WINDOW_MS = 10 * 60 * 1000
const MAX_INVALID_ATTEMPTS = 5
const MAX_CHATS = 10_000

const attempts = new Map<string, number[]>()

function recentAttempts(chatId: string, now: number): number[] {
  const recent = (attempts.get(chatId) ?? []).filter((time) => now - time < WINDOW_MS)
  if (recent.length) attempts.set(chatId, recent)
  else attempts.delete(chatId)
  return recent
}

/** Заблокирован ли чат после серии неверных кодов. */
export function isCodeAttemptBlocked(chatId: string, now = Date.now()): boolean {
  return recentAttempts(chatId, now).length >= MAX_INVALID_ATTEMPTS
}

/** Запоминаем только неверные коды: нормальный клиент лимит не расходует. */
export function recordInvalidCode(chatId: string, now = Date.now()): void {
  if (attempts.size >= MAX_CHATS && !attempts.has(chatId)) {
    for (const key of attempts.keys()) {
      recentAttempts(key, now)
      if (attempts.size < MAX_CHATS / 2) break
    }
    if (attempts.size >= MAX_CHATS) return
  }

  const recent = recentAttempts(chatId, now)
  recent.push(now)
  attempts.set(chatId, recent)
}
