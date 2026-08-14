export type CarDataSource = 'api' | 'manual'

export type ApplicationStatus =
  | 'draft_plate'
  | 'draft_car'
  | 'draft_personal'
  | 'completed'

export type CarInfo =
  /** Марка известна всегда; модель и год внешний API отдаёт не для каждой машины. */
  | { found: true; brand: string; model: string | null; year: number | null }
  | { found: false }

// Данные воронки, которые копятся на клиенте и переживают F5 (sessionStorage)
export interface FunnelData {
  applicationId?: string
  plateNumber?: string
  /**
   * Ответ внешнего API по последнему введённому номеру. Запрос делает экран
   * ввода номера — тогда человек видит один загрузчик на месте кнопки, а
   * следующий экран открывается уже с готовым результатом, без второго
   * ожидания и мигания.
   */
  carLookup?: CarInfo
  carBrand?: string
  carModel?: string
  carYear?: number | null
  carDataSource?: CarDataSource
  fullName?: string
  phone?: string
  phoneVerificationToken?: string
  status?: ApplicationStatus
  certificateCode?: string
  certificateId?: string
  certificateAmount?: number
  certificateExpiresAt?: string | null
  /**
   * Номера выдачи по видам пригласительного: они напечатаны на кадре, и экран
   * показывает ровно те, что вернул сервер.
   */
  certificateSerials?: Partial<Record<'diagnostics' | 'gift', number | null>>
}

export interface Utm {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
}
