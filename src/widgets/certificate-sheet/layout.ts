export type CertificateKind = 'diagnostics' | 'gift'

export const isToyota = (brand: string) => /toyota|тойота/i.test(brand)

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
 * Кадр и адрес пригласительного. У диагностики фотография зависит от марки:
 * на ней стоит автомобиль гостя, и поверх печатается его госномер. Для чужих
 * марок базой служит Lexus — так же, как и на экране найденного автомобиля.
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
      plate: { x: 448 / 1080, y: 1236 / 1920, w: 171 / 1080 },
    }
  }
  return {
    photo: '/images/cert/bg-diagnostics-lexus.webp',
    photoRaster: 'images/cert/bg-diagnostics-lexus.jpg',
    address: DIAGNOSTICS_ADDRESS,
    plate: { x: 439 / 1080, y: 1162 / 1920, w: 197 / 1080 },
  }
}

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
 * Имя и отчество ставятся в две строки, как в макете. Короткая подпись
 * («Ваше имя») остаётся одной строкой: в две она выглядит как обрывок.
 */
export function splitGuestName(name: string): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const whole = words.join(' ')
  if (words.length < 2 || whole.length <= 13) return [whole || 'Ваше имя']
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
