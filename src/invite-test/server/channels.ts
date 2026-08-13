import { inviteTestEnv, isMaxBotReady, isTelegramAutoReady, isTelegramBotReady } from '../config/env'
import type { Channel, ChannelInfo } from '../model/types'
import { openingText } from '../config/certificates'
import { maxBotUsername, telegramBotUsername } from './botIdentity'
import { accountPhone, isGreenReady } from './green'
import { getBusinessId } from './store'

/**
 * Куда ведёт кнопка канала и придут ли пригласительные сами.
 *
 * У каждого канала два пути. Основной — инстанс GREEN-API: он привязан к
 * личному аккаунту менеджера, гость пишет человеку и от него же получает
 * пригласительные. Запасной работает через бота (Telegram и MAX) — он нужен,
 * пока инстанс не заведён.
 */
export async function resolveChannels(code: string): Promise<Record<Channel, ChannelInfo>> {
  const { telegram, max, whatsapp } = inviteTestEnv
  const opening = encodeURIComponent(openingText(code))
  const start = encodeURIComponent(code)

  // Ответ от имени менеджера через бизнес-бота возможен только с подключением.
  const businessDelivery =
    isTelegramAutoReady() && Boolean(telegram.manager) && Boolean(getBusinessId())

  const [waPhone, tgPhone, telegramBot, maxBot] = await Promise.all([
    whatsapp.phone ? Promise.resolve(whatsapp.phone) : accountPhone('whatsapp'),
    isGreenReady('telegram') ? accountPhone('telegram') : Promise.resolve(''),
    isTelegramBotReady() && !isGreenReady('telegram') && !businessDelivery
      ? telegramBotUsername()
      : Promise.resolve(''),
    isMaxBotReady() && !isGreenReady('max') ? maxBotUsername() : Promise.resolve(''),
  ])

  // Ссылка на диалог с менеджером в Telegram: по username, а если его нет —
  // по номеру аккаунта, к которому привязан инстанс.
  const managerChat = telegram.manager
    ? `https://t.me/${telegram.manager}?text=${opening}`
    : tgPhone
      ? `https://t.me/+${tgPhone}`
      : null

  const maxChat = max.managerUsername ? `https://max.ru/${max.managerUsername}` : null

  const info = (chatLink: string | null, autoDelivery: boolean): ChannelInfo => ({
    enabled: Boolean(chatLink),
    chatLink,
    autoDelivery: Boolean(chatLink) && autoDelivery,
  })

  return {
    whatsapp: info(
      waPhone ? `https://wa.me/${waPhone}?text=${opening}` : null,
      isGreenReady('whatsapp'),
    ),
    telegram: isGreenReady('telegram')
      ? info(managerChat, true)
      : businessDelivery
        ? info(managerChat, true)
        : telegramBot
          ? info(`https://t.me/${telegramBot}?start=${start}`, true)
          : info(managerChat, false),
    max: isGreenReady('max')
      ? info(maxChat, true)
      : maxBot
        ? info(`https://max.ru/${maxBot}?start=${start}`, true)
        : info(maxChat, false),
  }
}
