import { BookingScreen } from '@/views/booking'
import { privateScreen } from '@/shared/config/site'

export const metadata = privateScreen('Запись в сервис')

export default function BookingAppointmentPage() {
  return <BookingScreen />
}
