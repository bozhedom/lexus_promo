import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { extractCode } from '../src/invite-test/config/certificates'

const CERTIFICATES = [
  { id: 'diagnostics', image: '/invite-test/cert-diagnostics.png', alt: 'Диагностика' },
  { id: 'gift', image: '/invite-test/cert-diagnostics.png', alt: 'Подарок' },
]

describe('Telegram delivery', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('INVITE_TEST_TG_BOT_TOKEN', '123:AA-test')
    vi.stubEnv('INVITE_TEST_TG_BOT_USERNAME', 'agc_invite_bot')
    vi.stubEnv('INVITE_TEST_TG_MANAGER', 'ivan_agc')
    vi.stubEnv('INVITE_TEST_TG_API_URL', 'https://api.telegram.test')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://promo.test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('достаёт код и из текста менеджеру, и из диплинка бота', () => {
    expect(extractCode('Здравствуйте! Код: ACEF34679A')).toBe('ACEF34679A')
    expect(extractCode('/start ACEF34679A')).toBe('ACEF34679A')
    expect(extractCode('/start@agc_invite_bot ACEF34679A')).toBe('ACEF34679A')
    expect(extractCode('просто сообщение без кода')).toBeNull()
  })

  const okResponse = () =>
    new Response(JSON.stringify({ ok: true, result: {} }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })

  it('в своём диалоге бот шлёт альбом без business_connection_id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => okResponse())
    const telegram = await import('../src/invite-test/server/telegram')

    await telegram.sendCertificates(555001, CERTIFICATES, 'Валерий, добрый день!')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.telegram.test/bot123:AA-test/sendMediaGroup')
    const form = init?.body as FormData
    expect(form.get('business_connection_id')).toBeNull()
    expect(form.get('chat_id')).toBe('555001')
    const media = JSON.parse(String(form.get('media'))) as { caption?: string }[]
    expect(media).toHaveLength(2)
    expect(media[0]?.caption).toContain('Валерий')
    expect(media[1]?.caption).toBeUndefined()
  })

  it('в диалоге с менеджером альбом уходит от его имени', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => okResponse())
    const telegram = await import('../src/invite-test/server/telegram')

    await telegram.sendCertificates(555001, CERTIFICATES, 'Текст', 'BqHVQ9d2mK')

    const form = fetchMock.mock.calls[0]![1]?.body as FormData
    expect(form.get('business_connection_id')).toBe('BqHVQ9d2mK')
  })

  it('после сертификатов бот даёт кнопку в чат менеджера', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => okResponse())
    const telegram = await import('../src/invite-test/server/telegram')

    await telegram.sendManagerLink(555001)

    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))
    expect(body.chat_id).toBe(555001)
    expect(body.reply_markup.inline_keyboard[0][0].url).toBe('https://t.me/ivan_agc')
  })

  it('вебхук слушает и собственный диалог бота', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => okResponse())
    const telegram = await import('../src/invite-test/server/telegram')

    await telegram.setWebhook('https://promo.test/api/invite-test/telegram/webhook')

    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))
    expect(body.allowed_updates).toContain('message')
    expect(body.allowed_updates).toContain('business_message')
  })
})
