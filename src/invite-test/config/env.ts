// Переменные модуля. Все с префиксом INVITE_TEST_, чтобы при удалении папки
// было видно, что чистить в .env.

const read = (key: string): string => (process.env[key] ?? '').trim()

/**
 * Реквизиты инстанса GREEN-API. Одинаковые для WhatsApp, Telegram и MAX:
 * продукты разные, REST один. Инстанс привязан к личному аккаунту менеджера,
 * поэтому пригласительные приходят из его диалога, а не от бота.
 */
export interface GreenCredentials {
  instanceId: string
  apiToken: string
  apiUrl: string
}

const green = (prefix: string): GreenCredentials => ({
  instanceId: read(`INVITE_TEST_${prefix}_GREEN_INSTANCE_ID`),
  apiToken: read(`INVITE_TEST_${prefix}_GREEN_API_TOKEN`),
  apiUrl: read(`INVITE_TEST_${prefix}_GREEN_API_URL`),
})

export const inviteTestEnv = {
  green: {
    whatsapp: green('WA'),
    telegram: green('TG'),
    max: green('MAX'),
    /**
     * Общий на все инстансы: GREEN-API передаёт его как Bearer в Authorization
     * вебхука. Старое имя переменной поддержано, чтобы не переписывать .env.
     */
    webhookToken:
      read('INVITE_TEST_GREEN_WEBHOOK_TOKEN') || read('INVITE_TEST_WA_GREEN_WEBHOOK_TOKEN'),
  },
  telegram: {
    /** Бот нужен только как ключ к API: в переписке его не видно. */
    botToken: read('INVITE_TEST_TG_BOT_TOKEN'),
    /** @username менеджера, к нему ведёт кнопка. */
    manager: read('INVITE_TEST_TG_MANAGER'),
    /**
     * Username самого бота. Обычно пустой: он достаётся из `getMe` по токену
     * (см. `server/botIdentity`). Задаётся, только если нужно перебить ответ API.
     */
    botUsername: read('INVITE_TEST_TG_BOT_USERNAME'),
    /** Подставляется, если не хочется ждать апдейт business_connection. */
    businessId: read('INVITE_TEST_TG_BUSINESS_ID'),
    webhookSecret: read('INVITE_TEST_TG_WEBHOOK_SECRET'),
    apiUrl: read('INVITE_TEST_TG_API_URL') || 'https://api.telegram.org',
  },
  max: {
    /**
     * Username официального бота MAX, к нему ведёт диплинк с кодом сессии.
     * Как и в Telegram, обычно пустой: достаётся из `me` по токену.
     */
    botUsername: read('INVITE_TEST_MAX_BOT_USERNAME'),
    /** Личный username менеджера в MAX: к нему ведёт кнопка канала. */
    managerUsername: read('INVITE_TEST_MAX_MANAGER'),
    botToken: read('INVITE_TEST_MAX_BOT_TOKEN'),
    webhookSecret: read('INVITE_TEST_MAX_WEBHOOK_SECRET'),
    apiUrl: read('INVITE_TEST_MAX_API_URL') || 'https://platform-api2.max.ru',
  },
  whatsapp: {
    /**
     * Номер менеджера без плюса для ссылки wa.me. Обычно пустой: номер
     * инстанса отдаёт сам GREEN-API (`getSettings.wid`).
     */
    phone: read('INVITE_TEST_WA_PHONE'),
  },
  setupKey: read('INVITE_TEST_SETUP_KEY'),
  siteUrl: read('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000',
}

/** Кнопка ведёт либо в диалог с менеджером, либо в диалог с ботом. */
export const isTelegramReady = (): boolean =>
  Boolean(inviteTestEnv.telegram.manager || inviteTestEnv.telegram.botUsername)

/**
 * Автоответ через бота: от имени менеджера с подключённым бизнес-ботом либо от
 * самого бота в его диалоге. Первый способ требует ещё и подключения, поэтому
 * проверяется отдельно, уже с `getBusinessId`.
 */
export const isTelegramAutoReady = (): boolean =>
  Boolean(inviteTestEnv.telegram.botToken && isTelegramReady())

/**
 * Диплинк в бота: он отвечает сам, подключение к менеджеру не нужно. Хватает
 * токена — username бота приходит из `getMe`.
 */
export const isTelegramBotReady = (): boolean => Boolean(inviteTestEnv.telegram.botToken)

export const isMaxBotReady = (): boolean => Boolean(inviteTestEnv.max.botToken)
