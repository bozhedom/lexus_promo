import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const CERTIFICATES = [
  { id: 'diagnostics', image: '/invite-test/cert-diagnostics.png', alt: 'Диагностика' },
  { id: 'gift', image: '/invite-test/cert-gift.png', alt: 'Подарок' },
]

const incoming = (idInstance: number | string, typeInstance: string, text: string) => ({
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance, typeInstance },
  senderData: { chatId: '79990001122@c.us' },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } },
})

/**
 * У GREEN-API отдельные продукты под WhatsApp, Telegram и MAX, но REST у них
 * общий: различаются только реквизиты инстанса.
 */
describe('GREEN-API: три канала одним клиентом', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('INVITE_TEST_WA_GREEN_INSTANCE_ID', '7103000000')
    vi.stubEnv('INVITE_TEST_WA_GREEN_API_TOKEN', 'wa-token')
    vi.stubEnv('INVITE_TEST_WA_GREEN_API_URL', 'https://7103.api.greenapi.test')
    vi.stubEnv('INVITE_TEST_TG_GREEN_INSTANCE_ID', '4100000000')
    vi.stubEnv('INVITE_TEST_TG_GREEN_API_TOKEN', 'tg-token')
    vi.stubEnv('INVITE_TEST_TG_GREEN_API_URL', 'https://4100.api.greenapi.test')
    vi.stubEnv('INVITE_TEST_GREEN_WEBHOOK_TOKEN', 'webhook-test-token')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://promo.test')
    delete (globalThis as { __greenAccountPhones?: unknown }).__greenAccountPhones
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    delete (globalThis as { __greenAccountPhones?: unknown }).__greenAccountPhones
  })

  it('канал определяется по идентификатору инстанса', async () => {
    const green = await import('../src/invite-test/server/green')

    expect(green.parseIncoming(incoming(7103000000, 'whatsapp', 'Код: ACEF34679A'))).toEqual({
      channel: 'whatsapp',
      chatId: '79990001122@c.us',
      text: 'Код: ACEF34679A',
    })
    expect(green.parseIncoming(incoming(4100000000, 'telegram', 'Код: ACEF34679A'))?.channel).toBe(
      'telegram',
    )
    // Чужой инстанс: MAX не настроен, значит и принимать от него нечего.
    expect(green.parseIncoming(incoming(9999999999, 'max', 'Код: ACEF34679A'))).toBeNull()
  })

  it('групповой чат игнорируется', async () => {
    const green = await import('../src/invite-test/server/green')
    const update = incoming(7103000000, 'whatsapp', 'Код: ACEF34679A')
    update.senderData.chatId = '79990001122-1234@g.us'
    expect(green.parseIncoming(update)).toBeNull()
  })

  it('в Telegram файлы уходят на адрес его инстанса', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ idMessage: 'message-id' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    const green = await import('../src/invite-test/server/green')

    await green.sendCertificates(
      'telegram',
      '79990001122@c.us',
      CERTIFICATES,
      'Иван Иванович, добрый день!',
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const [index, call] of fetchMock.mock.calls.entries()) {
      expect(call[0]).toBe(
        'https://4100.api.greenapi.test/waInstance4100000000/sendFileByUrl/tg-token',
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

  it('в WhatsApp — на адрес его инстанса', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ idMessage: 'message-id' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    const green = await import('../src/invite-test/server/green')

    await green.sendCertificates('whatsapp', '79990001122@c.us', CERTIFICATES, 'Текст')

    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://7103.api.greenapi.test/waInstance7103000000/sendFileByUrl/wa-token',
    )
  })

  it('номер аккаунта берётся из getSettings и спрашивается один раз', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ wid: '79140773596@c.us' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    const green = await import('../src/invite-test/server/green')

    expect(await green.accountPhone('telegram')).toBe('79140773596')
    expect(await green.accountPhone('telegram')).toBe('79140773596')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('вебхук настраивается на общий адрес с токеном', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ saveSettings: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    const green = await import('../src/invite-test/server/green')

    await green.configureWebhook('max', 'https://promo.test/api/invite-test/green/webhook')
      .then(() => expect.unreachable('MAX не настроен, вызов должен упасть'))
      .catch((err: Error) => expect(err.message).toContain('не настроен'))

    await green.configureWebhook('telegram', 'https://promo.test/api/invite-test/green/webhook')
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))
    expect(body).toMatchObject({
      webhookUrl: 'https://promo.test/api/invite-test/green/webhook',
      webhookUrlToken: 'webhook-test-token',
      incomingWebhook: 'yes',
    })
  })

  it('блокирует чат на десять минут после пяти неверных кодов', async () => {
    const guard = await import('../src/invite-test/server/codeAttempts')
    const chatId = 'telegram:79990001122@c.us'

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(guard.isCodeAttemptBlocked(chatId, attempt)).toBe(false)
      guard.recordInvalidCode(chatId, attempt)
    }

    expect(guard.isCodeAttemptBlocked(chatId, 5)).toBe(true)
    expect(guard.isCodeAttemptBlocked(chatId, 10 * 60 * 1000 + 1)).toBe(false)
  })
})
