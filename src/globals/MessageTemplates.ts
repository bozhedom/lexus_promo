import type { Access, GlobalConfig } from 'payload'

import {
  DEFAULT_BOOKING_TEMPLATE,
  DEFAULT_DELIVERY_TEMPLATE,
  DEFAULT_OPENING_TEMPLATE,
} from '@/invite-test/config/certificates'

const authenticated: Access = ({ req }) => Boolean(req.user)

const placeholders = (list: [string, string][]): string =>
  list.map(([key, what]) => `{${key}} — ${what}`).join(', ')

/**
 * Тексты, которые уходят в мессенджеры. Лежат в админке, чтобы менеджер менял
 * формулировки сам: правка применяется к следующей выдаче, перезапускать
 * приложение не нужно.
 *
 * Пустое поле означает «оставить текст по умолчанию» — тот, что записан в
 * `src/invite-test/config/certificates.ts`. Так раздел можно очистить и
 * вернуться к исходным формулировкам.
 */
export const MessageTemplates: GlobalConfig = {
  slug: 'message-templates',
  label: { ru: 'Тексты сообщений', en: 'Message templates' },
  admin: {
    group: { ru: 'Настройки', en: 'Settings' },
    description: {
      ru: 'Подстановки пишутся в фигурных скобках. Пустое поле — текст по умолчанию.',
      en: 'Placeholders go in curly braces. An empty field falls back to the default text.',
    },
  },
  access: { read: authenticated, update: authenticated },
  fields: [
    {
      name: 'delivery',
      type: 'textarea',
      defaultValue: DEFAULT_DELIVERY_TEMPLATE,
      label: { ru: 'Сообщение с пригласительными', en: 'Delivery message' },
      admin: {
        rows: 10,
        description: {
          ru: `Приходит гостю следом за двумя картинками. Подстановки: ${placeholders([
            ['name', 'имя и отчество'],
            ['car', 'марка, модель и год'],
            ['plate', 'госномер'],
            ['amount', 'сумма подарка'],
          ])}`,
          en: 'Sent to the guest right after the two pictures.',
        },
      },
    },
    {
      name: 'opening',
      type: 'textarea',
      defaultValue: DEFAULT_OPENING_TEMPLATE,
      label: { ru: 'Текст, который отправляет гость', en: 'Guest opening message' },
      admin: {
        rows: 4,
        description: {
          ru: 'Подставляется гостю в поле ввода мессенджера. По коду из этого сообщения сервер понимает, кому слать пригласительные, поэтому {code} обязателен и слово «Код:» перед ним лучше не убирать.',
          en: 'Prefilled in the messenger input. {code} is required.',
        },
      },
      validate: (value: string | null | undefined) => {
        if (value && !value.includes('{code}')) {
          return 'Без {code} сервер не поймёт, кому отправлять пригласительные'
        }
        return true
      },
    },
    {
      name: 'booking',
      type: 'textarea',
      defaultValue: DEFAULT_BOOKING_TEMPLATE,
      label: { ru: 'Текст записи на сервис', en: 'Booking message' },
      admin: {
        rows: 4,
        description: {
          ru: `Подставляется гостю, который пришёл записываться, а не за пригласительным. Подстановки: ${placeholders(
            [
              ['car', 'марка, модель и год'],
              ['plate', 'госномер'],
            ],
          )}`,
          en: 'Prefilled for guests who came to book a service slot.',
        },
      },
    },
  ],
}
