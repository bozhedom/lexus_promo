import path from 'path'
import { fileURLToPath } from 'url'

import type { Access, CollectionConfig } from 'payload'

const authenticated: Access = ({ req }) => Boolean(req.user)

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** Куда ложатся загруженные кадры. Тот же путь читает серверная отрисовка. */
export const CAR_PHOTOS_DIR = path.resolve(dirname, '../../media/car-photos')

/**
 * Размер, который читает satori при отрисовке картинки пригласительного: webp
 * он не понимает, поэтому кадр всегда пересохраняется в JPEG кадра 1080×1920.
 */
export const CAR_PHOTO_RASTER = 'raster'

export const CarPhotos: CollectionConfig = {
  slug: 'car-photos',
  labels: {
    singular: { ru: 'Фото автомобиля', en: 'Car photo' },
    plural: { ru: 'Фото автомобилей', en: 'Car photos' },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'brand', 'model', 'yearFrom', 'yearTo', 'active'],
    description: {
      ru: 'Кадры автомобилей для пригласительных. Кадр подбирается по марке, модели и году: чем точнее совпадение, тем выше приоритет. Загруженный сюда кадр перекрывает встроенный.',
      en: 'Car frames for the certificates, matched by brand, model and year.',
    },
  },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  defaultSort: 'brand',
  upload: {
    staticDir: CAR_PHOTOS_DIR,
    mimeTypes: ['image/*'],
    crop: false,
    focalPoint: false,
    imageSizes: [
      {
        // Кадр пригласительного: 360×640 макета, увеличенные втрое.
        name: CAR_PHOTO_RASTER,
        width: 1080,
        height: 1920,
        position: 'centre',
        formatOptions: { format: 'jpeg', options: { quality: 82 } },
      },
      { name: 'thumbnail', width: 320, position: 'centre' },
    ],
    adminThumbnail: 'thumbnail',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: { ru: 'Название', en: 'Title' },
      admin: {
        description: {
          ru: 'Только для списка в админке. Пусто — соберётся из марки и модели.',
          en: 'Admin list label only.',
        },
      },
      hooks: {
        beforeChange: [
          ({ value, siblingData }) =>
            (typeof value === 'string' && value.trim()) ||
            [siblingData?.brand, siblingData?.model].filter(Boolean).join(' ') ||
            'Кадр без марки',
        ],
      },
    },
    {
      name: 'brand',
      type: 'text',
      required: true,
      index: true,
      label: { ru: 'Марка', en: 'Brand' },
      admin: {
        description: {
          ru: 'Как в заявке: Toyota, Lexus, Subaru…',
          en: 'As it comes from the lookup: Toyota, Lexus, Subaru…',
        },
      },
    },
    {
      name: 'model',
      type: 'text',
      index: true,
      label: { ru: 'Модель', en: 'Model' },
      admin: {
        description: {
          ru: 'Пусто — кадр подойдёт любой модели этой марки. «RX» подойдёт и RX 350, и RX 300.',
          en: 'Empty matches any model of the brand.',
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'yearFrom',
          type: 'number',
          min: 1900,
          max: 2100,
          label: { ru: 'Год выпуска с', en: 'Year from' },
          admin: {
            width: '50%',
            description: {
              ru: 'Пусто — кадр подходит любому году',
              en: 'Empty matches any year',
            },
          },
        },
        {
          name: 'yearTo',
          type: 'number',
          min: 1900,
          max: 2100,
          label: { ru: 'Год выпуска по', en: 'Year to' },
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'plate',
      type: 'group',
      label: { ru: 'Рамка госномера', en: 'Plate box' },
      admin: {
        description: {
          ru: 'Куда на кадре печатается номер гостя — в процентах от размера фотографии. Значения по умолчанию подходят кадрам из макета: автомобиль стоит в центре на подъёмнике.',
          en: 'Where the guest plate is printed, in percent of the photo size.',
        },
      },
      fields: [
        {
          name: 'hidden',
          type: 'checkbox',
          defaultValue: false,
          label: { ru: 'Не печатать номер на кадре', en: 'Do not print the plate' },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'x',
              type: 'number',
              defaultValue: 40.2,
              min: 0,
              max: 100,
              label: { ru: 'Левый край, %', en: 'Left, %' },
              admin: { width: '33%' },
            },
            {
              name: 'y',
              type: 'number',
              defaultValue: 61.7,
              min: 0,
              max: 100,
              label: { ru: 'Верхний край, %', en: 'Top, %' },
              admin: { width: '33%' },
            },
            {
              name: 'width',
              type: 'number',
              defaultValue: 16.7,
              min: 1,
              max: 100,
              label: { ru: 'Ширина, %', en: 'Width, %' },
              admin: { width: '33%' },
            },
          ],
        },
      ],
    },
    {
      name: 'active',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      index: true,
      label: { ru: 'Использовать на сайте', en: 'Visible on site' },
    },
  ],
  timestamps: true,
}
