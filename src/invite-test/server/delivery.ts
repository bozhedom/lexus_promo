import { claimSession, getBusinessId, setStatus } from './store'
import * as green from './green'
import * as max from './max'
import * as telegram from './telegram'

export type Target =
  /** Личный аккаунт менеджера через инстанс GREEN-API — так работают все три. */
  | { channel: 'whatsapp' | 'telegram' | 'max'; via: 'green'; chatId: string }
  /** Запасной путь Telegram: `business` — диалог с менеджером, иначе диалог бота. */
  | { channel: 'telegram'; via: 'bot'; chatId: number | string; business: boolean }
  /** Запасной путь MAX: официальный бот организации. */
  | { channel: 'max'; via: 'bot'; userId: number | string }

/**
 * Отправляет сертификаты в диалог с менеджером и запоминает результат, чтобы
 * страница показала «Отправлено».
 */
export async function deliver(code: string, target: Target): Promise<void> {
  const session = claimSession(code)
  // Повторный или уже обрабатываемый код тихо игнорируем.
  if (!session) return

  try {
    if (target.via === 'green') {
      await green.sendCertificates(
        target.channel,
        target.chatId,
        session.certificates,
        session.deliveryText,
      )
    } else if (target.channel === 'telegram') {
      const businessId = target.business ? getBusinessId() : ''
      if (target.business && !businessId) {
        throw new Error('Бот не подключён к аккаунту менеджера')
      }
      await telegram.sendCertificates(
        target.chatId,
        session.certificates,
        session.deliveryText,
        businessId || undefined,
      )
      // В своём диалоге бот заканчивает разговор ссылкой на менеджера: в
      // бизнес-диалоге менеджер и так на другом конце.
      if (!businessId) await telegram.sendManagerLink(target.chatId)
    } else {
      await max.sendCertificates(target.userId, session.certificates, session.deliveryText)
    }
    setStatus(code, 'sent')
  } catch (err) {
    setStatus(code, 'failed', err instanceof Error ? err.message : 'Ошибка отправки')
    throw err
  }
}
