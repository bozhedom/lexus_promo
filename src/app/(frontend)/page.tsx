import { WelcomeScreen } from '@/views/welcome'

type BrandVariant = 'toyota' | 'lexus' | 'both'

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function resolveBrandVariant(params: Record<string, string | string[] | undefined>): BrandVariant {
  const search = Object.entries(params)
    .flatMap(([key, value]) => [key, ...(Array.isArray(value) ? value : [value ?? ''])])
    .join(' ')
    .toLowerCase()

  const toyota = search.includes('toyota')
  const lexus = search.includes('lexus')
  if (toyota && !lexus) return 'toyota'
  if (lexus && !toyota) return 'lexus'
  return 'both'
}

export default async function HomePage({ searchParams }: HomePageProps) {
  return <WelcomeScreen brand={resolveBrandVariant(await searchParams)} />
}
