import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { ImageResponse } from 'next/og'

import {
  CERT_LAYOUT,
  certificateCopy,
  certificateFace,
  formatPlateLine,
  isToyota,
  plateParts,
  splitGuestName,
  type CertificateKind,
} from '@/widgets/certificate-sheet/layout'

import type { PersonalInviteDetails } from '../model/types'

/**
 * Пригласительный как картинка для мессенджеров. Композиция и все размеры —
 * те же, что у экранного `CertificateSheet`: кадр 360×640 из макета, увеличенный
 * втрое. Гость сравнивает пришедшее в чат с тем, что видел в модалке, поэтому
 * расхождений быть не должно.
 */
export const CERT_SCALE = 3
export const CERT_WIDTH = CERT_LAYOUT.width * CERT_SCALE
export const CERT_HEIGHT = CERT_LAYOUT.height * CERT_SCALE

export type { CertificateKind }

/** Размер из макета в пикселях картинки. */
const u = (value: number) => value * CERT_SCALE

const asset = (relative: string) => path.join(process.cwd(), 'public', relative)

const dataUrl = async (relative: string, mime: string) => {
  const file = await readFile(asset(relative))
  return `data:${mime};base64,${file.toString('base64')}`
}

const GOLD_RULE = '#d6cca6'
const GOLD_LINE = '#7b7254'
const GOLD_WARM = '#e0c7a9'

const centered = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center' as const,
  textAlign: 'center' as const,
}

/** Черта с ромбом посередине: линии гаснут к краям кадра. */
function Rule({ top }: { top: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: u(64),
        width: u(232),
        height: u(6),
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: u(105),
          height: 1,
          background: `linear-gradient(90deg, rgba(214,204,166,0) 0%, ${GOLD_RULE} 100%)`,
        }}
      />
      <div
        style={{
          width: u(6),
          height: u(6),
          marginLeft: u(8),
          marginRight: u(8),
          background: GOLD_RULE,
          transform: 'rotate(45deg)',
        }}
      />
      <div
        style={{
          width: u(105),
          height: 1,
          background: `linear-gradient(270deg, rgba(214,204,166,0) 0%, ${GOLD_RULE} 100%)`,
        }}
      />
    </div>
  )
}

