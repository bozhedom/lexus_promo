import type { Access, CollectionConfig } from 'payload'

const authenticated: Access = ({ req }) => Boolean(req.user)

export const CarCatalog: CollectionConfig = {
  slug: 'car-catalog',
  labels: {
    singular: { ru: 'Марка и модели', en: 'Car brand and models' },
    plural: { ru: 'Марки и модели', en: 'Car brands and models' },
  },
  admin: {
    useAsTitle: 'brand',
    defaultColumns: ['brand', 'order', 'active', 'updatedAt'],
    description: {
      ru: 'Список марок и моделей для ручного ввода. На сайте показываются только активные записи.',
      en: 'Brands and models available in the manual vehicle form.',
    },
  },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'brand',
      type: 'text',
      required: true,
      unique: true,
      index: true,
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
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 100,
      index: true,
      label: { ru: 'Порядок', en: 'Order' },
    },
    {
      name: 'active',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      index: true,
      label: { ru: 'Показывать на сайте', en: 'Visible on site' },
    },
  ],
  timestamps: true,
}
