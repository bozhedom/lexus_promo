import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const CERTIFICATES = [
  { id: 'diagnostics', image: '/invite-test/cert-diagnostics.png', alt: 'Диагностика' },
  { id: 'gift', image: '/invite-test/cert-gift.png', alt: 'Подарок' },
]

const incoming = (
  idInstance: number | string,
  typeInstance: string,
  text: string,
  chatId = '79990001122@c.us',
) => ({
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance, typeInstance },
  senderData: { chatId },
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
    vi.stubEnv('INVITE_TEST_MAX_GREEN_INSTANCE_ID', '3100000000')
    vi.stubEnv('INVITE_TEST_MAX_GREEN_API_TOKEN', 'max-token')
    vi.stubEnv('INVITE_TEST_MAX_GREEN_API_URL', 'https://3100.api.greenapi.test')
    vi.stubEnv('INVITE_TEST_GREEN_WEBHOOK_TOKEN', 'webhook-test-token')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://promo.test')
    delete (globalThis as { __greenAccounts?: unknown }).__greenAccounts
    // Сессии живут на globalThis и переживают resetModules: без этого ждущий
    // гость из прошлого теста мешает опознать гостя в следующем.
    delete (globalThis as { __invitePromoSessions?: unknown }).__invitePromoSessions
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    delete (globalThis as { __greenAccounts?: unknown }).__greenAccounts
    delete (globalThis as { __invitePromoSessions?: unknown }).__invitePromoSessions
  })

  it('канал определяется по идентификатору инстанса', async () => {
    const green = await import('../src/invite-test/server/green')

    expect(green.parseIncoming(incoming(7103000000, 'whatsapp', 'Код: ACEF34679A'))).toEqual({
      channel: 'whatsapp',
      chatId: '79990001122@c.us',
      text: 'Код: ACEF34679A',
    })
    expect(
      green.parseIncoming(incoming(4100000000, 'telegram', 'Код: ACEF34679A', '123456789')),
    ).toMatchObject({ channel: 'telegram', chatId: '123456789' })
    expect(
      green.parseIncoming(incoming(3100000000, 'v3', 'Код: ACEF34679A', '987654321')),
    ).toMatchObject({ channel: 'max', chatId: '987654321' })
    // Чужой инстанс и неверное имя типа не принимаются.
    expect(green.parseIncoming(incoming(9999999999, 'v3', 'Код: ACEF34679A'))).toBeNull()
    expect(
      green.parseIncoming(incoming(3100000000, 'max', 'Код: ACEF34679A', '987654321')),
    ).toBeNull()
  })

  it('групповой чат игнорируется', async () => {
    const green = await import('../src/invite-test/server/green')
    expect(
      green.parseIncoming(
        incoming(7103000000, 'whatsapp', 'Код: ACEF34679A', '79990001122-1234@g.us'),
      ),
    ).toBeNull()
    expect(
      green.parseIncoming(incoming(4100000000, 'telegram', 'Код: ACEF34679A', '-123456789')),
    ).toBeNull()
  })

  it('принимает новый личный chatId WhatsApp в формате lid', async () => {
    const green = await import('../src/invite-test/server/green')
    expect(
      green.parseIncoming(
        incoming(7103000000, 'whatsapp', 'Код: ACEF34679A', '155508384256027@lid'),
      ),
    ).toMatchObject({ channel: 'whatsapp', chatId: '155508384256027@lid' })
  })

  /**
   * Главный случай MAX: подставить текст в диалог с менеджером мессенджер не
   * умеет, поэтому гость отправляет что придётся — вплоть до стикера.
   */
  it('сообщение без текста тоже разбирается', async () => {
    const green = await import('../src/invite-test/server/green')

    expect(green.parseIncoming(incoming(3100000000, 'v3', 'Здравствуйте', '987654321'))).toEqual({
      channel: 'max',
      chatId: '987654321',
      text: 'Здравствуйте',
    })

    expect(
      green.parseIncoming({
        typeWebhook: 'incomingMessageReceived',
        instanceData: { idInstance: 3100000000, typeInstance: 'v3' },
        senderData: { chatId: '987654321' },
        messageData: { typeMessage: 'stickerMessage' },
      }),
    ).toEqual({ channel: 'max', chatId: '987654321', text: '' })
  })

  /**
   * Телефона гость в этой воронке не оставляет — только имя. Поэтому сообщение
   * без кода связывается с выдачей единственным доступным признаком: гость
   * только что нажал кнопку этого мессенджера.
   */
  it('сессия находится по отметке о переходе в мессенджер', async () => {
    const store = await import('../src/invite-test/server/store')

    const session = store.createSession('Иван Иванович')
    expect(store.findOpenedSession('max')).toBeNull()

    store.markOpened(session.code, 'max')
    expect(store.findOpenedSession('max')?.code).toBe(session.code)
    // Ушёл в MAX — в Telegram его сообщения не ждут.
    expect(store.findOpenedSession('telegram')).toBeNull()

    // Отправленная сессия второй раз не находится: повторный комплект не нужен.
    store.setStatus(session.code, 'sent')
    expect(store.findOpenedSession('max')).toBeNull()
  })

  /**
   * На пригласительных напечатаны имя и номер автомобиля, поэтому между двумя
   * ждущими гостями не угадываем: оба дошлют код из буфера обмена.
   */
  it('двое ждущих в одном мессенджере не опознаются', async () => {
    const store = await import('../src/invite-test/server/store')

    const first = store.createSession('Иван Иванович')
    const second = store.createSession('Пётр Петрович')
    store.markOpened(first.code, 'max')
    store.markOpened(second.code, 'max')

    expect(store.findOpenedSession('max')).toBeNull()

    // Первый забрал своё по коду — второй снова опознаётся однозначно.
    store.setStatus(first.code, 'sent')
    expect(store.findOpenedSession('max')?.code).toBe(second.code)
  })

  it('сорвавшаяся отправка не закрывает путь по сообщению гостя', async () => {
    const store = await import('../src/invite-test/server/store')

    const session = store.createSession('Пётр Петрович')
    store.markOpened(session.code, 'max')
    store.setStatus(session.code, 'failed', 'MAX отказал')

    expect(store.findOpenedSession('max')?.code).toBe(session.code)
    expect(store.claimSession(session.code)?.code).toBe(session.code)

    // А вот пока отправка идёт, второй раз сессию не забрать.
    expect(store.findOpenedSession('max')).toBeNull()
    expect(store.claimSession(session.code)).toBeNull()
  })

  it('в Telegram уходят три сообщения: два файла и текст', async () => {
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
      '123456789',
      CERTIFICATES,
      'Иван Иванович, добрый день!',
    )

    expect(fetchMock).toHaveBeenCalledTimes(3)
    for (const [index, call] of fetchMock.mock.calls.slice(0, 2).entries()) {
      expect(call[0]).toBe(
        'https://4100.api.greenapi.test/waInstance4100000000/sendFileByUrl/tg-token',
      )
      const body = JSON.parse(String(call[1]?.body))
      expect(body.chatId).toBe('123456789')
      expect(body.urlFile).toBe(
        `https://promo.test/invite-test/${index === 0 ? 'cert-diagnostics.png' : 'cert-gift.png'}`,
      )
      // Подписи под пригласительными нет: текст уходит отдельным сообщением.
      expect(body.caption).toBeUndefined()
    }

    const last = fetchMock.mock.calls[2]!
    expect(last[0]).toBe('https://4100.api.greenapi.test/waInstance4100000000/sendMessage/tg-token')
    const text = JSON.parse(String(last[1]?.body))
    expect(text.chatId).toBe('123456789')
    expect(text.message).toContain('Иван Иванович')
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

  it('аккаунт инстанса берётся из getAccountSettings и спрашивается один раз', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ phone: '79084481616', username: '@autogarantcity' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    const green = await import('../src/invite-test/server/green')

    const account = { phone: '79084481616', username: 'autogarantcity' }
    expect(await green.accountIdentity('telegram')).toEqual(account)
    expect(await green.accountIdentity('telegram')).toEqual(account)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://4100.api.greenapi.test/waInstance4100000000/getAccountSettings/tg-token',
    )
  })

  it('вебхук настраивается на общий адрес с токеном', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(JSON.stringify({ saveSettings: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    const green = await import('../src/invite-test/server/green')

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
