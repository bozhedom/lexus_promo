import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Тексты сообщений из админки. Пустое поле означает «оставить текст по
 * умолчанию», поэтому наружу отдаём как есть — подстановкой занимаются
 * `openingText`, `replyText` и `bookingText`.
 *
 * Кэша нет намеренно: менеджер правит текст и сразу проверяет его на себе, а
 * запрос уходит только в момент выдачи кода — не на каждый рендер страницы.
 */
export interface MessageTemplates {
  delivery: string | null
  opening: string | null
  booking: string | null
}

const EMPTY: MessageTemplates = { delivery: null, opening: null, booking: null }

export async function loadMessageTemplates(): Promise<MessageTemplates> {
  try {
    const payload = await getPayload({ config })
    const doc = await payload.findGlobal({ slug: 'message-templates', depth: 0 })
    return {
      delivery: doc.delivery ?? null,
      opening: doc.opening ?? null,
      booking: doc.booking ?? null,
    }
  } catch {
    // База недоступна — выдача важнее правок в админке, уходим на тексты из кода.
    return EMPTY
  }
}
