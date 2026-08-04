export type Channel = 'telegram' | 'max' | 'whatsapp'

export type DeliveryStatus = 'idle' | 'waiting' | 'sent' | 'failed'

export interface Certificate {
  id: string
  image: string
  alt: string
}

export interface PersonalInviteDetails {
  fullName: string
  brand: string
  model: string
  year: number | null
  plate: string
  amount: number
}

export interface InviteSession {
  code: string
  fullName: string
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
}

export interface SessionResponse {
  code: string
  certificates: Certificate[]
  channels: Record<Channel, ChannelInfo>
}

export interface StatusResponse {
  status: DeliveryStatus
  error: string | null
}
