import { TicketScreen } from '@/views/ticket'
import { privateScreen } from '@/shared/config/site'

export const metadata = privateScreen('Команда автомобиля')

export default function CertificatePage() {
  return <TicketScreen />
}
