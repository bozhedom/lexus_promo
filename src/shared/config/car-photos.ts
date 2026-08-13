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
 * Кадры из макета (фрейм 47:1084). Модельные идут первыми только для
 * читаемости — порядок в подборе почти не участвует, всё решает счёт
 * совпадения.
 *
 * Поколения одной модели разводятся годом выпуска: у нового кадра годов нет,
 * поэтому он же достаётся автомобилю с неизвестным годом, а старому проставлен
 * верхний год. В каталоге модель называется без поколения («RAV4», «LX»,
 * «Land Cruiser Prado»), и по-другому их не различить.
 */
export const BUILTIN_CAR_PHOTOS: CarPhoto[] = [
  car('Lexus', 'RX', 'lexus-rx-350', 947),
  car('Lexus', 'NX', 'lexus-nx-200', 953),
  car('Lexus', 'LX', 'lexus-lx-600', 995),
  car('Lexus', 'LX', 'lexus-lx-570', 1005, [null, 2021]),
  car('Lexus', 'GX', 'lexus-gx-550', 960),
  car('Toyota', 'Land Cruiser 300', 'toyota-land-cruiser-300', 961),
  car('Toyota', 'Land Cruiser 250', 'toyota-land-cruiser-250', 947),
  car('Toyota', 'Land Cruiser 200', 'toyota-land-cruiser-200', 947),
  car('Toyota', 'Land Cruiser 100', 'toyota-land-cruiser-100', 965),
  car('Toyota', 'Land Cruiser Prado', 'toyota-land-cruiser-prado-150', 947),
  car('Toyota', 'Land Cruiser Prado', 'toyota-land-cruiser-prado-120', 985, [null, 2009]),
  car('Toyota', 'RAV4', 'toyota-rav4', 947),
  car('Toyota', 'RAV4', 'toyota-rav4-2013', 947, [null, 2018]),
  car('Toyota', 'Harrier', 'toyota-harrier-2020', 947),
  car('Toyota', 'Harrier', 'toyota-harrier-2016', 985, [null, 2019]),
  car('Toyota', 'Corolla Cross', 'toyota-corolla-cross', 947),
  car('Toyota', 'Alphard', 'toyota-alphard', 1003),
  car('Subaru', 'Forester', 'subaru-forester', 947),
  car('Subaru', 'XV', 'subaru-xv', 947),
  car('Subaru', 'Impreza', 'subaru-impreza', 947),
  car('Subaru', 'Levorg', 'subaru-levorg', 947),
  car('Mitsubishi', 'Outlander', 'mitsubishi-outlander', 947),
  car('Mitsubishi', 'Eclipse Cross', 'mitsubishi-eclipse-cross', 947),
  // RVR и ASX — одна машина под разными именами: японская и европейская.
  car('Mitsubishi', 'RVR', 'mitsubishi-rvr', 947),
  car('Mitsubishi', 'ASX', 'mitsubishi-rvr', 947),
  car('Mitsubishi', 'Delica', 'mitsubishi-delica', 947),
  car('Mitsubishi', 'Pajero', 'mitsubishi-pajero', 980),
  car('Honda', 'Fit', 'honda-fit', 990),
  car('Honda', 'Vezel', 'honda-vezel', 985),

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
 * Насколько кадр подходит запрошенной модели. Совпадение считается по началу
 * строки: кадр «RX» подходит и «RX 350», и «RX 300», а «Land Cruiser 300» с
 * «200» не путается. `null` — кадр не подходит вовсе.
 *
 * Точность важнее длины названия. В каталоге модель называется «Land Cruiser»,
 * без поколения, и по одной длине владельцу Land Cruiser доставался кадр Prado
 * — просто потому, что «Land Cruiser Prado» длиннее.
 */
const MODEL_ANY = 0
const modelScore = (photoModel: string, requested: string): number | null => {
  const a = normalize(photoModel)
  const b = normalize(requested)
  if (!a) return MODEL_ANY
  if (!b) return null
  if (a === b) return 900
  // Кадр общее запроса: «RX» на «RX 350». Чем длиннее общее начало, тем лучше.
  if (b.startsWith(a)) return 600 + a.length
  // Кадр конкретнее запроса: «Land Cruiser 300» на «Land Cruiser». Берём
  // название, ближайшее к запросу, а не самое длинное.
  if (a.startsWith(b)) return Math.max(1, 300 - (a.length - b.length))
  return null
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
  const model = modelScore(photo.model, query.model ?? '')
  if (model == null) return null

  let value = photoBrand ? 100 : 0
  value += model
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
