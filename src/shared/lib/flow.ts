/**
 * Две ветки воронки с общими экранами. Гость с первого экрана уходит либо за
 * пригласительным, либо записываться на сервис: номер вводится и автомобиль
 * определяется одинаково, а расходятся ветки после подтверждения автомобиля.
 *
 * Экраны номера и автомобиля одни и те же, поэтому куда идти дальше и куда
 * возвращать при прямом заходе, они спрашивают здесь, а не хранят у себя.
 */
export type FunnelFlow = 'invite' | 'booking'

export interface FlowRoutes {
  /** Ввод госномера. */
  plate: string
  /** Определённый автомобиль. */
  car: string
  /** Куда уходит гость, подтвердив автомобиль. */
  next: string
}

const ROUTES: Record<FunnelFlow, FlowRoutes> = {
  invite: { plate: '/car-number', car: '/car-info', next: '/personal' },
  booking: {
    plate: '/booking/car-number',
    car: '/booking/car-info',
    next: '/booking/appointment',
  },
}

export const flowRoutes = (flow: FunnelFlow): FlowRoutes => ROUTES[flow]
