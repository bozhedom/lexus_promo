import { CarNumberScreen } from '@/views/car'
import { privateScreen } from '@/shared/config/site'

export const metadata = privateScreen('Номер автомобиля')

export default function CarNumberPage() {
  return <CarNumberScreen />
}
