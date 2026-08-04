// Переменные модуля. Все с префиксом INVITE_TEST_, чтобы при удалении папки
// было видно, что чистить в .env.

const read = (key: string): string => (process.env[key] ?? '').trim()

export const inviteTestEnv = {
  telegram: {
    /** Бот нужен только как ключ к API: в переписке его не видно. */
    botToken: read('INVITE_TEST_TG_BOT_TOKEN'),
    /** @username менеджера, к нему ведёт кнопка. */
    manager: read('INVITE_TEST_TG_MANAGER'),
    /** Подставляется, если не хочется ждать апдейт business_connection. */
    businessId: read('INVITE_TEST_TG_BUSINESS_ID'),
    webhookSecret: read('INVITE_TEST_TG_WEBHOOK_SECRET'),
    apiUrl: read('INVITE_TEST_TG_API_URL') || 'https://api.telegram.org',
  },
  max: {
    /** Username официального бота MAX, к нему ведёт диплинк с кодом сессии. */
    botUsername: read('INVITE_TEST_MAX_BOT_USERNAME'),
    /** Личный username менеджера: бот показывает ссылку после сертификатов. */
    managerUsername: read('INVITE_TEST_MAX_MANAGER'),
    botToken: read('INVITE_TEST_MAX_BOT_TOKEN'),
    webhookSecret: read('INVITE_TEST_MAX_WEBHOOK_SECRET'),
    apiUrl: read('INVITE_TEST_MAX_API_URL') || 'https://platform-api2.max.ru',
  },
  whatsapp: {
    /** Номер менеджера в международном формате без плюса, для ссылки wa.me. */
    phone: read('INVITE_TEST_WA_PHONE'),
    /** Данные QR-инстанса GREEN-API. API URL уникален для инстанса. */
    instanceId: read('INVITE_TEST_WA_GREEN_INSTANCE_ID'),
    apiToken: read('INVITE_TEST_WA_GREEN_API_TOKEN'),
    apiUrl: read('INVITE_TEST_WA_GREEN_API_URL'),
    /** GREEN-API передаёт его как Bearer в Authorization webhook-запроса. */
    webhookToken: read('INVITE_TEST_WA_GREEN_WEBHOOK_TOKEN'),
  },
  setupKey: read('INVITE_TEST_SETUP_KEY'),
  siteUrl: read('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000',
}

/** Кнопка ведёт в диалог с менеджером, для этого хватает его username. */
export const isTelegramReady = (): boolean => Boolean(inviteTestEnv.telegram.manager)

/** Автоответ возможен только через бота, подключённого к аккаунту менеджера. */
export const isTelegramAutoReady = (): boolean =>
  Boolean(inviteTestEnv.telegram.botToken && isTelegramReady())

export const isMaxReady = (): boolean => Boolean(inviteTestEnv.max.botUsername)

/** MAX передаёт код из диплинка в bot_started, после чего бот может ответить. */
export const isMaxAutoReady = (): boolean =>
  Boolean(inviteTestEnv.max.botUsername && inviteTestEnv.max.botToken)

export const isWhatsappReady = (): boolean => Boolean(inviteTestEnv.whatsapp.phone)

/** Автоответ требует авторизованного QR-инстанса GREEN-API. */
export const isWhatsappAutoReady = (): boolean =>
  Boolean(
    inviteTestEnv.whatsapp.instanceId &&
      inviteTestEnv.whatsapp.apiToken &&
      inviteTestEnv.whatsapp.apiUrl &&
      isWhatsappReady(),
  )
