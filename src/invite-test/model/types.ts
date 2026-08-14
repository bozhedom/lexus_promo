import type { CertificateKind } from '@/widgets/certificate-sheet/layout'

export type Channel = 'telegram' | 'max' | 'whatsapp'

export type DeliveryStatus = 'idle' | 'waiting' | 'sent' | 'failed'

export interface Certificate {
  id: string
  /** Публичный адрес картинки: по нему её забирают MAX и WhatsApp. */
  image: string
  alt: string
  /**
   * Путь файла от корня проекта, если картинка уже сохранена в админке.
   * Telegram грузит файл напрямую, не дожидаясь, пока адрес станет доступен
   * из интернета.
   */
  file?: string
}

export interface PersonalInviteDetails {
  fullName: string
  brand: string
  model: string
  year: number | null
  plate: string
  amount: number
  /**
   * Номера выдачи — по одному на вид пригласительного. Заполняет сервер по
   * записям админки: на кадре стоит номер из базы, а не то, что прислал
   * браузер. Пусто — пригласительные ещё не выписаны.
   */
  serials?: Partial<Record<CertificateKind, number>>
}

export interface InviteSession {
  code: string
  fullName: string
  /**
   * Телефон гостя из его заявки, `+7XXXXXXXXXX`. По нему вебхук узнаёт
   * отправителя, когда кода в сообщении нет: в MAX подставить текст в диалог с
   * менеджером нельзя, и гость шлёт что угодно. Пусто — заявка не найдена, и
   * остаётся только код.
   */
  phone: string
  createdAt: number
  status: DeliveryStatus
  error: string | null
  certificates: Certificate[]
  deliveryText: string
  details: PersonalInviteDetails
}

export interface ChannelInfo {
  enabled: boolean
  /** Ссылка открывает диалог с менеджером либо официальным ботом организации. */
  chatLink: string | null
  /** Прилетят ли сертификаты автоматически. */
  autoDelivery: boolean
  /**
   * Текст с кодом уже стоит в самой ссылке — параметром `?text=` во всех трёх
   * мессенджерах. Где подставить его некуда (диалог в Telegram открыт по
   * номеру телефона), страница кладёт текст гостю в буфер обмена.
   */
  prefilled: boolean
}

export interface SessionResponse {
  code: string
  certificates: Certificate[]
  channels: Record<Channel, ChannelInfo>
  /** Текст с кодом — тот же, что подставляется в ссылку канала. */
  message: string
}

export interface StatusResponse {
  status: DeliveryStatus
  error: string | null
}
