import type { Access, CollectionBeforeChangeHook, CollectionConfig } from 'payload'

const authenticated: Access = ({ req }) => Boolean(req.user)

/**
 * Номер выдачи: у диагностики и замены масла свой отсчёт, и оба начинаются с
 * единицы. Считается от последнего выписанного номера этого вида, поэтому
 * очищенный в админке раздел нумеруется заново с первого.
 *
 * Номер печатается на самом пригласительном, так что задним числом он не
 * меняется: у выписанного сертификата поле остаётся тем, что было.
 */
const numberCertificate: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || typeof data.serial === 'number') return data

  const last = await req.payload.find({
    collection: 'certificates',
    where: { kind: { equals: data.kind } },
    sort: '-serial',
    limit: 1,
    depth: 0,
    req,
  })

  const previous = last.docs[0]?.serial
  return { ...data, serial: (typeof previous === 'number' ? previous : 0) + 1 }
}

export const Certificates: CollectionConfig = {
  slug: 'certificates',
  labels: {
    singular: { ru: 'Сертификат', en: 'Certificate' },
    plural: { ru: 'Сертификаты', en: 'Certificates' },
  },
  admin: {
    useAsTitle: 'code',
    defaultColumns: [
      'image',
      'serial',
      'code',
      'kind',
      'amount',
      'application',
      'redeemedAt',
      'createdAt',
    ],
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
  hooks: { beforeChange: [numberCertificate] },
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
      name: 'serial',
      type: 'number',
      index: true,
      admin: {
        readOnly: true,
        description: {
          ru: 'Номер выдачи, он же напечатан на пригласительном. У каждого вида свой отсчёт с единицы',
          en: 'Issue number printed on the certificate. Each kind is numbered from one',
        },
      },
      label: { ru: 'Номер выдачи', en: 'Serial' },
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
