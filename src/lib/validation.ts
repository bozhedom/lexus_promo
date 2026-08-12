// Серверная валидация.

const CYRILLIC_PLATE_LETTERS = 'АВЕКМНОРСТУХ'

// Латинские двойники кириллических букв госномера
const LATIN_TO_CYRILLIC: Record<string, string> = {
  A: 'А',
  B: 'В',
  E: 'Е',
  K: 'К',
  M: 'М',
  H: 'Н',
  O: 'О',
  P: 'Р',
  C: 'С',
  T: 'Т',
  Y: 'У',
  X: 'Х',
}

/** Приводит госномер к каноническому виду: без пробелов, верхний регистр, кириллица */
export function normalizePlate(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[ABEKMHOPCTYX]/g, (ch) => LATIN_TO_CYRILLIC[ch] ?? ch)
}

const PLATE_RE = new RegExp(
  `^[${CYRILLIC_PLATE_LETTERS}]\\d{3}[${CYRILLIC_PLATE_LETTERS}]{2}\\d{2,3}$`,
)

/** Валидирует госномер РФ (легковой формат А000АА00[0]). Возвращает канонический номер или null */
export function validatePlate(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length < 7 || raw.length > 12) return null
  const plate = normalizePlate(raw)
  return PLATE_RE.test(plate) ? plate : null
}

/** Нормализует телефон к +7XXXXXXXXXX. Возвращает null если не похоже на телефон РФ */
export function validatePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const digits = raw.replace(/\D/g, '')
  let rest: string
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    rest = digits.slice(1)
  } else if (digits.length === 10) {
    rest = digits
  } else {
    return null
  }
  if (!/^9\d{9}$/.test(rest) && !/^[3-8]\d{9}$/.test(rest)) return null
  return `+7${rest}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (email.length > 254 || !EMAIL_RE.test(email)) return null
  return email
}

const NAME_WORD = /^[А-ЯЁA-Z][а-яёa-z]*(?:[-'][А-ЯЁA-Zа-яёa-z][а-яёa-z]*)*$/i

/**
 * Имя, отчество по желанию. Слова по 2 буквы, каждое только из букв, дефисов и
 * апострофов. Отсекает вставленный скрипт, цифры и набор из одной буквы вроде
 * «аааааа». Отчество необязательно: одного имени достаточно.
 */
export function validateFullName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 60) return null

  const words = name.split(' ')
  if (words.length > 4) return null
  for (const word of words) {
    if (word.length < 2 || word.length > 25) return null
    if (!NAME_WORD.test(word)) return null
    if (/(.)\1{3,}/i.test(word)) return null
  }
  // слова из одних согласных обычно означают, что человек стучал по клавишам
  if (!/[аеёиоуыэюяaeiouy]/i.test(name)) return null

  return name
}

export function validateCarYear(raw: unknown): number | null {
  const year = typeof raw === 'string' ? Number(raw) : raw
  if (typeof year !== 'number' || !Number.isInteger(year)) return null
  if (year < 1950 || year > new Date().getFullYear() + 1) return null
  return year
}

/**
 * Свободный текст (марка/модель). Разрешены буквы, цифры, пробел и несколько
 * знаков, которые встречаются в названиях моделей: дефис, точка, слэш, плюс,
 * скобки. Всё остальное, включая угловые скобки и управляющие символы,
 * отбрасывает строку целиком.
 */
export function validateShortText(raw: unknown, maxLen = 40): string | null {
  if (typeof raw !== 'string') return null
  const text = raw.trim().replace(/\s+/g, ' ')
  if (text.length < 1 || text.length > maxLen) return null
  if (!/^[А-Яа-яЁёA-Za-z0-9 .\-+/()]+$/.test(text)) return null
  if (!/[А-Яа-яЁёA-Za-z0-9]/.test(text)) return null
  return text
}

export function validateSessionId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  return /^[a-zA-Z0-9-]{8,64}$/.test(raw) ? raw : null
}