export async function renderCertificate(
  kind: CertificateKind,
  details: PersonalInviteDetails,
  fileName: string,
) {
  const face = certificateFace(kind, details.brand)
  const copy = certificateCopy(kind, details.amount)
  const toyota = isToyota(details.brand)

  const [photo, crown, gift, marker, phone, lexusLogo, forum, condensed, condensedBold] =
    await Promise.all([
      dataUrl(face.photoRaster, 'image/jpeg'),
      dataUrl('images/cert/crown.svg', 'image/svg+xml'),
      dataUrl('images/cert/gift.svg', 'image/svg+xml'),
      dataUrl('images/cert/marker.svg', 'image/svg+xml'),
      dataUrl('images/cert/phone.svg', 'image/svg+xml'),
      dataUrl('images/cert/lexus.svg', 'image/svg+xml'),
      readFile(asset('fonts/forum.ttf')),
      readFile(asset('fonts/roboto-condensed-400.ttf')),
      readFile(asset('fonts/roboto-condensed-700.ttf')),
    ])

  const nameLines = splitGuestName(details.fullName)
  // Длинное отчество ужимаем, чтобы оно не упиралось в рамку кадра
  const longest = Math.max(...nameLines.map((line) => line.length), 1)
  const nameSize = Math.round(Math.min(u(40), (u(330) * 1.9) / longest))

  const onCar = details.plate ? plateParts(details.plate) : null
  const plateW = face.plate ? Math.round(face.plate.w * CERT_WIDTH) : 0
  const plateH = Math.round(plateW / 4.64)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#000',
          color: '#fff',
          fontFamily: 'RobotoCondensed',
        }}
      >
        {/* Кадр автомобиля. next/image внутри ImageResponse не работает */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt=""
          width={CERT_WIDTH}
          height={CERT_HEIGHT}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />

        {/* настоящий номер гостя поверх знака на кадре */}
        {onCar && face.plate && (
          <div
            style={{
              position: 'absolute',
              left: Math.round(face.plate.x * CERT_WIDTH),
              top: Math.round(face.plate.y * CERT_HEIGHT),
              width: plateW,
              height: plateH,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Math.round(plateW * 0.012),
              borderRadius: Math.round(plateW * 0.012),
              background: '#f1f1ee',
              color: '#101010',
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: plateW * 0.105 }}>{onCar.first}</span>
            <span style={{ fontSize: plateW * 0.145 }}>{onCar.digits}</span>
            <span style={{ fontSize: plateW * 0.105 }}>{onCar.last}</span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                height: plateH * 0.74,
                marginLeft: plateW * 0.02,
                paddingLeft: plateW * 0.025,
                borderLeft: '1px solid rgba(16,16,16,0.55)',
                fontSize: plateW * 0.09,
              }}
            >
              {onCar.region}
            </span>
          </div>
        )}

        {/* рамка кадра */}
        <div
          style={{
            position: 'absolute',
            top: u(8),
            left: u(8),
            width: CERT_WIDTH - u(16),
            height: CERT_HEIGHT - u(16),
            border: `1px solid ${GOLD_LINE}`,
            borderRadius: u(10),
          }}
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={crown}
          alt=""
          width={u(23.6)}
          height={u(17.7)}
          style={{ position: 'absolute', top: u(20.6), left: (CERT_WIDTH - u(23.6)) / 2 }}
        />

        <div
          style={{
            ...centered,
            position: 'absolute',
            top: u(45),
            left: 0,
            width: CERT_WIDTH,
            fontSize: u(8.5),
            fontWeight: 600,
            letterSpacing: u(2.2),
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.82)',
          }}
        >
          Персональное приглашение
        </div>

        <Rule top={u(63)} />

        <div
          style={{
            ...centered,
            position: 'absolute',
            top: u(72),
            left: u(15),
            width: CERT_WIDTH - u(30),
            fontFamily: 'Forum',
            fontSize: nameSize,
            lineHeight: 0.89,
            backgroundImage: 'linear-gradient(90deg, #9a7b56 0%, #e4ccae 52%, #7b7254 100%)',
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

        <Rule top={u(147)} />

        {details.model || details.plate ? (
          <div
            style={{
              position: 'absolute',
              top: u(159),
              left: 0,
              width: CERT_WIDTH,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: u(10.8),
              fontWeight: 700,
              letterSpacing: u(0.88),
              textTransform: 'uppercase',
              color: GOLD_RULE,
            }}
          >
            <span style={{ display: 'flex' }}>
              {[details.brand, details.model].filter(Boolean).join(' ')}
            </span>
            <div
              style={{
                width: 1,
                height: u(13),
                marginLeft: u(9),
                marginRight: u(9),
                background: 'rgba(214,204,166,0.75)',
              }}
            />
            <span style={{ display: 'flex' }}>{formatPlateLine(details.plate)}</span>
          </div>
        ) : null}

        <div
          style={{
            ...centered,
            position: 'absolute',
            top: u(183),
            left: u(40),
            width: CERT_WIDTH - u(80),
            fontSize: u(14),
            lineHeight: 1.14,
            color: 'rgba(255,255,255,0.84)',
          }}
        >
          <span style={{ display: 'flex' }}>приглашаем Вас в новый</span>
          <span style={{ display: 'flex' }}>специализированный техцентр</span>
        </div>

        {/* марка техцентра */}
        {toyota ? (
          <div
            style={{
              position: 'absolute',
              top: u(227),
              left: 0,
              width: CERT_WIDTH,
              height: u(20),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: u(30),
              fontWeight: 700,
              letterSpacing: u(3),
              color: '#d82f2f',
            }}
          >
            TOYOTA
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={lexusLogo}
            alt="Lexus"
            width={u(144)}
            height={u(20)}
            style={{ position: 'absolute', top: u(227), left: (CERT_WIDTH - u(144)) / 2 }}
          />
        )}

        <div
          style={{
            ...centered,
            position: 'absolute',
            top: u(253),
            left: 0,
            width: CERT_WIDTH,
            fontSize: u(9),
            fontWeight: 600,
            letterSpacing: u(2.75),
            textTransform: 'uppercase',
            color: GOLD_WARM,
          }}
        >
          от «АвтоГарантСити»
        </div>

        {/* панель с подарком: нижний край всегда на одной линии */}
        <div
          style={{
            ...centered,
            position: 'absolute',
            top: u(kind === 'gift' ? 460 : 466),
            left: u(48),
            width: u(264),
            height: u(kind === 'gift' ? 99 : 93),
            justifyContent: 'center',
            border: `1px solid #8a7250`,
            borderRadius: u(13),
            background: 'rgba(0,0,0,0.86)',
          }}
        >
          <div
            style={{
              ...centered,
              fontSize: u(9.55),
              fontWeight: 600,
              letterSpacing: u(1.5),
              textTransform: 'uppercase',
              color: GOLD_WARM,
            }}
          >
            {copy.eyebrow.map((line) => (
              <span key={line} style={{ display: 'flex', lineHeight: 1.3 }}>
                {line}
              </span>
            ))}
          </div>
          <div
            style={{
              ...centered,
              marginTop: u(copy.amount ? 2 : 6),
              fontSize: u(copy.amount ? 30 : 14.8),
              fontWeight: 700,
              letterSpacing: u(copy.amount ? 1 : 0.3),
              lineHeight: copy.amount ? 1.13 : 1.08,
              textTransform: 'uppercase',
              color: '#f0f0ef',
            }}
          >
            {copy.title.map((line) => (
              <span key={line} style={{ display: 'flex' }}>
                {line}
              </span>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: u(5),
              fontSize: u(9.55),
              fontWeight: 600,
              letterSpacing: u(1.5),
              textTransform: 'uppercase',
              color: GOLD_WARM,
            }}
          >
            {copy.note}
          </div>
        </div>

        {/* подарочная иконка разрывает рамку панели */}
        <div
          style={{
            position: 'absolute',
            top: u(kind === 'gift' ? 446 : 452),
            left: (CERT_WIDTH - u(38)) / 2,
            width: u(38),
            height: u(22),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#060505',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gift} alt="" width={u(20)} height={u(22)} />
        </div>

        {/* контакты */}
        <div
          style={{
            position: 'absolute',
            top: u(575),
            left: 0,
            width: CERT_WIDTH,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: u(15),
            fontSize: u(10.5),
            color: 'rgba(255,255,255,0.88)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: u(4) }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={marker} alt="" width={u(24)} height={u(24)} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.18 }}>
              {face.address.map((line) => (
                <span key={line} style={{ display: 'flex' }}>
                  {line}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: u(4) }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={phone} alt="" width={u(24)} height={u(24)} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.18 }}>
              <span style={{ display: 'flex' }}>{CERT_LAYOUT.phone}</span>
              <span style={{ display: 'flex' }}>Без выходных</span>
            </div>
          </div>
        </div>

        <div
          style={{
            ...centered,
            position: 'absolute',
            top: u(615),
            left: 0,
            width: CERT_WIDTH,
            fontSize: u(7.9),
            fontWeight: 600,
            letterSpacing: u(1.16),
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Действителен только для этого автомобиля
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
