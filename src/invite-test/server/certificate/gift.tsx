import {
  CERT_LAYOUT,
  certificateCopy,
  certificateFace,
  certificateSerial,
} from '@/widgets/certificate-sheet/layout'

import { CERT_WIDTH, GOLD_LINE, GOLD_WARM, centered, u } from './theme'

type Copy = ReturnType<typeof certificateCopy>
type Serial = ReturnType<typeof certificateSerial>
type Address = ReturnType<typeof certificateFace>['address']

/** Панель с подарком: нижний край всегда на одной линии. */
export function GiftPanel({ copy, tall }: { copy: Copy; tall: boolean }) {
  return (
    <div
      style={{
        ...centered,
        position: 'absolute',
        top: u(tall ? 460 : 466),
        left: u(48),
        width: u(264),
        height: u(tall ? 99 : 93),
        justifyContent: 'center',
        border: '1px solid #8a7250',
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
  )
}

/** Подарочная иконка разрывает рамку панели. */
export function GiftBadge({ src, tall }: { src: string; tall: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: u(tall ? 446 : 452),
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
      <img src={src} alt="" width={u(20)} height={u(22)} />
    </div>
  )
}

export function Contacts({
  address,
  marker,
  phone,
  serial,
}: {
  address: Address
  marker: string
  phone: string
  serial: Serial
}) {
  return (
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
          {address.map((line) => (
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

      {/* Номер выдачи — третий в строке контактов, см. `.certId` в
          CertificateSheet.module.scss. */}
      {serial && (
        <div style={{ display: 'flex', alignItems: 'center', gap: u(6), height: u(24) }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: u(22),
              height: u(22),
              border: `1px solid ${GOLD_LINE}`,
              borderRadius: u(11),
              fontSize: u(9),
              letterSpacing: u(0.5),
              color: GOLD_WARM,
            }}
          >
            ID
          </div>
          <div style={{ display: 'flex', letterSpacing: u(0.4) }}>
            <span style={{ display: 'flex', color: GOLD_WARM }}>{serial.letter}</span>
            <span style={{ display: 'flex', marginLeft: u(4) }}>{serial.number}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function Disclaimer() {
  return (
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
  )
}
