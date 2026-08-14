import { CarInfoScreen } from '@/views/car'

interface BookingCarInfoPageProps {
  searchParams: Promise<{ manual?: string }>
}

// Ветка записи на сервис: подтверждённый автомобиль уводит на запись, а не на
// личные данные.
export default async function BookingCarInfoPage({ searchParams }: BookingCarInfoPageProps) {
  const { manual } = await searchParams
  return <CarInfoScreen manualRequested={manual === '1'} flow="booking" />
}
