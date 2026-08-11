import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('MAX certificate delivery', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('INVITE_TEST_MAX_BOT_TOKEN', 'max-test-token')
    vi.stubEnv('INVITE_TEST_MAX_API_URL', 'https://max-api.test')
    vi.stubEnv('INVITE_TEST_MAX_MANAGER', 'manager_username')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://promo.test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('sends the personalized text and both certificate images', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: { body: { mid: '1' } } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    const max = await import('../src/invite-test/server/max')
    const { DEFAULT_CERTIFICATES, replyText } = await import(
      '../src/invite-test/config/certificates'
    )

    await max.sendCertificates(
      '123456789',
      DEFAULT_CERTIFICATES,
      replyText('Иван Иванович'),
    )

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://max-api.test/messages?user_id=123456789')
    expect(new Headers(init?.headers).get('authorization')).toBe('max-test-token')
    const body = JSON.parse(String(init?.body))
    expect(body.text).toContain('Иван Иванович')
    expect(body.attachments).toEqual([
      { type: 'image', payload: { url: 'https://promo.test/invite-test/cert-diagnostics.png' } },
      { type: 'image', payload: { url: 'https://promo.test/invite-test/cert-diagnostics.png' } },
      {
        type: 'inline_keyboard',
        payload: {
          buttons: [[{
            type: 'link',
            text: 'Написать менеджеру',
            url: 'https://max.ru/manager_username',
          }]],
        },
      },
    ])
  })

  it('registers a bot_started webhook with a secret', async () => {
    vi.stubEnv('INVITE_TEST_MAX_WEBHOOK_SECRET', 'secret-123')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    const max = await import('../src/invite-test/server/max')

    await max.subscribe('https://promo.test/api/invite-test/max/webhook')

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(body).toEqual({
      url: 'https://promo.test/api/invite-test/max/webhook',
      update_types: ['bot_started'],
      secret: 'secret-123',
    })
  })
})
