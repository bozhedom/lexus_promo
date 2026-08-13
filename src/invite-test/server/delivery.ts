import { claimSession, getBusinessId, setStatus } from './store'
import * as max from './max'
import * as telegram from './telegram'
import * as whatsapp from './whatsapp'

export type Target =
  /** `business` — диалог клиента с менеджером, туда отвечаем от его имени. */
  | { channel: 'telegram'; chatId: number | string; business: boolean }
  | { channel: 'whatsapp'; phone: string }
  | { channel: 'max'; userId: number | string }

/**
 * Отправляет сертификаты в диалог с менеджером и запоминает результат, чтобы
 * страница показала «Отправлено».
 */
export async function deliver(code: string, target: Target): Promise<void> {
  const session = claimSession(code)
  // Повторный или уже обрабатываемый код тихо игнорируем.
  if (!session) return

  try {
    if (target.channel === 'telegram') {
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
    } else if (target.channel === 'whatsapp') {
      await whatsapp.sendCertificates(target.phone, session.certificates, session.deliveryText)
    } else {
      await max.sendCertificates(target.userId, session.certificates, session.deliveryText)
    }
    setStatus(code, 'sent')
  } catch (err) {
    setStatus(code, 'failed', err instanceof Error ? err.message : 'Ошибка отправки')
    throw err
  }
}
