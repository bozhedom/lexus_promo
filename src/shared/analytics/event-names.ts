// Единый источник имён событий аналитики. Используется клиентским трекером,
// серверным валидатором батча (@/lib/events) и коллекцией Events.

export const EVENT_NAMES = [
  'screen_view',
  'cta_click',
  'plate_submitted',
  'plate_error',
  'car_found',
  'car_not_found',
  'car_manual',
  'personal_submitted',
  'certificate_created',
  'certificate_saved',
  'outbound_click',
] as const

export type EventName = (typeof EVENT_NAMES)[number]

// Имена экранов для screen_view (payload.screen)
export type ScreenName =
  | 'welcome'
  | 'plate'
  | 'car_info'
  | 'personal'
  | 'certificate'
  | 'final'
