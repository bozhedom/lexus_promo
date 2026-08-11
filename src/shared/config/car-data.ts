export const OTHER_OPTION = 'Другая'

/**
 * Марки техцентра. Они всегда стоят первыми в списке и подсвечены: остальные
 * выбрать можно, но приглашение для них другое.
 */
export const FEATURED_BRANDS = ['Toyota', 'Lexus'] as const

export function isFeaturedBrand(brand: string): boolean {
  return FEATURED_BRANDS.some((item) => item.toLowerCase() === brand.trim().toLowerCase())
}

export interface CarCatalogEntry {
  brand: string
  models: string[]
}

/**
 * Каталог до ответа админки и при временной недоступности БД.
 *
 * У Toyota и Lexus модели перечислены полностью: это профиль техцентра. У
 * остальных марок список моделей задаётся уже в админке, а до этого модель
 * вписывается вручную — держать в коде несколько сотен наименований смысла
 * нет, а выбрать свою машину человек должен в любом случае.
 */
export const DEFAULT_CAR_CATALOG: CarCatalogEntry[] = [
  {
    brand: 'Toyota',
    models: [
      'Camry',
      'Corolla',
      'RAV4',
      'Land Cruiser',
      'Land Cruiser Prado',
      'Highlander',
      'Fortuner',
      'C-HR',
      'Avensis',
      'Vitz',
      'Alphard',
      'Hilux',
    ],
  },
  {
    brand: 'Lexus',
    models: ['RX', 'NX', 'LX', 'GX', 'ES', 'IS', 'LS', 'UX', 'GS', 'RC'],
  },
  { brand: 'Audi', models: [] },
  { brand: 'BMW', models: [] },
  { brand: 'BYD', models: [] },
  { brand: 'Cadillac', models: [] },
  { brand: 'Changan', models: [] },
  { brand: 'Chery', models: [] },
  { brand: 'Chevrolet', models: [] },
  { brand: 'Citroen', models: [] },
  { brand: 'Datsun', models: [] },
  { brand: 'Dodge', models: [] },
  { brand: 'Exeed', models: [] },
  { brand: 'Ford', models: [] },
  { brand: 'Geely', models: [] },
  { brand: 'Genesis', models: [] },
  { brand: 'GAC', models: [] },
  { brand: 'Great Wall', models: [] },
  { brand: 'Haval', models: [] },
  { brand: 'Honda', models: [] },
  { brand: 'Hyundai', models: [] },
  { brand: 'Infiniti', models: [] },
  { brand: 'Jaguar', models: [] },
  { brand: 'Jeep', models: [] },
  { brand: 'Jetour', models: [] },
  { brand: 'Kia', models: [] },
  { brand: 'Land Rover', models: [] },
  { brand: 'Li Auto', models: [] },
  { brand: 'Mazda', models: [] },
  { brand: 'Mercedes-Benz', models: [] },
  { brand: 'Mini', models: [] },
  { brand: 'Mitsubishi', models: [] },
  { brand: 'Nissan', models: [] },
  { brand: 'Omoda', models: [] },
  { brand: 'Opel', models: [] },
  { brand: 'Peugeot', models: [] },
  { brand: 'Porsche', models: [] },
  { brand: 'Renault', models: [] },
  { brand: 'Skoda', models: [] },
  { brand: 'Subaru', models: [] },
  { brand: 'Suzuki', models: [] },
  { brand: 'Tank', models: [] },
  { brand: 'Tesla', models: [] },
  { brand: 'Volkswagen', models: [] },
  { brand: 'Volvo', models: [] },
  { brand: 'Voyah', models: [] },
  { brand: 'Zeekr', models: [] },
  { brand: 'ВАЗ (Lada)', models: [] },
  { brand: 'ГАЗ', models: [] },
  { brand: 'УАЗ', models: [] },
]

export async function fetchCarCatalog(): Promise<CarCatalogEntry[]> {
  const response = await fetch('/api/car-catalog')
  if (!response.ok) throw new Error('car catalog unavailable')
  const body = (await response.json()) as { brands?: CarCatalogEntry[] }
  const configured = Array.isArray(body.brands) ? body.brands : []
  if (configured.length === 0) return DEFAULT_CAR_CATALOG
  // Админка может вести только свои марки: остальные подставляем из кода,
  // чтобы список в форме никогда не оказывался коротким.
  const known = new Set(configured.map(({ brand }) => brand.toLowerCase()))
  return [...configured, ...DEFAULT_CAR_CATALOG.filter(({ brand }) => !known.has(brand.toLowerCase()))]
}

/**
 * Toyota и Lexus всегда сверху и в своём порядке, остальные — по алфавиту.
 * Порядок не зависит от того, пришёл каталог из админки или из кода.
 */
export function carBrands(catalog: CarCatalogEntry[]): string[] {
  const featured: string[] = []
  const rest: string[] = []
  for (const { brand } of catalog) (isFeaturedBrand(brand) ? featured : rest).push(brand)
  featured.sort(
    (a, b) =>
      FEATURED_BRANDS.findIndex((item) => item.toLowerCase() === a.toLowerCase()) -
      FEATURED_BRANDS.findIndex((item) => item.toLowerCase() === b.toLowerCase()),
  )
  // Латиница идёт перед кириллицей: иначе «ВАЗ», «ГАЗ» и «УАЗ» встают сразу
  // под Toyota и Lexus и выглядят как продолжение выделенной группы.
  const cyrillic = (brand: string) => (/^[А-Яа-яЁё]/.test(brand) ? 1 : 0)
  rest.sort((a, b) => cyrillic(a) - cyrillic(b) || a.localeCompare(b, 'ru'))
  return [...featured, ...rest]
}

export function carModels(catalog: CarCatalogEntry[], brand: string): string[] {
  const list = catalog.find((item) => item.brand === brand)?.models
  return list && list.length > 0 ? [...list, OTHER_OPTION] : []
}

export function carYears(): number[] {
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let year = current; year >= 1990; year--) years.push(year)
  return years
}
