import { matchCarPhoto, type CarPhoto, type CarQuery, type PlateBox } from '@/shared/config/car-photos'

export type CertificateKind = 'diagnostics' | 'gift'

export const isToyota = (brand: string) => /toyota|тойота/i.test(brand)
export const isLexus = (brand: string) => /lexus|лексус/i.test(brand)

/** Марки самого техцентра: только им пригласительный обещает «новый техцентр». */
export const isOwnBrand = (brand: string) => isToyota(brand) || isLexus(brand)

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
 * Кадр и адрес пригласительного. У диагностики фотография зависит от самого
 * автомобиля: подбором занимается каталог кадров (`shared/config/car-photos`),
 * сюда он приходит вторым аргументом — встроенные кадры плюс загруженные в
 * админку. Поверх кадра печатается настоящий госномер гостя.
 */
export function certificateFace(
  kind: CertificateKind,
  car: CarQuery,
  photos: CarPhoto[] = [],
): CertificateFace {
  if (kind === 'gift') {
    return {
      photo: '/images/cert/bg-gift.webp',
      photoRaster: 'public/images/cert/bg-gift.jpg',
      address: GIFT_ADDRESS,
      plate: null,
    }
  }

  const matched = matchCarPhoto(photos, car)
  return {
    photo: matched.photo,
    photoRaster: matched.photoRaster,
    address: DIAGNOSTICS_ADDRESS,
    plate: matched.plate,
  }
}

/**
 * «Приглашаем Вас в новый специализированный техцентр» — только для Toyota и
 * Lexus: новый техцентр открыт под них. Владельцу любой другой марки техцентр
 * не новый, а просто специализированный, поэтому слово «новый» уходит.
 */
export function inviteLines(brand: string): [string, string] {
  return [
    isOwnBrand(brand) ? 'приглашаем Вас в новый' : 'приглашаем Вас в',
    'специализированный техцентр',
  ]
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
