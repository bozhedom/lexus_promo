import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('GREEN-API WhatsApp delivery', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('INVITE_TEST_WA_GREEN_INSTANCE_ID', '7103000000')
    vi.stubEnv('INVITE_TEST_WA_GREEN_API_TOKEN', 'green-test-token')
    vi.stubEnv('INVITE_TEST_WA_GREEN_API_URL', 'https://7103.api.greenapi.test')
    vi.stubEnv('INVITE_TEST_WA_GREEN_WEBHOOK_TOKEN', 'webhook-test-token')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://promo.test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('parses an incoming private text message from this instance', async () => {
    const whatsapp = await import('../src/invite-test/server/whatsapp')
    expect(
      whatsapp.parseIncomingText({
        typeWebhook: 'incomingMessageReceived',
        instanceData: { idInstance: 7103000000, typeInstance: 'whatsapp' },
        senderData: { chatId: '79990001122@c.us' },
        messageData: {
          typeMessage: 'textMessage',
          textMessageData: { textMessage: 'Код: ACEF34679A' },
        },
      }),
    ).toEqual({ chatId: '79990001122@c.us', text: 'Код: ACEF34679A' })
  })

  it('sends both certificate images into the same chat', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ idMessage: 'message-id' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    const whatsapp = await import('../src/invite-test/server/whatsapp')

    await whatsapp.sendCertificates(
      '79990001122@c.us',
      [
        { id: 'diagnostics', image: '/invite-test/cert-diagnostics.png', alt: 'Диагностика' },
        { id: 'gift', image: '/invite-test/cert-gift.png', alt: 'Подарок' },
      ],
      'Иван Иванович, добрый день!',
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const [index, call] of fetchMock.mock.calls.entries()) {
      expect(call[0]).toBe(
        'https://7103.api.greenapi.test/waInstance7103000000/sendFileByUrl/green-test-token',
      )
      const body = JSON.parse(String(call[1]?.body))
      expect(body.chatId).toBe('79990001122@c.us')
      expect(body.urlFile).toBe(
        `https://promo.test/invite-test/${index === 0 ? 'cert-diagnostics.png' : 'cert-gift.png'}`,
      )
      if (index === 0) expect(body.caption).toBeUndefined()
      else expect(body.caption).toContain('Иван Иванович')
    }
  })

  it('blocks a chat for ten minutes after five invalid codes', async () => {
    const guard = await import('../src/invite-test/server/codeAttempts')
    const chatId = '79990001122@c.us'

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(guard.isCodeAttemptBlocked(chatId, attempt)).toBe(false)
      guard.recordInvalidCode(chatId, attempt)
    }

    expect(guard.isCodeAttemptBlocked(chatId, 5)).toBe(true)
    expect(guard.isCodeAttemptBlocked(chatId, 10 * 60 * 1000 + 1)).toBe(false)
  })

  it('configures an authenticated incoming webhook', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ saveSettings: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    const whatsapp = await import('../src/invite-test/server/whatsapp')

    await whatsapp.configureWebhook('https://promo.test/api/invite-test/whatsapp/webhook')

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(body).toMatchObject({
      webhookUrl: 'https://promo.test/api/invite-test/whatsapp/webhook',
      webhookUrlToken: 'webhook-test-token',
      incomingWebhook: 'yes',
    })
  })
})
