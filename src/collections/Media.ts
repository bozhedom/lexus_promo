import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { ru: 'Файл', en: 'Media' },
    plural: { ru: 'Файлы', en: 'Media' },
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    mimeTypes: ['image/*'],
    // оригинал пригласительного весит около 3 МБ, в списках показываем превью
    imageSizes: [{ name: 'thumbnail', width: 480, position: 'centre' }],
    adminThumbnail: 'thumbnail',
  },
}
