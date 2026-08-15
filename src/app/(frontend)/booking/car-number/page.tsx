import { CarNumberScreen } from '@/views/car'
import { privateScreen } from '@/shared/config/site'

export const metadata = privateScreen('Запись в сервис: номер автомобиля')

// Ветка записи на сервис: экран тот же, отличается только путь дальше.
export default function BookingCarNumberPage() {
  return <CarNumberScreen flow="booking" />
}
