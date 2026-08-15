import { CarInfoScreen } from '@/views/car'
import { privateScreen } from '@/shared/config/site'

interface CarInfoPageProps {
  searchParams: Promise<{ manual?: string }>
}

export const metadata = privateScreen('Ваш автомобиль')

export default async function CarInfoPage({ searchParams }: CarInfoPageProps) {
  const { manual } = await searchParams
  return <CarInfoScreen manualRequested={manual === '1'} />
}
