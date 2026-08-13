import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * От настройки требуется только токен: username бота, по которому собирается
 * ссылка на чат, обе платформы отдают сами.
 */
describe('username бота по токену', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('INVITE_TEST_TG_API_URL', 'https://api.telegram.test')
    vi.stubEnv('INVITE_TEST_MAX_API_URL', 'https://platform.max.test')
    delete (globalThis as { __inviteBotUsernames?: unknown }).__inviteBotUsernames
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    delete (globalThis as { __inviteBotUsernames?: unknown }).__inviteBotUsernames
  })

  it('Telegram: берёт username из getMe и спрашивает его один раз', async () => {
    vi.stubEnv('INVITE_TEST_TG_BOT_TOKEN', '123:AA-test')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ ok: true, result: { username: 'agc_invite_bot' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    const { telegramBotUsername } = await import('../src/invite-test/server/botIdentity')

    expect(await telegramBotUsername()).toBe('agc_invite_bot')
    expect(await telegramBotUsername()).toBe('agc_invite_bot')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.telegram.test/bot123:AA-test/getMe')
  })

  it('MAX: берёт username из me', async () => {
    vi.stubEnv('INVITE_TEST_MAX_BOT_TOKEN', 'max-test-token')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ user_id: 1, username: 'agc_max_bot' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    const { maxBotUsername } = await import('../src/invite-test/server/botIdentity')

    expect(await maxBotUsername()).toBe('agc_max_bot')
    expect(fetchMock.mock.calls[0]![0]).toBe('https://platform.max.test/me')
  })

  it('без токена в API не ходим', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const { telegramBotUsername, maxBotUsername } = await import(
      '../src/invite-test/server/botIdentity'
    )

    expect(await telegramBotUsername()).toBe('')
    expect(await maxBotUsername()).toBe('')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('недоступный API не роняет выдачу кода', async () => {
    vi.stubEnv('INVITE_TEST_TG_BOT_TOKEN', '123:AA-test')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))
    const { telegramBotUsername } = await import('../src/invite-test/server/botIdentity')

    expect(await telegramBotUsername()).toBe('')
  })

  it('переменная перебивает ответ API', async () => {
    vi.stubEnv('INVITE_TEST_TG_BOT_TOKEN', '123:AA-test')
    vi.stubEnv('INVITE_TEST_TG_BOT_USERNAME', 'manual_bot')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const { telegramBotUsername } = await import('../src/invite-test/server/botIdentity')

    expect(await telegramBotUsername()).toBe('manual_bot')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
