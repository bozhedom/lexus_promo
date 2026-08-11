import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { ImageResponse } from 'next/og'

import type { PersonalInviteDetails } from '../model/types'

/**
 * Пригласительные сертификаты как картинки.
 *
 * Формат 1080×1620 (2:3) выбран под мессенджеры: WhatsApp и Telegram
 * показывают такую пропорцию в переписке целиком, без обрезки превью, а более
 * вытянутый кадр макета (360×800) они бы кадрировали. Композиция макета
 * сохранена, сжаты только вертикальные промежутки.
 */
export const CERT_WIDTH = 1080
export const CERT_HEIGHT = 1620

export type CertificateKind = 'diagnostics' | 'gift'

const asset = (relative: string) => path.join(process.cwd(), 'public', relative)

const dataUrl = async (relative: string, mime = 'image/png') => {
  const file = await readFile(asset(relative))
  return `data:${mime};base64,${file.toString('base64')}`
}

const GOLD = '#cbab7b'
const GOLD_LIGHT = '#e4ccae'
const GOLD_DIM = '#a98e63'

// Кадр автомобиля на подъёмнике снят под каждую марку отдельно. Рамка номерного
// знака на фотографии задана долями от размеров исходника: поверх неё рисуется
// настоящий номер гостя.
const CARS = {
  lexus: {
    image: 'images/cert-lift-lexus.png',
    plate: { x: 0.4064, y: 0.5378, w: 0.1717, h: 0.0169 },
  },
  toyota: {
    image: 'images/cert-lift-toyota.png',
    // у Land Cruiser на этом кадре шильд, а не номер: рамка чуть выше и ниже
    plate: { x: 0.414, y: 0.5572, w: 0.161, h: 0.0186 },
  },
} as const

const CAR_SRC_W = 711
const CAR_SRC_H = 1536

// Ширина кадра машины внутри полосы. Меньше полной ширины сертификата, потому
// что иначе автомобиль в полосу по высоте не помещается; фон исходника чёрный,
// поэтому стык не виден.
const CAR_W = 760
const CAR_H = Math.round((CAR_W * CAR_SRC_H) / CAR_SRC_W)
const CAR_LEFT = Math.round((CERT_WIDTH - CAR_W) / 2)
/** Верх видимой части исходника: над крышей остаётся немного воздуха. */
const CAR_OFFSET = Math.round(0.328 * CAR_H)
const BAND_TOP = 640
const BAND_H = 640

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value

const brandOf = (brand: string): keyof typeof CARS =>
  /toyota|тойота/i.test(brand) ? 'toyota' : 'lexus'

/** Госномер разбирается на буквы и цифры: на знаке цифры крупнее. */
function plateParts(plate: string) {
  const clean = plate.replace(/\s+/g, '').toUpperCase()
  const match = clean.match(/^([А-ЯA-Z])(\d{3})([А-ЯA-Z]{2})(\d{2,3})$/)
  if (!match) return null
  return { first: match[1], digits: match[2], last: match[3], region: match[4] }
}

interface CertificateCopy {
  eyebrow: string
  title: string
  note: string
}

function copyFor(kind: CertificateKind, amount: number): CertificateCopy {
  if (kind === 'gift') {
    return {
      eyebrow: 'Ваш персональный подарок',
      title: 'Сертификат в честь знакомства',
      note: `подарок ${new Intl.NumberFormat('ru-RU').format(amount)} ₽ для вашего автомобиля`,
    }
  }
  return {
    eyebrow: 'Ваш персональный подарок',
    title: 'Сертификат на диагностику',
    note: 'в честь знакомства',
  }
}

