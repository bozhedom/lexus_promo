// Клиентская маска госномера. Правила те же, что на сервере
// (@/lib/validation), источник истины: сервер.

const ALLOWED_LETTERS = 'АВЕКМНОРСТУХ'

export const DEFAULT_PLATE_REGION = '125'

// латиница-двойник → кириллица
const LAT_TO_CYR: Record<string, string> = {
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

function toCyr(ch: string): string {
  const up = ch.toUpperCase()
  return LAT_TO_CYR[up] ?? up
}

// Основная часть номера: буква, 3 цифры, 2 буквы (макс 6 символов)
export function maskPlateMain(input: string): string {
  let out = ''
  for (const raw of input) {
    const ch = toCyr(raw)
    const pos = out.length
    if (pos === 0 || pos === 4 || pos === 5) {
      if (ALLOWED_LETTERS.includes(ch)) out += ch
    } else if (pos >= 1 && pos <= 3) {
      if (/\d/.test(ch)) out += ch
    }
    if (out.length >= 6) break
  }
  return out
}

// Регион: 2-3 цифры
export function maskRegion(input: string): string {
  return input.replace(/\D/g, '').slice(0, 3)
}

export function splitPlate(full: string): { main: string; region: string } {
  const value = full ?? ''
  // До ввода основной части значение состоит только из региона.
  if (/^\d{1,3}$/.test(value)) return { main: '', region: maskRegion(value) }
  return { main: maskPlateMain(value.slice(0, 6)), region: maskRegion(value.slice(6)) }
}

// Собранный номер готов к отправке (буква+3цифры+2буквы+2-3цифры)
export function isPlateComplete(main: string, region: string): boolean {
  return /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}$/.test(main) && /^\d{2,3}$/.test(region)
}

// Красивый вид для показа: «А 555 АА» + регион отдельно
export function formatPlate(canonical: string): { main: string; region: string } {
  const { main, region } = splitPlate(canonical)
  const pretty =
    main.length === 6 ? `${main[0]} ${main.slice(1, 4)} ${main.slice(4)}` : main
  return { main: pretty, region }
}
