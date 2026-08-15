import { plateParts } from '@/widgets/certificate-sheet/layout'

import { CERT_HEIGHT, CERT_WIDTH, GOLD_LINE, GOLD_RULE, u } from './theme'

type PlateBox = { x: number; y: number; w: number }
type PlateParts = NonNullable<ReturnType<typeof plateParts>>

/** Кадр автомобиля, обрезанный по золотой рамке. next/image внутри ImageResponse не работает. */
export function CarFrame({ photo }: { photo: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: u(8),
        left: u(8),
        width: CERT_WIDTH - u(16),
        height: CERT_HEIGHT - u(16),
        display: 'flex',
        overflow: 'hidden',
        borderRadius: u(10),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt=""
        width={CERT_WIDTH}
        height={CERT_HEIGHT}
        style={{ position: 'absolute', top: -u(8), left: -u(8) }}
      />
    </div>
  )
}

export function FrameBorder() {
  return (
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
  )
}

/** Настоящий номер гостя поверх знака на кадре. */
export function GuestPlate({ parts, box }: { parts: PlateParts; box: PlateBox }) {
  const plateW = Math.round(box.w * CERT_WIDTH)
  const plateH = Math.round(plateW / 4.64)

  return (
    <div
      style={{
        position: 'absolute',
        left: Math.round(box.x * CERT_WIDTH),
        top: Math.round(box.y * CERT_HEIGHT),
        width: plateW,
        height: plateH,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Math.round(plateW * 0.016),
        borderRadius: Math.round(plateW * 0.026),
        // Знак серее бумаги и обведён по краю — см. `.carPlate`: ровно белый
        // прямоугольник выбивался из студийного света кадра.
        border: `${Math.max(1, Math.round(plateW * 0.007))}px solid rgba(14,14,10,0.5)`,
        backgroundImage: 'linear-gradient(180deg, #eaeae7 0%, #d8d8d3 55%, #c4c4be 100%)',
        color: '#17170f',
        fontWeight: 700,
      }}
    >
      {/* Буквы и цифры одного кегля: на настоящем знаке они одной высоты, а
          разный кегль разводил их по разным базовым линиям. */}
      <span style={{ fontSize: plateW * 0.152 }}>{parts.first}</span>
      <span style={{ fontSize: plateW * 0.152 }}>{parts.digits}</span>
      <span style={{ fontSize: plateW * 0.152 }}>{parts.last}</span>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          height: plateH * 0.66,
          marginLeft: plateW * 0.022,
          paddingLeft: plateW * 0.026,
          borderLeft: '1px solid rgba(23,23,15,0.45)',
          fontSize: plateW * 0.108,
        }}
      >
        {parts.region}
      </span>
    </div>
  )
}

/** Черта с ромбом посередине: линии гаснут к краям кадра. */
export function Rule({ top }: { top: number }) {
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
