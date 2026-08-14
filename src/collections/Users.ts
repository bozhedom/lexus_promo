import type { CollectionConfig } from 'payload'

const authenticated = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: { ru: 'Сотрудник', en: 'User' },
    plural: { ru: 'Сотрудники', en: 'Users' },
  },
  admin: {
    useAsTitle: 'email',
  },
  // Аккаунт в админке общий на автоцентр, поэтому заводится он не из
  // интерфейса, а командой `npm run admin:reset`: пароль лежит в .env сервера,
  // и вспомнить его можно, не заглядывая в базу.
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
    admin: authenticated,
  },
  auth: {
    // Пять промахов — и аккаунт заперт на четверть часа: подбирать пароль
    // перебором не с чего, даже пройдя шлюз из middleware.
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    // Смена длится дольше, чем два часа по умолчанию, но не бесконечно:
    // забытая на общем компьютере вкладка сама разлогинивается к концу дня.
    tokenExpiration: 12 * 60 * 60,
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  fields: [
    // Email и пароль добавляет сам Payload
  ],
}
