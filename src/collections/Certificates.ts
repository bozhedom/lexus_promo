import type { Access, CollectionConfig } from 'payload'

const authenticated: Access = ({ req }) => Boolean(req.user)

export const Certificates: CollectionConfig = {
  slug: 'certificates',
  labels: {
    singular: { ru: 'Сертификат', en: 'Certificate' },
    plural: { ru: 'Сертификаты', en: 'Certificates' },
  },
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['image', 'code', 'amount', 'application', 'redeemedAt', 'createdAt'],
    listSearchableFields: ['code'],
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: 'application',
      type: 'relationship',
      relationTo: 'applications',
      required: true,
      // один сертификат на заявку: гарантия идемпотентности /complete на уровне БД
      unique: true,
      label: { ru: 'Заявка', en: 'Application' },
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { ru: 'Код', en: 'Code' },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: {
          ru: 'Сумма рассчитывается только на сервере',
          en: 'Amount is computed server-side only',
        },
      },
      label: { ru: 'Сумма, ₽', en: 'Amount, ₽' },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: {
          ru: 'Картинка, которую гость сохранил себе. Появляется после нажатия «Сохранить».',
          en: 'The picture the guest saved. Appears after they hit save.',
        },
      },
      label: { ru: 'Пригласительный', en: 'Certificate image' },
    },
    {
      name: 'redeemAction',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/admin/RedeemButton#RedeemButton',
        },
      },
    },
    {
      name: 'redeemedAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
      label: { ru: 'Дата использования', en: 'Redeemed at' },
    },
    {
      name: 'expiresAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
      label: { ru: 'Действует до', en: 'Expires at' },
    },
  ],
  timestamps: true,
}
