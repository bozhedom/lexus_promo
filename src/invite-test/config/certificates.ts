import type { Certificate } from '../model/types'

export const DEFAULT_CERTIFICATES: Certificate[] = [
  {
    id: 'diagnostics',
    image: '/invite-test/cert-diagnostics.png',
    alt: 'Сертификат на комплексную диагностику',
  },
  {
    id: 'gift',
    image: '/invite-test/cert-gift.png',
    alt: 'Подарочный сертификат на 1500 рублей',
  },
]

/** Подставляется клиенту в поле ввода: по коду находим, кому что отправлять. */
export const openingText = (code: string): string =>
  `Здравствуйте! Даю согласие на отправку мне двух пригласительных. Код: ${code}`

const CODE_PATTERN = /Код:\s*([A-Z0-9]{10})(?![A-Z0-9])/i

export const extractCode = (text: string): string | null =>
  text.match(CODE_PATTERN)?.[1]?.toUpperCase() ?? null

/** Ответ менеджера: сертификаты и сразу вопрос, чтобы завязать разговор. */
export const replyText = (fullName: string): string =>
  [
    `${fullName}, добрый день!`,
    '',
    'Отправляю ваши пригласительные: сертификат на комплексную диагностику',
    'и подарок 1500 ₽ в честь знакомства.',
    '',
    'Подскажите, когда вам удобно подъехать — в будни или в выходной?',
    'Мы на Снеговой 1 стр. 7.',
  ].join('\n')

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
