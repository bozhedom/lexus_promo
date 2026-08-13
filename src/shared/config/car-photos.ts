/**
 * Кадр автомобиля для пригласительного. Подбирается по марке, модели и году:
 * гость должен увидеть на сертификате свою машину, а не «какую-нибудь».
 *
 * Каталог складывается из двух частей: встроенные кадры из макета (лежат в
 * `public/images/cert`) и загруженные в админку («Фото автомобилей»). Правила
 * сравниваются одинаково, у записи из админки при равном счёте приоритет —
 * так менеджер может перекрыть встроенный кадр, не трогая код.
 */

/** Рамка госномера на кадре — доли от размеров фотографии. */
export interface PlateBox {
  x: number
  y: number
  w: number
}

export interface CarPhoto {
  /** Марка. Пусто — кадр подходит любой марке (запасной вариант). */
  brand: string
  /** Модель. Пусто — любая модель этой марки. */
  model: string
  /** Годы выпуска, для которых кадр подходит. `null` — любой год. */
  yearFrom: number | null
  yearTo: number | null
  /** Адрес кадра для браузера. */
  photo: string
  /**
   * Тот же кадр, который читает сервер при отрисовке картинки: satori не умеет
   * webp, поэтому здесь всегда JPEG или PNG. Путь от корня проекта.
   */
  photoRaster: string
  /** Где на кадре стоит рамка знака. `null` — номер на кадре не печатается. */
  plate: PlateBox | null
  /** Загруженные в админку кадры бьют встроенные при равном совпадении. */
  managed?: boolean
}

export interface CarQuery {
  brand: string
  model?: string | null
  year?: number | null
}

/**
 * Все кадры сняты в одной студии на одном подъёмнике, поэтому рамка знака у
 * них почти совпадает: отличается только высота, на которой у модели стоит
 * площадка под номер.
 */
const PLATE_X = 347 / 864
const PLATE_W = 144 / 864
const plateAt = (y: number): PlateBox => ({ x: PLATE_X, y: y / 1536, w: PLATE_W })

const car = (
  brand: string,
  model: string,
  slug: string,
  plateY: number,
  years?: [number | null, number | null],
): CarPhoto => ({
  brand,
  model,
  yearFrom: years?.[0] ?? null,
  yearTo: years?.[1] ?? null,
  photo: `/images/cert/cars/${slug}.webp`,
  photoRaster: `public/images/cert/cars/${slug}.jpg`,
  plate: plateAt(plateY),
})

/**
 * Кадры из макета. Модельные идут первыми только для читаемости — порядок в
 * подборе не участвует, всё решает счёт совпадения.
 */
export const BUILTIN_CAR_PHOTOS: CarPhoto[] = [
  car('Lexus', 'RX', 'lexus-rx-350', 947),
  car('Lexus', 'NX', 'lexus-nx-200', 953),
  car('Toyota', 'Land Cruiser 300', 'toyota-land-cruiser-300', 961),
  car('Toyota', 'Land Cruiser 250', 'toyota-land-cruiser-250', 947),
  car('Toyota', 'Land Cruiser 200', 'toyota-land-cruiser-200', 947),
  car('Toyota', 'Land Cruiser Prado', 'toyota-land-cruiser-prado-150', 947),
  car('Toyota', 'RAV4', 'toyota-rav4', 947),
  car('Toyota', 'Corolla Cross', 'toyota-corolla-cross', 947),
  car('Toyota', 'Alphard', 'toyota-alphard', 1003),

  // Кадры марки целиком: модель, которой нет в списке выше, получает их.
  {
    brand: 'Lexus',
    model: '',
    yearFrom: null,
    yearTo: null,
    photo: '/images/cert/bg-diagnostics-lexus.webp',
    photoRaster: 'public/images/cert/bg-diagnostics-lexus.jpg',
    plate: { x: 440 / 1080, y: 1163 / 1920, w: 195 / 1080 },
  },
  {
    brand: 'Toyota',
    model: '',
    yearFrom: null,
    yearTo: null,
    photo: '/images/cert/bg-diagnostics-toyota.webp',
    photoRaster: 'public/images/cert/bg-diagnostics-toyota.jpg',
    // на кадре Land Cruiser вместо номера шильд: рамка ниже и чуть уже
    plate: { x: 451 / 1080, y: 1148 / 1920, w: 182 / 1080 },
  },
]

/**
 * Кадр без марки: тот же автомобиль на подъёмнике, что и у остальных, но с
 * затёртыми шильдиками. Приезжают на любых марках, а обещать чужому владельцу
 * Lexus нельзя.
 */
export const FALLBACK_CAR_PHOTO: CarPhoto = {
  brand: '',
  model: '',
  yearFrom: null,
  yearTo: null,
  photo: '/images/cert/bg-diagnostics-default.webp',
  photoRaster: 'public/images/cert/bg-diagnostics-default.jpg',
  plate: { x: 440 / 1080, y: 1163 / 1920, w: 195 / 1080 },
}

/** «Land Cruiser 300» и «ЛендКрузер-300» должны сравниваться одинаково. */
const normalize = (value: string | null | undefined): string =>
  (value ?? '')
    .toLocaleLowerCase('ru-RU')
    .replace(/[\s_\-–—.]/g, '')
    .trim()

/**
 * Модель совпадает, если одна строка — начало другой. Так кадр «RX» подходит и
 * «RX 350», и «RX 300», а «Land Cruiser 300» не перепутается с «200».
 */
const modelMatches = (photoModel: string, requested: string): boolean => {
  const a = normalize(photoModel)
  const b = normalize(requested)
  if (!a) return true
  if (!b) return false
  return a.startsWith(b) || b.startsWith(a)
}

const yearMatches = (photo: CarPhoto, year: number | null | undefined): boolean => {
  if (photo.yearFrom == null && photo.yearTo == null) return true
  if (year == null) return false
  if (photo.yearFrom != null && year < photo.yearFrom) return false
  if (photo.yearTo != null && year > photo.yearTo) return false
  return true
}

/**
 * Счёт совпадения. Год важнее модели, модель важнее марки: кадр, заведённый
 * под конкретный год выпуска, обязан победить общий кадр той же модели.
 * `null` — правило не подходит вообще.
 */
function score(photo: CarPhoto, query: CarQuery): number | null {
  const photoBrand = normalize(photo.brand)
  if (photoBrand && photoBrand !== normalize(query.brand)) return null
  if (!yearMatches(photo, query.year)) return null
  if (photo.model && !modelMatches(photo.model, query.model ?? '')) return null

  let value = photoBrand ? 100 : 0
  if (photo.model) value += 1000 + normalize(photo.model).length
  if (photo.yearFrom != null || photo.yearTo != null) value += 10_000
  return value
}

/**
 * Кадр для автомобиля гостя. Записи из админки идут первым аргументом и при
 * равном счёте выигрывают у встроенных.
 */
export function matchCarPhoto(managed: CarPhoto[], query: CarQuery): CarPhoto {
  const all = [
    ...managed.map((photo) => ({ ...photo, managed: true })),
    ...BUILTIN_CAR_PHOTOS,
  ]

  let best: CarPhoto | null = null
  let bestScore = -1
  for (const photo of all) {
    const value = score(photo, query)
    if (value == null || value <= bestScore) continue
    best = photo
    bestScore = value
  }

  return best ?? FALLBACK_CAR_PHOTO
}
