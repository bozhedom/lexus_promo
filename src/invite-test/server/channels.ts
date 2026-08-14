import { inviteTestEnv, isMaxBotReady, isTelegramAutoReady, isTelegramBotReady } from '../config/env'
import type { Channel, ChannelInfo } from '../model/types'
import { openingText } from '../config/certificates'
import { maxBotUsername, telegramBotUsername } from './botIdentity'
import { accountIdentity, isGreenReady, type GreenAccount } from './green'
import { getBusinessId } from './store'

const MAX_PHONE = /^\+?\d+$/
const MAX_PROFILE_URL = /^https:\/\/(?:www\.)?max\.ru\/[^\s]+$/i

/**
 * Текст диалога подставляется тем же параметром, что в WhatsApp и Telegram:
 * `?text=`. Если в ссылке из настроек он уже стоит, второй раз не дописываем.
 * `opening` приходит сюда уже закодированным.
 */
const withOpening = (url: string, opening: string): string => {
  if (!opening || /[?&]text=/.test(url)) return url
  return `${url}${url.includes('?') ? '&' : '?'}text=${opening}`
}

/**
 * У MAX нет аналога wa.me для телефонного номера. Если из настроек пришла
 * настоящая ссылка профиля или публичный ник, открываем этот профиль и
 * подставляем текст параметром `?text=` — так гостю остаётся только нажать
 * «отправить», а с кодом в тексте пригласительные уходят автоматически. Номер
 * телефона открыть напрямую нельзя, поэтому для него остаётся официальный
 * share deeplink: MAX подставит текст и попросит выбрать чат менеджера.
 */
export function maxConversationLink(manager: string, opening: string): string {
  const reference = manager.trim()
  if (MAX_PROFILE_URL.test(reference)) return withOpening(reference, opening)

  const username = reference.replace(/^@/, '')
  if (username && !MAX_PHONE.test(username)) {
    return withOpening(`https://max.ru/${encodeURIComponent(username)}`, opening)
  }

  return `https://max.ru/:share?text=${opening}`
}

interface ChannelOptions {
  /** Текст, который мессенджер подставит гостю в поле ввода. */
  opening: string
  /**
   * Код выдачи для диплинка бота. Пусто — пригласительных за этим диалогом
   * нет (запись на сервис), и ждать автодоставки нечего.
   */
  code?: string
}

/**
 * Диалоги с менеджером под выданный код: пригласительные придут в ответ.
 * `template` — формулировка из админки, пусто — текст по умолчанию.
 */
export const resolveChannels = (
  code: string,
  template?: string | null,
): Promise<Record<Channel, ChannelInfo>> =>
  managerChannels({ opening: openingText(code, template), code })

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
 *
 * Без кода это просто диалог с менеджером: так на сервис записываются, и
 * пригласительных за таким разговором не стоит.
 */
export async function managerChannels({
  opening: openingRaw,
  code,
}: ChannelOptions): Promise<Record<Channel, ChannelInfo>> {
  const { telegram, max, whatsapp } = inviteTestEnv
  const opening = encodeURIComponent(openingRaw)
  const start = encodeURIComponent(code ?? '')
  // Сертификаты уходят в ответ только там, где выдан код.
  const delivers = Boolean(code)

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
    autoDelivery: Boolean(chatLink) && autoDelivery && delivers,
    // Текст с кодом виден прямо в ссылке. Там, где его подставить некуда —
    // профиль MAX и телефонный диплинк Telegram, — гость вставляет его сам.
    prefilled: /[?&](text|start)=/.test(chatLink ?? ''),
  })

  /**
   * Диплинк бота: код приезжает параметром `start`. Без кода (запись на сервис)
   * подставляем текст — гостю останется нажать «отправить».
   */
  const botChat = (url: string): string =>
    start ? `${url}?start=${start}` : withOpening(url, opening)

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
          ? info(botChat(`https://t.me/${telegramBot}`), true)
          : info(telegramChat(tgAccount, telegram.manager), false),
    max: isGreenReady('max')
      ? info(maxConversationLink(maxManager, opening), true)
      : maxBot
        ? info(botChat(`https://max.ru/${maxBot}`), true)
        : info(
            max.managerUsername ? maxConversationLink(max.managerUsername, opening) : null,
            false,
          ),
  }
}
