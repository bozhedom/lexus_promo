import { CarInfoScreen } from '@/views/car'
import { privateScreen } from '@/shared/config/site'

interface BookingCarInfoPageProps {
  searchParams: Promise<{ manual?: string }>
}

export const metadata = privateScreen('Запись в сервис: автомобиль')

// Ветка записи на сервис: подтверждённый автомобиль уводит на запись, а не на
// личные данные.
export default async function BookingCarInfoPage({ searchParams }: BookingCarInfoPageProps) {
  const { manual } = await searchParams
  return <CarInfoScreen manualRequested={manual === '1'} flow="booking" />
}
