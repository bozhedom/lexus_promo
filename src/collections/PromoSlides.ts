import type { Access, CollectionConfig } from 'payload'

const authenticated: Access = ({ req }) => Boolean(req.user)

export const PromoSlides: CollectionConfig = {
  slug: 'promo-slides',
  labels: {
    singular: { ru: 'Слайд автоцентра', en: 'Promo slide' },
    plural: { ru: 'Слайды автоцентра', en: 'Promo slides' },
  },
  admin: {
    useAsTitle: 'caption',
    defaultColumns: ['caption', 'desktopImage', 'mobileImage', 'order', 'active'],
    description: {
      ru: 'Фотографии под формой. Вертикальная версия показывается при открытии фото на телефоне.',
      en: 'Photos below the form. The portrait image is used in the mobile fullscreen viewer.',
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
      name: 'caption',
      type: 'text',
      required: true,
      label: { ru: 'Подпись', en: 'Caption' },
    },
    {
      name: 'desktopImage',
      type: 'upload',
      relationTo: 'media',
      label: { ru: 'Горизонтальное изображение', en: 'Landscape image' },
    },
    {
      name: 'mobileImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: {
          ru: 'Рекомендуемая пропорция 9:16. Если не заполнено, используется горизонтальная версия.',
          en: '9:16 is recommended. Falls back to the landscape image when empty.',
        },
      },
      label: { ru: 'Вертикальное изображение', en: 'Portrait image' },
    },
    {
      name: 'desktopPath',
      type: 'text',
      admin: {
        hidden: true,
        description: { ru: 'Системный путь стартового изображения', en: 'Seed image path' },
      },
      label: { ru: 'Системное изображение', en: 'Seed image' },
    },
    {
      name: 'mobilePath',
      type: 'text',
      admin: {
        hidden: true,
        description: { ru: 'Системный путь вертикального изображения', en: 'Seed portrait path' },
      },
      label: { ru: 'Системное вертикальное изображение', en: 'Seed portrait image' },
    },
    {
      name: 'address',
      type: 'text',
      label: { ru: 'Адрес поверх фотографии', en: 'Address overlay' },
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
