import { CERT_WIDTH, GOLD_RULE, GOLD_WARM, centered, u } from './theme'

export function Crown({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={u(23.6)}
      height={u(17.7)}
      style={{ position: 'absolute', top: u(20.6), left: (CERT_WIDTH - u(23.6)) / 2 }}
    />
  )
}

export function Eyebrow() {
  return (
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
  )
}

/**
 * Место под имя отведено одно и то же, с отчеством и без: одна строка встаёт по
 * центру, а не жмётся к верхней черте — см. `.name` в CertificateSheet.module.scss.
 */
export function GuestName({ lines }: { lines: string[] }) {
  // Длинное отчество ужимаем, чтобы оно не упиралось в рамку кадра
  const longest = Math.max(...lines.map((line) => line.length), 1)
  const fontSize = Math.round(Math.min(u(40), (u(330) * 1.9) / longest))

  return (
    <div
      style={{
        ...centered,
        position: 'absolute',
        top: u(72),
        left: u(15),
        width: CERT_WIDTH - u(30),
        height: u(72),
        justifyContent: 'center',
        fontFamily: 'Forum',
        fontSize,
        lineHeight: 0.89,
        backgroundImage: 'linear-gradient(90deg, #9a7b56 0%, #e4ccae 52%, #7b7254 100%)',
        backgroundClip: 'text',
        color: 'transparent',
      }}
    >
      {lines.map((line) => (
        <span key={line} style={{ display: 'flex' }}>
          {line}
        </span>
      ))}
    </div>
  )
}

export function CarLine({ carLine, plateLine }: { carLine: string; plateLine: string | null }) {
  return (
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
      {carLine && <span style={{ display: 'flex' }}>{carLine}</span>}
      {carLine && plateLine && (
        <div
          style={{
            width: 1,
            height: u(13),
            marginLeft: u(9),
            marginRight: u(9),
            background: 'rgba(214,204,166,0.75)',
          }}
        />
      )}
      {plateLine && <span style={{ display: 'flex' }}>{plateLine}</span>}
    </div>
  )
}

export function InviteLines({ lines }: { lines: [string, string] }) {
  return (
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
      <span style={{ display: 'flex' }}>{lines[0]}</span>
      <span style={{ display: 'flex' }}>{lines[1]}</span>
    </div>
  )
}

/** Марка техцентра: Toyota набирается текстом, Lexus — своим логотипом. */
export function BrandMark({ toyota, lexusLogo }: { toyota: boolean; lexusLogo: string | null }) {
  if (toyota) {
    return (
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
    )
  }
  if (!lexusLogo) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={lexusLogo}
      alt="Lexus"
      width={u(144)}
      height={u(20)}
      style={{ position: 'absolute', top: u(227), left: (CERT_WIDTH - u(144)) / 2 }}
    />
  )
}

/** Чужой марке логотипа нет: на его месте стоит сам техцентр. */
export function DealerName({ ownBrand }: { ownBrand: boolean }) {
  return (
    <div
      style={{
        ...centered,
        position: 'absolute',
        top: u(ownBrand ? 253 : 227),
        left: 0,
        width: CERT_WIDTH,
        fontSize: u(ownBrand ? 9 : 19),
        fontWeight: 600,
        letterSpacing: u(ownBrand ? 2.75 : 2),
        textTransform: 'uppercase',
        color: GOLD_WARM,
      }}
    >
      {ownBrand ? 'от «АвтоГарантСити»' : '«АвтоГарантСити»'}
    </div>
  )
}
