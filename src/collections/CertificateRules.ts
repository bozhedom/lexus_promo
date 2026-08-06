import type { Access, CollectionConfig } from 'payload'

const authenticated: Access = ({ req }) => Boolean(req.user)

export const CertificateRules: CollectionConfig = {
  slug: 'certificate-rules',
  labels: {
    singular: { ru: 'Правило суммы', en: 'Certificate amount rule' },
    plural: { ru: 'Правила сумм', en: 'Certificate amount rules' },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'brand', 'amount', 'priority', 'active'],
    description: {
      ru: 'Первое подходящее активное правило определяет сумму сертификата. Правила проверяются по приоритету от большего к меньшему.',
      en: 'The first active matching rule determines the certificate amount. Higher priority is evaluated first.',
    },
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  defaultSort: '-priority',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: { ru: 'Название правила', en: 'Rule name' },
    },
    {
      name: 'brand',
      type: 'text',
      admin: {
        description: {
          ru: 'Необязательно. Например: Toyota или Lexus. Регистр не важен.',
          en: 'Optional, for example Toyota or Lexus. Case-insensitive.',
        },
      },
      label: { ru: 'Марка', en: 'Brand' },
    },
    {
      name: 'models',
      type: 'array',
      required: true,
      minRows: 1,
      labels: {
        singular: { ru: 'Модель', en: 'Model' },
        plural: { ru: 'Модели', en: 'Models' },
      },
      fields: [
        {
          name: 'model',
          type: 'text',
          required: true,
          label: { ru: 'Название модели', en: 'Model name' },
        },
      ],
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 1,
      label: { ru: 'Сумма, ₽', en: 'Amount, ₽' },
    },
    {
      name: 'priority',
      type: 'number',
      required: true,
      defaultValue: 100,
      index: true,
      label: { ru: 'Приоритет', en: 'Priority' },
    },
    {
      name: 'active',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      index: true,
      label: { ru: 'Правило активно', en: 'Active' },
    },
  ],
  timestamps: true,
}
