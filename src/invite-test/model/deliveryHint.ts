import type { Channel, DeliveryStatus, SessionResponse } from './types'

interface HintState {
  session: SessionResponse | null
  status: DeliveryStatus
  error: string | null
  opened: Channel | null
  copied: boolean | null
}

/**
 * Строка под кнопками мессенджеров. Одна на оба экрана выдачи — и в модалке
 * после ввода имени, и у вернувшегося гостя, — чтобы подсказки не разошлись.
 *
 * Главный случай здесь — MAX: открыть чужой диалог с готовым текстом он не
 * умеет, поэтому текст с кодом уезжает в буфер обмена, и гостю нужно сказать,
 * что его осталось вставить. Без этого сообщения он просто не знает, что
 * отправить, и пригласительные не приходят.
 */
export function deliveryHint({ session, status, error, opened, copied }: HintState): string | null {
  if (status === 'sent') return 'Пригласительные отправлены в чат'
  if (status === 'failed') return error ?? 'Менеджер отправит приглашения вручную'

  const channel = opened ? session?.channels[opened] : null
  if (channel && !channel.prefilled) {
    return copied
      ? `Текст с кодом скопирован — вставьте его в чат и отправьте. Код: ${session!.code}`
      : `Отправьте менеджеру сообщение с кодом: ${session!.code}`
  }

  if (status === 'waiting') return 'Отправьте сообщение в чате — приглашения придут в ответ'
  if (opened === 'max' && session && !session.channels.max.autoDelivery) {
    return `Для автоматической отправки настройте бота MAX. Код: ${session.code}`
  }
  if (opened === 'whatsapp' && session && !session.channels.whatsapp.autoDelivery) {
    return `Отправьте сообщение менеджеру в WhatsApp. Код: ${session.code}`
  }
  return null
}
