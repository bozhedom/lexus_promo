import { inviteTestEnv } from '../config/env'
import * as max from './max'
import * as telegram from './telegram'

/**
 * Username бота нужен только для ссылки, по которой гость открывает чат, и обе
 * платформы отдают его сами по токену. Спрашивать его отдельно незачем: от
 * настройки требуется ровно токен, как у GREEN-API.
 *
 * Ответ кэшируем на процесс: username бота не меняется, а ссылка собирается на
 * каждую выдачу кода.
 */
const store = globalThis as typeof globalThis & {
  __inviteBotUsernames?: Map<string, string>
}

const cache: Map<string, string> = (store.__inviteBotUsernames ??= new Map())

async function resolve(
  key: string,
  override: string,
  token: string,
  ask: () => Promise<unknown>,
): Promise<string> {
  if (override) return override
  if (!token) return ''

  const cached = cache.get(key)
  if (cached !== undefined) return cached

  try {
    const me = (await ask()) as { username?: string } | null
    const username = typeof me?.username === 'string' ? me.username : ''
    // Пустой ответ тоже запоминаем: дёргать API на каждую выдачу кода незачем,
    // а перезапуск сервера кэш сбросит.
    cache.set(key, username)
    return username
  } catch {
    return ''
  }
}

export const telegramBotUsername = (): Promise<string> =>
  resolve(
    `tg:${inviteTestEnv.telegram.botToken}`,
    inviteTestEnv.telegram.botUsername,
    inviteTestEnv.telegram.botToken,
    telegram.getMe,
  )

export const maxBotUsername = (): Promise<string> =>
  resolve(
    `max:${inviteTestEnv.max.botToken}`,
    inviteTestEnv.max.botUsername,
    inviteTestEnv.max.botToken,
    max.getMe,
  )
