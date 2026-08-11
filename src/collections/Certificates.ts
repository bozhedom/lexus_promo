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
    defaultColumns: ['image', 'code', 'kind', 'amount', 'application', 'redeemedAt', 'createdAt'],
    listSearchableFields: ['code'],
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  // На заявку выписывается ровно по одному пригласительному каждого вида:
  // повторный запрос выдачи не должен плодить третий сертификат.
  indexes: [{ fields: ['application', 'kind'], unique: true }],
  fields: [
    {
      name: 'application',
      type: 'relationship',
      relationTo: 'applications',
      required: true,
      index: true,
      label: { ru: 'Заявка', en: 'Application' },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'diagnostics',
      index: true,
      options: [
        { value: 'diagnostics', label: { ru: 'Диагностика ходовой', en: 'Diagnostics' } },
        { value: 'gift', label: { ru: 'В честь знакомства', en: 'Welcome gift' } },
      ],
      admin: {
        description: {
          ru: 'На гостя выписываются оба: пара уникальна в рамках заявки',
          en: 'Both are issued per guest: the pair is unique within an application',
        },
      },
      label: { ru: 'Пригласительный', en: 'Kind' },
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
