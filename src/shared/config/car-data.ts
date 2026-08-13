export const OTHER_OPTION = 'Другая'

/**
 * Марки техцентра. Они всегда стоят первыми в списке и подсвечены: остальные
 * выбрать можно, но приглашение для них другое.
 */
export const FEATURED_BRANDS = ['Toyota', 'Lexus'] as const

/**
 * Ходовые марки Приморья. Идут сразу после марок техцентра и в этом порядке:
 * до алфавита большинство гостей своё авто уже видит и не листает список.
 */
export const POPULAR_BRANDS = [
  'Nissan',
  'Honda',
  'Mazda',
  'Mitsubishi',
  'Subaru',
  'Suzuki',
  'Kia',
  'Hyundai',
  'Mercedes-Benz',
  'BMW',
  'Volkswagen',
  'Land Rover',
] as const

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export function isFeaturedBrand(brand: string): boolean {
  return FEATURED_BRANDS.some((item) => same(item, brand))
}

export function isPopularBrand(brand: string): boolean {
  return POPULAR_BRANDS.some((item) => same(item, brand))
}

export interface CarCatalogEntry {
  brand: string
  models: string[]
}

/**
 * Каталог до ответа админки и при временной недоступности БД.
 *
 * У Toyota и Lexus модели перечислены полностью: это профиль техцентра. У
 * ходовых марок — те модели, под которые в макете есть кадр пригласительного:
 * выбранная из списка модель совпадает с кадром по написанию, а вписанная
 * руками — как повезёт. Остальные марки ведутся уже в админке, а до этого
 * модель вписывается вручную: держать в коде несколько сотен наименований
 * смысла нет, а выбрать свою машину человек должен в любом случае.
 */
export const DEFAULT_CAR_CATALOG: CarCatalogEntry[] = [
  {
    brand: 'Toyota',
    models: [
      'Camry',
      'Corolla',
      'Corolla Cross',
      'RAV4',
      'Harrier',
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
  // У ходовых марок перечислены модели, под которые есть кадр пригласительного:
  // остальные по-прежнему вписываются через «Другое».
  { brand: 'Honda', models: ['Fit', 'Vezel'] },
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
  { brand: 'Mitsubishi', models: ['Outlander', 'Eclipse Cross', 'RVR', 'ASX', 'Delica', 'Pajero'] },
  { brand: 'Nissan', models: [] },
  { brand: 'Omoda', models: [] },
  { brand: 'Opel', models: [] },
  { brand: 'Peugeot', models: [] },
  { brand: 'Porsche', models: [] },
  { brand: 'Renault', models: [] },
  { brand: 'Skoda', models: [] },
  { brand: 'Subaru', models: ['Forester', 'XV', 'Impreza', 'Levorg'] },
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

const orderIn = (list: readonly string[], brand: string) =>
  list.findIndex((item) => same(item, brand))

/**
 * Три группы подряд: марки техцентра (Toyota, Lexus), затем ходовые марки в
 * своём порядке, затем весь остальной каталог по алфавиту. Порядок не зависит
 * от того, пришёл каталог из админки или из кода.
 */
export function carBrands(catalog: CarCatalogEntry[]): string[] {
  const featured: string[] = []
  const popular: string[] = []
  const rest: string[] = []
  for (const { brand } of catalog) {
    if (isFeaturedBrand(brand)) featured.push(brand)
    else if (isPopularBrand(brand)) popular.push(brand)
    else rest.push(brand)
  }
  featured.sort((a, b) => orderIn(FEATURED_BRANDS, a) - orderIn(FEATURED_BRANDS, b))
  popular.sort((a, b) => orderIn(POPULAR_BRANDS, a) - orderIn(POPULAR_BRANDS, b))
  // Латиница идёт перед кириллицей: иначе «ВАЗ», «ГАЗ» и «УАЗ» встают сразу
  // под выделенными группами и выглядят как их продолжение.
  const cyrillic = (brand: string) => (/^[А-Яа-яЁё]/.test(brand) ? 1 : 0)
  rest.sort((a, b) => cyrillic(a) - cyrillic(b) || a.localeCompare(b, 'ru'))
  return [...featured, ...popular, ...rest]
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
