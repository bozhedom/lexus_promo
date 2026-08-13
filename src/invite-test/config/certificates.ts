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

/** Подставляется клиенту в поле ввода: по коду находим, кому что отправлять. */
export const openingText = (code: string): string =>
  `Здравствуйте! Даю согласие на отправку мне двух пригласительных. Код: ${code}`

/**
 * Код приходит двумя путями: в тексте, который клиент отправляет менеджеру, и
 * параметром диплинка — Telegram и MAX присылают его как `/start КОД`.
 */
const CODE_PATTERN = /(?:Код:\s*|^\/start(?:@\S+)?\s+)([A-Z0-9]{10})(?![A-Z0-9])/i

export const extractCode = (text: string): string | null =>
  text.match(CODE_PATTERN)?.[1]?.toUpperCase() ?? null

/** Ответ менеджера: сертификаты и сразу вопрос, чтобы завязать разговор. */
export const replyText = (fullName: string, details?: PersonalInviteDetails | null): string => {
  const car = details
    ? [details.brand, details.model, details.year].filter(Boolean).join(' ')
    : ''
  return [
    `${fullName}, добрый день!`,
    '',
    'Отправляю ваши пригласительные: сертификат на комплексную диагностику',
    `и подарок ${new Intl.NumberFormat('ru-RU').format(details?.amount ?? 1500)} ₽ в честь знакомства.`,
    ...(car ? ['', `Автомобиль: ${car}${details?.plate ? `, номер ${details.plate}` : ''}.`] : []),
    '',
    'Подскажите, когда вам удобно подъехать — в будни или в выходной?',
    'Мы на Снеговой 1 стр. 7.',
  ].join('\n')
}

export interface InviteContentFields {
  certificates?: Certificate[] | null
  deliveryText?: string | null
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
