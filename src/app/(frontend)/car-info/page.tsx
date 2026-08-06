import { CarInfoScreen } from '@/views/car'

interface CarInfoPageProps {
  searchParams: Promise<{ manual?: string }>
}

export default async function CarInfoPage({ searchParams }: CarInfoPageProps) {
  const { manual } = await searchParams
  return <CarInfoScreen manualRequested={manual === '1'} />
}
