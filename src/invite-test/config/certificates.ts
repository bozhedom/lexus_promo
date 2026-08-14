import type { Certificate, PersonalInviteDetails } from '../model/types'

export const DEFAULT_CERTIFICATES: Certificate[] = [
  {
    id: 'diagnostics',
    image: '/invite-test/cert-diagnostics.png',
    alt: 'Сертификат на комплексную диагностику',
  },
  {
    id: 'gift',
    image: '/invite-test/cert-diagnostics.png',
    alt: 'Сертификат в честь знакомства',
  },
]

export const personalCertificates = (code: string): Certificate[] => [
  {
    id: 'diagnostics',
    image: `/api/invite-test/certificate/${encodeURIComponent(code)}/diagnostics.png`,
    alt: 'Персональный сертификат на комплексную диагностику',
  },
  {
    id: 'gift',
    image: `/api/invite-test/certificate/${encodeURIComponent(code)}/gift.png`,
    alt: 'Персональный подарочный сертификат',
  },
]

/**
 * Тексты сообщений редактируются в админке («Тексты сообщений»), а здесь лежат
 * их значения по умолчанию. Пустое поле в админке означает «оставить текст
 * отсюда», поэтому очищенный раздел возвращает исходные формулировки.
 *
 * Подстановки пишутся в фигурных скобках: неизвестное имя остаётся в тексте
 * как есть — менеджеру видно опечатку, а сообщение всё равно уходит.
 */
export const DEFAULT_OPENING_TEMPLATE =
  'Здравствуйте! Даю согласие на отправку мне двух пригласительных. Код: {code}'

export const DEFAULT_BOOKING_TEMPLATE = [
  'Здравствуйте! Хочу записаться на сервис.',
  'Автомобиль: {car}, номер {plate}.',
  'Нужны работы: {services}.',
].join('\n')

export const DEFAULT_DELIVERY_TEMPLATE = [
  '{name}, добрый день!',
  '',
  'Отправляю ваши пригласительные: сертификат на комплексную диагностику',
  'и подарок {amount} ₽ в честь знакомства.',
  '',
  'Автомобиль: {car}, номер {plate}.',
  '',
  'Подскажите, когда вам удобно подъехать — в будни или в выходной?',
  'Мы на Снеговой 1 стр. 7.',
].join('\n')

/**
 * Подстановка значений. Строки, где все подстановки оказались пустыми, из
 * текста выпадают целиком: без модели и номера в сообщении не должно остаться
 * висящей строки «Автомобиль: , номер .».
 */
export function fillTemplate(template: string, values: Record<string, string>): string {
  const lines = template.split('\n').flatMap((line) => {
    const used = [...line.matchAll(/\{(\w+)\}/g)].map(([, key]) => values[key] ?? '')
    if (used.length > 0 && used.every((value) => !value)) return []
    return [line.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all)]
  })
  // Пустые строки на стыке выпавших блоков схлопываются, чтобы в сообщении не
  // оставалось двойных отбивок.
  return lines
    .filter((line, index) => line.trim() || lines[index - 1]?.trim())
    .join('\n')
    .trim()
}

const template = (custom: string | null | undefined, fallback: string): string =>
  custom?.trim() ? custom : fallback

/** Подставляется клиенту в поле ввода: по коду находим, кому что отправлять. */
export const openingText = (code: string, custom?: string | null): string =>
  fillTemplate(template(custom, DEFAULT_OPENING_TEMPLATE), { code })

/**
 * Запись на сервис: пригласительные тут не выдаются, поэтому кода в тексте нет
 * — менеджер получает автомобиль гостя, отмеченные работы и договаривается о
 * времени сам.
 *
 * Формулировку менеджер правит в админке, и в старых текстах подстановки
 * `{services}` может не быть. Тогда отмеченные работы дописываем отдельной
 * строкой: молча потерять их выбор хуже, чем добавить строку к тексту.
 */
export const bookingText = (
  car: string,
  plate: string,
  services: string[] = [],
  custom?: string | null,
): string => {
  const chosen = services.filter((item) => item.trim()).join(', ')
  const source = template(custom, DEFAULT_BOOKING_TEMPLATE)
  const text = fillTemplate(source, { car, plate, services: chosen })
  if (!chosen || source.includes('{services}')) return text
  return `${text}\nНужны работы: ${chosen}.`
}

/**
 * Код приходит двумя путями: в тексте, который клиент отправляет менеджеру, и
 * параметром диплинка — Telegram и MAX присылают его как `/start КОД`.
 *
 * Формулировку сообщения менеджер правит в админке, поэтому слово «Код:» перед
 * кодом может и пропасть. На этот случай код узнаём и по самому себе: десять
 * знаков из алфавита выдачи, среди которых есть цифра, — на случайное слово в
 * переписке это не похоже.
 */
export const CODE_ALPHABET = 'ACEFHJKLMNPRTUVWXY34679'
export const CODE_LENGTH = 10

const LABELLED_CODE = new RegExp(
  `(?:Код:\\s*|^/start(?:@\\S+)?\\s+)([${CODE_ALPHABET}]{${CODE_LENGTH}})(?![A-Z0-9])`,
  'i',
)
const BARE_CODE = new RegExp(
  `(?<![A-Z0-9])(?=[${CODE_ALPHABET}]*\\d)([${CODE_ALPHABET}]{${CODE_LENGTH}})(?![A-Z0-9])`,
)

export const extractCode = (text: string): string | null => {
  const upper = text.toUpperCase()
  const found = upper.match(LABELLED_CODE)?.[1] ?? upper.match(BARE_CODE)?.[1]
  return found ?? null
}

/** Ответ менеджера: сертификаты и сразу вопрос, чтобы завязать разговор. */
export const replyText = (
  fullName: string,
  details?: PersonalInviteDetails | null,
  custom?: string | null,
): string =>
  fillTemplate(template(custom, DEFAULT_DELIVERY_TEMPLATE), {
    name: fullName,
    car: details ? [details.brand, details.model, details.year].filter(Boolean).join(' ') : '',
    plate: details?.plate ?? '',
    amount: new Intl.NumberFormat('ru-RU').format(details?.amount ?? 1500),
  })

export interface InviteContentFields {
  certificates?: Certificate[] | null
  /** Готовый текст: подстановки в нём уже сделаны. */
  deliveryText?: string | null
  /** Формулировка из админки: подстановки в ней делает `replyText`. */
  deliveryTemplate?: string | null
}

/**
 * Единая точка подключения будущих полей заявки/CMS. Пока поля отсутствуют,
 * возвращает текущие сертификаты и текст. В route сюда следует передать только
 * данные, прочитанные сервером из доверенного источника, а не из тела клиента.
 */
export function resolveInviteContent(
  fullName: string,
  fields?: InviteContentFields | null,
): { certificates: Certificate[]; deliveryText: string } {
  const certificates = fields?.certificates?.filter(
    (item) => Boolean(item?.id?.trim()) && Boolean(item?.image?.trim()) && Boolean(item?.alt?.trim()),
  )

  return {
    certificates: certificates?.length ? certificates : DEFAULT_CERTIFICATES,
    deliveryText: fields?.deliveryText?.trim() || replyText(fullName),
  }
}
