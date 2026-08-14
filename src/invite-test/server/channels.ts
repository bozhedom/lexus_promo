import { inviteTestEnv, isMaxBotReady, isTelegramAutoReady, isTelegramBotReady } from '../config/env'
import type { Channel, ChannelInfo } from '../model/types'
import { openingText } from '../config/certificates'
import { maxBotUsername, telegramBotUsername } from './botIdentity'
import { accountIdentity, isGreenReady, type GreenAccount } from './green'
import { getBusinessId } from './store'

const MAX_PHONE = /^\+?\d+$/
const MAX_PROFILE_URL = /^https:\/\/(?:www\.)?max\.ru\/[^\s]+$/i

/**
 * У MAX нет аналога wa.me для телефонного номера. Если из настроек пришла
 * настоящая ссылка профиля или публичный ник, открываем этот профиль. Номер
 * телефона открыть напрямую нельзя, поэтому используем официальный share
 * deeplink: MAX подставит текст с кодом и попросит выбрать чат менеджера.
 */
export function maxConversationLink(manager: string, opening: string): string {
  const reference = manager.trim()
  if (MAX_PROFILE_URL.test(reference)) return reference

  const username = reference.replace(/^@/, '')
  if (username && !MAX_PHONE.test(username)) {
    return `https://max.ru/${encodeURIComponent(username)}`
  }

  return `https://max.ru/:share?text=${opening}`
}

/**
 * Куда ведёт кнопка канала и придут ли пригласительные сами.
 *
 * У каждого канала два пути. Основной — инстанс GREEN-API: он привязан к
 * личному аккаунту менеджера, гость пишет человеку и от него же получает
 * пригласительные. Запасной работает через бота (Telegram и MAX) — он нужен,
 * пока инстанс не заведён.
 *
 * Ссылка на диалог собирается по аккаунту самого инстанса, а не по переменной:
 * писать гость должен тому, кто слушает вебхук. Переменные с username остаются
 * для запасного пути и для каналов без инстанса.
 */
export async function resolveChannels(code: string): Promise<Record<Channel, ChannelInfo>> {
  const { telegram, max, whatsapp } = inviteTestEnv
  const opening = encodeURIComponent(openingText(code))
  const start = encodeURIComponent(code)

  // Ответ от имени менеджера через бизнес-бота возможен только с подключением.
  const businessDelivery =
    isTelegramAutoReady() && Boolean(telegram.manager) && Boolean(getBusinessId())

  const [waAccount, tgAccount, maxAccount, telegramBot, maxBot] = await Promise.all([
    accountIdentity('whatsapp'),
    accountIdentity('telegram'),
    accountIdentity('max'),
    isTelegramBotReady() && !isGreenReady('telegram') && !businessDelivery
      ? telegramBotUsername()
      : Promise.resolve(''),
    isMaxBotReady() && !isGreenReady('max') ? maxBotUsername() : Promise.resolve(''),
  ])

  const info = (chatLink: string | null, autoDelivery: boolean): ChannelInfo => ({
    enabled: Boolean(chatLink),
    chatLink,
    autoDelivery: Boolean(chatLink) && autoDelivery,
  })

  /**
   * Диалог в Telegram: по username подставляется и готовый текст с кодом, по
   * номеру — только сам чат, текст гость наберёт сам.
   */
  const telegramChat = (account: GreenAccount, fallbackUsername: string): string | null => {
    const username = account.username || fallbackUsername
    if (username) return `https://t.me/${username}?text=${opening}`
    return account.phone ? `https://t.me/+${account.phone}` : null
  }

  const waPhone = waAccount.phone || whatsapp.phone
  const maxManager = maxAccount.username || max.managerUsername

  return {
    whatsapp: info(
      waPhone ? `https://wa.me/${waPhone}?text=${opening}` : null,
      isGreenReady('whatsapp'),
    ),
    telegram: isGreenReady('telegram')
      ? info(telegramChat(tgAccount, ''), true)
      : businessDelivery
        ? info(telegramChat(tgAccount, telegram.manager), true)
        : telegramBot
          ? info(`https://t.me/${telegramBot}?start=${start}`, true)
          : info(telegramChat(tgAccount, telegram.manager), false),
    max: isGreenReady('max')
      ? info(maxConversationLink(maxManager, opening), true)
      : maxBot
        ? info(`https://max.ru/${maxBot}?start=${start}`, true)
        : info(
            max.managerUsername ? maxConversationLink(max.managerUsername, opening) : null,
            false,
          ),
  }
}
