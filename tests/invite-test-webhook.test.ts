import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Главный сценарий MAX: гость попадает в диалог с менеджером и отправляет что
 * угодно — «Здравствуйте», стикер, что придёт в голову. Кода в сообщении нет и
 * быть не может: подставить текст в чужой диалог MAX не умеет. Узнаём гостя по
 * номеру, с которого он оставил заявку.
 */
describe('вебхук GREEN-API: сообщение без кода', () => {
  const PHONE = '+79876543210'

  const post = (body: unknown) =>
    new NextRequest('https://promo.test/api/invite-test/green/webhook', {
      method: 'POST',
      headers: {
        authorization: 'Bearer webhook-test-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })

  const fromGuest = (text: string, phone = 79876543210) => ({
    typeWebhook: 'incomingMessageReceived',
    instanceData: { idInstance: 3100000000, typeInstance: 'v3' },
    senderData: { chatId: '101220915', senderPhoneNumber: phone },
    messageData: {
      typeMessage: 'textMessage',
      textMessageData: { textMessage: text },
    },
  })

  /** Запросы к GREEN-API, кроме выкачивания самих картинок. */
  const sent = (mock: { mock: { calls: Parameters<typeof fetch>[] } }) =>
    mock.mock.calls.filter((call) => String(call[0]).includes('/waInstance'))

  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('INVITE_TEST_MAX_GREEN_INSTANCE_ID', '3100000000')
    vi.stubEnv('INVITE_TEST_MAX_GREEN_API_TOKEN', 'max-token')
    vi.stubEnv('INVITE_TEST_MAX_GREEN_API_URL', 'https://3100.api.greenapi.test')
    vi.stubEnv('INVITE_TEST_GREEN_WEBHOOK_TOKEN', 'webhook-test-token')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://promo.test')
    delete (globalThis as { __invitePromoSessions?: unknown }).__invitePromoSessions
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    delete (globalThis as { __invitePromoSessions?: unknown }).__invitePromoSessions
  })

  const greenOk = () =>
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ idMessage: 'message-id' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )

  it('любое сообщение с номера заявки приносит пригласительные', async () => {
    const fetchMock = greenOk()
    const store = await import('../src/invite-test/server/store')
    const { POST } = await import('../src/app/api/invite-test/green/webhook/route')

    const session = store.createSession('Иван Иванович', null, null, PHONE)

    const response = await POST(post(fromGuest('Здравствуйте')))
    expect(response.status).toBe(200)

    // Два пригласительных и текст менеджера — в тот же чат.
    const calls = sent(fetchMock)
    expect(calls).toHaveLength(3)
    expect(String(calls[0]![0])).toContain('/waInstance3100000000/sendFileByUrl/max-token')
    expect(JSON.parse(String(calls[0]![1]?.body)).chatId).toBe('101220915')
    expect(store.getSession(session.code)?.status).toBe('sent')
  })

  it('второе сообщение того же гостя ничего не отправляет повторно', async () => {
    const fetchMock = greenOk()
    const store = await import('../src/invite-test/server/store')
    const { POST } = await import('../src/app/api/invite-test/green/webhook/route')

    store.createSession('Иван Иванович', null, null, PHONE)

    await POST(post(fromGuest('Здравствуйте')))
    const afterFirst = sent(fetchMock).length
    await POST(post(fromGuest('А когда можно приехать?')))
    expect(sent(fetchMock)).toHaveLength(afterFirst)
  })

  it('сообщение с чужого номера остаётся без ответа', async () => {
    const fetchMock = greenOk()
    const store = await import('../src/invite-test/server/store')
    const { POST } = await import('../src/app/api/invite-test/green/webhook/route')

    const session = store.createSession('Иван Иванович', null, null, PHONE)

    await POST(post(fromGuest('Здравствуйте', 79111112233)))
    expect(sent(fetchMock)).toHaveLength(0)
    expect(store.getSession(session.code)?.status).toBe('idle')
  })

  it('неверный токен вебхука отбивается', async () => {
    const store = await import('../src/invite-test/server/store')
    const { POST } = await import('../src/app/api/invite-test/green/webhook/route')

    store.createSession('Иван Иванович', null, null, PHONE)
    const request = new NextRequest('https://promo.test/api/invite-test/green/webhook', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong', 'content-type': 'application/json' },
      body: JSON.stringify(fromGuest('Здравствуйте')),
    })

    expect((await POST(request)).status).toBe(401)
  })
})
