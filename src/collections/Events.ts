import type { Access, CollectionConfig } from 'payload'

import { EVENT_NAMES, type EventName } from '@/shared/analytics/event-names'

const authenticated: Access = ({ req }) => Boolean(req.user)

export { EVENT_NAMES }
export type { EventName }

export const Events: CollectionConfig = {
  slug: 'events',
  labels: {
    singular: { ru: 'Событие', en: 'Event' },
    plural: { ru: 'События', en: 'Events' },
  },
  admin: {
    useAsTitle: 'eventName',
    defaultColumns: ['eventName', 'sessionId', 'application', 'createdAt'],
    listSearchableFields: ['sessionId', 'eventName'],
    // сырой лог на тысячи строк в меню только пугает, сводка есть на дашборде.
    // при необходимости открывается по /admin/collections/events
    hidden: true,
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  indexes: [{ fields: ['eventName', 'createdAt'] }],
  fields: [
    {
      name: 'sessionId',
      type: 'text',
      required: true,
      index: true,
      label: { ru: 'ID сессии', en: 'Session ID' },
    },
    {
      name: 'application',
      type: 'relationship',
      relationTo: 'applications',
      label: { ru: 'Заявка', en: 'Application' },
    },
    {
      name: 'eventName',
      type: 'text',
      required: true,
      index: true,
      label: { ru: 'Событие', en: 'Event name' },
    },
    { name: 'payload', type: 'json', label: { ru: 'Данные', en: 'Payload' } },
  ],
  timestamps: true,
}
