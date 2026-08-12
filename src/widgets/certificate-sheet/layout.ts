export type CertificateKind = 'diagnostics' | 'gift'

export const isToyota = (brand: string) => /toyota|тойота/i.test(brand)
export const isLexus = (brand: string) => /lexus|лексус/i.test(brand)

/**
 * Общие константы пригласительного. Живут отдельно от разметки, потому что по
 * ним рисуются оба представления: экранное (CertificateSheet) и картинка для
 * мессенджеров (server/certificateImage). Расходиться им нельзя — гость
 * сравнивает превью в модалке с тем, что пришло в чат.
 */
export const CERT_LAYOUT = {
  /** Ширина кадра макета: все размеры разметки заданы в её долях. */
  width: 360,
  /** Высота кадра макета. Выше кадр тянется за счёт зазоров вокруг марки. */
  height: 640,
  phone: '+7 (423) 2222-999',
} as const

/** Рамка госномера на кадре автомобиля — доли от размеров фотографии. */
interface PlateBox {
  x: number
  y: number
  w: number
}

interface CertificateFace {
  photo: string
  /** Тот же кадр в JPEG: satori в серверной картинке не читает webp. */
  photoRaster: string
  address: string[]
  plate: PlateBox | null
}

const DIAGNOSTICS_ADDRESS = ['Снеговая, 1', '«Таксопарк»']
const GIFT_ADDRESS = ['Шилкинская, 32а']

/**
 * Кадр и адрес пригласительного. У диагностики фотография зависит от марки: на
 * ней стоит автомобиль гостя, и поверх печатается его настоящий госномер.
 *
 * Марок техцентра две, а приезжают на любых: для всех остальных берётся кадр
 * без марки — обычный автомобиль в студии, чтобы пригласительный не обещал
 * чужому владельцу Lexus.
 */
export function certificateFace(kind: CertificateKind, brand: string): CertificateFace {
  if (kind === 'gift') {
    return {
      photo: '/images/cert/bg-gift.webp',
      photoRaster: 'images/cert/bg-gift.jpg',
      address: GIFT_ADDRESS,
      plate: null,
    }
  }
  if (isToyota(brand)) {
    return {
      photo: '/images/cert/bg-diagnostics-toyota.webp',
      photoRaster: 'images/cert/bg-diagnostics-toyota.jpg',
      address: DIAGNOSTICS_ADDRESS,
      // на кадре Land Cruiser вместо номера шильд: рамка ниже и чуть уже
      plate: { x: 451 / 1080, y: 1148 / 1920, w: 182 / 1080 },
    }
  }
  if (isLexus(brand)) {
    return {
      photo: '/images/cert/bg-diagnostics-lexus.webp',
      photoRaster: 'images/cert/bg-diagnostics-lexus.jpg',
      address: DIAGNOSTICS_ADDRESS,
      plate: { x: 440 / 1080, y: 1163 / 1920, w: 195 / 1080 },
    }
  }
  // Кадр без марки: тот же автомобиль на подъёмнике, что и у остальных, но с
  // затёртыми шильдиками — на нём стоят рамка знака и стойки в тех же местах,
  // что у Lexus, поэтому и координаты знака совпадают.
  return {
    photo: '/images/cert/bg-diagnostics-default.webp',
    photoRaster: 'images/cert/bg-diagnostics-default.jpg',
    address: DIAGNOSTICS_ADDRESS,
    plate: { x: 440 / 1080, y: 1163 / 1920, w: 195 / 1080 },
  }
}

/**
 * Обложка слайда подарка на экране найденного автомобиля (41:3817, 41:3810).
 *
 * Кадр один на оба слайда: золотой бант, прижатый к правому краю карточки.
 * Марка на обложке больше не отыгрывается — она осталась только внутри самого
 * пригласительного, где на фотографии стоит автомобиль гостя.
 */
export const PREVIEW_COVER = '/images/cert/preview-bow.webp'

interface CertificateCopy {
  eyebrow: string[]
  title: string[]
  /** Сумма набирается крупно, поэтому у неё свой размер. */
  amount: boolean
  note: string
}

export function certificateCopy(kind: CertificateKind, amount: number): CertificateCopy {
  if (kind === 'gift') {
    return {
      eyebrow: ['Ваш персональный сертификат', 'на первую замену масла'],
      title: [`${new Intl.NumberFormat('ru-RU').format(amount)} ₽`],
      amount: true,
      note: 'в честь знакомства',
    }
  }
  return {
    eyebrow: ['Ваш персональный сертификат'],
    title: ['Бесплатная диагностика', 'ходовой части'],
    amount: false,
    note: 'при последующем ремонте',
  }
}

/**
 * Имя и отчество ставятся в две строки, как в макете (34:2516). Отчество не
 * обязательно: одно имя остаётся одной строкой (34:2612), а подпись-заглушка
 * «Ваше имя» разбивается по словам, как её нарисовали в 34:2566.
 */
export function splitGuestName(name: string): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['Ваше', 'имя']
  if (words.length === 1) return [words[0]!]
  return [words[0]!, words.slice(1).join(' ')]
}

/** Госномер разбирается на буквы и цифры: на настоящем знаке цифры крупнее. */
export function plateParts(plate: string) {
  const clean = plate.replace(/\s+/g, '').toUpperCase()
  const match = clean.match(/^([А-ЯA-Z])(\d{3})([А-ЯA-Z]{2})(\d{2,3})$/)
  if (!match) return null
  return { first: match[1]!, digits: match[2]!, last: match[3]!, region: match[4]! }
}

/** «А 555 АА 125» — как номер подписан над автомобилем. */
export function formatPlateLine(plate: string): string {
  const parts = plateParts(plate)
  if (!parts) return plate.trim().toUpperCase()
  return `${parts.first} ${parts.digits} ${parts.last} ${parts.region}`
}