export async function renderCertificate(
  kind: CertificateKind,
  details: PersonalInviteDetails,
  fileName: string,
) {
  const car = CARS[brandOf(details.brand)]
  const isToyota = brandOf(details.brand) === 'toyota'

  const [carSrc, lexusLogo, qr, forum, condensed, condensedBold] = await Promise.all([
    dataUrl(car.image),
    dataUrl('images/redesign/lexus-logo.png'),
    dataUrl('images/redesign/qr-contact.png'),
    readFile(asset('fonts/forum.ttf')),
    readFile(asset('fonts/roboto-condensed-400.ttf')),
    readFile(asset('fonts/roboto-condensed-700.ttf')),
  ])

  const words = details.fullName.trim().split(/\s+/).filter(Boolean).map(capitalize)
  const nameLines = words.length > 1 ? [words[0], words.slice(1).join(' ')] : [words[0] ?? '']
  const nameSize = Math.max(64, Math.min(104, Math.round(980 / Math.max(...nameLines.map((l) => l.length), 1) * 1.35)))

  const plate = plateParts(details.plate)
  const plateBox = {
    left: CAR_LEFT + Math.round(car.plate.x * CAR_W),
    width: Math.round(car.plate.w * CAR_W),
    top: BAND_TOP + Math.round(car.plate.y * CAR_H) - CAR_OFFSET,
    height: Math.round(car.plate.h * CAR_H),
  }
  // высоту приводим к пропорции настоящего знака и центрируем в рамке кадра
  const plateH = Math.round(plateBox.width / 4.64)
  const plateTop = plateBox.top + Math.round((plateBox.height - plateH) / 2)

  const copy = copyFor(kind, details.amount)
  const carLine = [details.brand, details.model, details.year].filter(Boolean).join(' ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          background:
            'radial-gradient(circle at 50% 14%, rgba(203,171,123,0.16), transparent 42%), linear-gradient(180deg, #050403 0%, #000 58%, #050403 100%)',
          color: '#f3efe8',
          fontFamily: 'RobotoCondensed',
        }}
      >
        {/* Полоса с автомобилем стоит первой: все подписи абсолютные, а порядок
            в разметке задаёт порядок отрисовки, и градиент полосы иначе
            закрашивает текст под маркой. */}
        <div
          style={{
            position: 'absolute',
            top: BAND_TOP,
            left: 0,
            width: CERT_WIDTH,
            height: BAND_H,
            display: 'flex',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* next/image внутри ImageResponse не работает */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={carSrc}
            alt=""
            width={CAR_W}
            height={CAR_H}
            style={{ marginTop: -CAR_OFFSET }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            top: BAND_TOP,
            left: 0,
            width: CERT_WIDTH,
            height: BAND_H,
            display: 'flex',
            background:
              'linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 15%, rgba(0,0,0,0) 80%, #000 100%)',
          }}
        />

        {/* настоящий номер гостя поверх кадра */}
        {plate && (
          <div
            style={{
              position: 'absolute',
              left: plateBox.left,
              top: plateTop,
              width: plateBox.width,
              height: plateH,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              background: '#f2f2ef',
              border: '1px solid #23231f',
              borderRadius: 3,
              color: '#111',
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: plateH * 0.5 }}>{plate.first}</span>
            <span style={{ fontSize: plateH * 0.68 }}>{plate.digits}</span>
            <span style={{ fontSize: plateH * 0.5 }}>{plate.last}</span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                height: plateH - 6,
                marginLeft: 3,
                paddingLeft: 4,
                borderLeft: '1px solid #23231f',
                fontSize: plateH * 0.44,
              }}
            >
              {plate.region}
            </span>
          </div>
        )}

        {/* корона */}
        <svg
          width={64}
          height={44}
          viewBox="0 0 64 44"
          fill="none"
          stroke={GOLD_LIGHT}
          strokeWidth={2}
          strokeLinejoin="round"
          style={{ position: 'absolute', top: 58, left: 508 }}
        >
          <path d="M4 40 8 12l12 12L32 4l12 20 12-12 4 28z" />
          <path d="M4 40h56" />
        </svg>

        <div
          style={{
            position: 'absolute',
            top: 124,
            left: 0,
            width: CERT_WIDTH,
            display: 'flex',
            justifyContent: 'center',
            color: GOLD_DIM,
            fontSize: 26,
            letterSpacing: 9,
            textTransform: 'uppercase',
          }}
        >
          Персональное приглашение
        </div>

        {/* ромб-разделитель */}
        <div
          style={{
            position: 'absolute',
            top: 176,
            left: 534,
            width: 12,
            height: 12,
            background: GOLD,
            transform: 'rotate(45deg)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 206,
            left: 60,
            width: CERT_WIDTH - 120,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontFamily: 'Forum',
            fontSize: nameSize,
            lineHeight: 1.12,
            backgroundImage: `linear-gradient(90deg, ${GOLD} 0%, ${GOLD_LIGHT} 48%, #8d7550 100%)`,
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {nameLines.map((line) => (
            <span key={line} style={{ display: 'flex' }}>
              {line}
            </span>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            top: 460,
            left: 180,
            width: CERT_WIDTH - 360,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: 'rgba(255,255,255,0.82)',
            fontSize: 32,
            lineHeight: 1.42,
            textAlign: 'center',
          }}
        >
          <span style={{ display: 'flex' }}>приглашаем Вас в наш новый</span>
          <span style={{ display: 'flex' }}>специализированный техцентр</span>
        </div>

        {/* марка */}
        {isToyota ? (
          <div
            style={{
              position: 'absolute',
              top: 536,
              left: 0,
              width: CERT_WIDTH,
              display: 'flex',
              justifyContent: 'center',
              color: '#e2131a',
              fontFamily: 'RobotoCondensed',
              fontWeight: 700,
              fontSize: 62,
              letterSpacing: 6,
            }}
          >
            TOYOTA
          </div>
        ) : (
          /* next/image внутри ImageResponse не работает */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={lexusLogo}
            alt="Lexus"
            width={330}
            height={60}
            style={{ position: 'absolute', top: 536, left: 375 }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            top: 606,
            left: 0,
            width: CERT_WIDTH,
            display: 'flex',
            justifyContent: 'center',
            color: GOLD_DIM,
            fontSize: 24,
            letterSpacing: 8,
            textTransform: 'uppercase',
          }}
        >
          от «АвтоГарантСити»
        </div>

        {/* подарочная иконка над панелью */}
        <svg
          width={46}
          height={46}
          viewBox="0 0 28 30"
          fill="none"
          stroke={GOLD_LIGHT}
          strokeWidth={1.2}
          style={{ position: 'absolute', top: 1226, left: 517 }}
        >
          <path d="M14 8.5c-2.6 0-5.6-.4-6.8-1.9-1.3-1.7.3-4.2 2.7-3.6C12.3 3.6 13.5 6.2 14 8.5Z" />
          <path d="M14 8.5c2.6 0 5.6-.4 6.8-1.9 1.3-1.7-.3-4.2-2.7-3.6C15.7 3.6 14.5 6.2 14 8.5Z" />
          <rect x="0.5" y="8.5" width="27" height="5.5" rx="0.8" />
          <path d="M3 14h22v15.5H3z" />
          <path d="M14 8.5v21" />
        </svg>

        {/* панель с подарком */}
        <div
          style={{
            position: 'absolute',
            top: 1288,
            left: 78,
            width: CERT_WIDTH - 156,
            height: 176,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${GOLD}`,
            borderRadius: 26,
            background: 'rgba(0,0,0,0.86)',
          }}
        >
          <span
            style={{
              color: GOLD_DIM,
              fontSize: 22,
              letterSpacing: 7,
              textTransform: 'uppercase',
            }}
          >
            {copy.eyebrow}
          </span>
          <span
            style={{
              marginTop: 14,
              fontSize: 42,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            {copy.title}
          </span>
          <span
            style={{
              marginTop: 12,
              color: GOLD_DIM,
              fontSize: 21,
              letterSpacing: 6,
            }}
          >
            {copy.note}
          </span>
        </div>

        {/* подвал: адрес, телефон, QR */}
        <div
          style={{
            position: 'absolute',
            top: 1466,
            left: 78,
            width: CERT_WIDTH - 156,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={1.4}>
              <circle cx="12" cy="12" r="11" />
              <path d="M12 6.5c2 0 3.6 1.6 3.6 3.6 0 2.6-3.6 7.4-3.6 7.4S8.4 12.7 8.4 10.1c0-2 1.6-3.6 3.6-3.6Z" />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 22 }}>
              <span>Снеговая, 1</span>
              <span>«Таксопарк»</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={1.5}>
              <path d="M6 3h4l2 5-2.5 1.5a12 12 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3Z" />
            </svg>
            <span style={{ fontSize: 24 }}>+7 (423) 2222-999</span>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="" width={84} height={84} />
        </div>

        <div
          style={{
            position: 'absolute',
            top: 1562,
            left: 0,
            width: CERT_WIDTH,
            display: 'flex',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.46)',
            fontSize: 19,
            letterSpacing: 5,
            textTransform: 'uppercase',
          }}
        >
          {/* номер уже стоит на кадре, поэтому в подписи он не дублируется */}
          {plate || !carLine
            ? 'Действителен только для этого автомобиля'
            : `Действителен только для ${carLine}`}
        </div>
      </div>
    ),
    {
      width: CERT_WIDTH,
      height: CERT_HEIGHT,
      fonts: [
        { name: 'Forum', data: forum, weight: 400, style: 'normal' },
        { name: 'RobotoCondensed', data: condensed, weight: 400, style: 'normal' },
        { name: 'RobotoCondensed', data: condensedBold, weight: 700, style: 'normal' },
      ],
      headers: {
        'cache-control': 'private, no-store, max-age=0',
        'content-disposition': `inline; filename="${fileName}"`,
      },
    },
  )
}
