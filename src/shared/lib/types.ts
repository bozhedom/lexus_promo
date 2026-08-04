export type CarDataSource = 'api' | 'manual'

export type ApplicationStatus =
  | 'draft_plate'
  | 'draft_car'
  | 'draft_personal'
  | 'completed'

// Данные воронки, которые копятся на клиенте и переживают F5 (sessionStorage)
export interface FunnelData {
  applicationId?: string
  plateNumber?: string
  carBrand?: string
  carModel?: string
  carYear?: number | null
  carDataSource?: CarDataSource
  fullName?: string
  phone?: string
  status?: ApplicationStatus
  certificateCode?: string
  certificateAmount?: number
}

export type CarInfo =
  /** Марка известна всегда; модель и год внешний API отдаёт не для каждой машины. */
  | { found: true; brand: string; model: string | null; year: number | null }
  | { found: false }

export interface Utm {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
}
