import type { Access, CollectionConfig } from 'payload'

const authenticated: Access = ({ req }) => Boolean(req.user)

export const APPLICATION_STATUSES = [
  'draft_plate',
  'draft_car',
  'draft_personal',
  'completed',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const Applications: CollectionConfig = {
  slug: 'applications',
  labels: {
    singular: { ru: 'Заявка', en: 'Application' },
    plural: { ru: 'Заявки', en: 'Applications' },
  },
  admin: {
    useAsTitle: 'plateNumber',
    defaultColumns: ['plateNumber', 'status', 'fullName', 'phone', 'carBrand', 'createdAt'],
    listSearchableFields: ['plateNumber', 'phone', 'fullName', 'email'],
    components: {
      beforeListTable: ['/components/admin/ExportApplicationsButton#ExportApplicationsButton'],
    },
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft_plate',
      index: true,
      options: [
        { label: { ru: 'Черновик: номер', en: 'Draft: plate' }, value: 'draft_plate' },
        { label: { ru: 'Черновик: авто', en: 'Draft: car' }, value: 'draft_car' },
        { label: { ru: 'Черновик: личные данные', en: 'Draft: personal' }, value: 'draft_personal' },
        { label: { ru: 'Завершена', en: 'Completed' }, value: 'completed' },
      ],
      label: { ru: 'Статус', en: 'Status' },
    },
    {
      name: 'plateNumber',
      type: 'text',
      index: true,
      label: { ru: 'Госномер', en: 'Plate number' },
    },
    { name: 'carBrand', type: 'text', label: { ru: 'Марка', en: 'Brand' } },
    { name: 'carModel', type: 'text', label: { ru: 'Модель', en: 'Model' } },
    {
      name: 'carYear',
      type: 'number',
      min: 1950,
      max: 2100,
      label: { ru: 'Год выпуска', en: 'Year' },
    },
    {
      name: 'carDataSource',
      type: 'select',
      options: [
        { label: { ru: 'Определён по номеру (API)', en: 'API lookup' }, value: 'api' },
        { label: { ru: 'Введён вручную', en: 'Manual input' }, value: 'manual' },
      ],
      label: { ru: 'Источник данных об авто', en: 'Car data source' },
    },
    { name: 'fullName', type: 'text', label: { ru: 'Имя', en: 'Full name' } },
    { name: 'phone', type: 'text', index: true, label: { ru: 'Телефон', en: 'Phone' } },
    { name: 'email', type: 'email', label: 'Email' },
    {
      name: 'consentGiven',
      type: 'checkbox',
      defaultValue: false,
      label: { ru: 'Согласие на обработку ПД', en: 'PD consent' },
    },
    {
      name: 'sessionId',
      type: 'text',
      index: true,
      admin: {
        description: {
          ru: 'Анонимный идентификатор сессии посетителя. Используется для защиты заявки от чужих изменений и для склейки с событиями аналитики.',
          en: 'Anonymous visitor session id. Guards the application from foreign updates and links analytics events.',
        },
      },
      label: { ru: 'ID сессии', en: 'Session ID' },
    },
    {
      type: 'row',
      fields: [
        { name: 'utmSource', type: 'text', label: 'UTM source' },
        { name: 'utmMedium', type: 'text', label: 'UTM medium' },
        { name: 'utmCampaign', type: 'text', label: 'UTM campaign' },
      ],
    },
  ],
  timestamps: true,
}
