import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { ImageResponse } from 'next/og'

import { getSession } from '@/invite-test/server/store'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ code: string; kind: string }>
}

const imageData = async (relativePath: string) => {
  const file = await readFile(path.join(process.cwd(), 'public', relativePath))
  return `data:image/png;base64,${file.toString('base64')}`
}

export async function GET(_request: Request, context: RouteContext) {
  const { code, kind: rawKind } = await context.params
  const kind = rawKind.replace(/\.png$/i, '')
  const session = getSession(code.toUpperCase())
  if (!session || (kind !== 'diagnostics' && kind !== 'gift')) {
    return new Response('Сертификат не найден', { status: 404 })
  }

  const { details } = session
  const car = [details.brand, details.model, details.year].filter(Boolean).join(' ')
  const amount = new Intl.NumberFormat('ru-RU').format(details.amount)
  const gift = kind === 'gift'

  if (!gift) {
    const [sceneSrc, logoSrc, qrSrc] = await Promise.all([
      imageData('images/bg-cert-lexus.png'),
      imageData('images/redesign/lexus-logo.png'),
      imageData('images/redesign/qr-contact.png'),
    ])
    const displayName = details.fullName.trim().split(/\s+/).slice(0, 2).join(' ')
    const plate = details.plate.trim().toUpperCase() || 'ВАШ НОМЕР'

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            position: 'relative',
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'hidden',
            color: '#f3efe8',
            background:
              'radial-gradient(circle at 50% 26%, rgba(195,164,109,.11), transparent 28%), linear-gradient(180deg, #040404, #000 76%, #050403)',
            fontFamily: 'sans-serif',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              bottom: 18,
              left: 18,
              display: 'flex',
              border: '2px solid #b59660',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 30,
              right: 30,
              bottom: 30,
              left: 30,
              display: 'flex',
              border: '1px solid rgba(181,150,96,.48)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: 75,
              left: 65,
              right: 65,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <span style={{ color: '#b89a68', fontSize: 18, letterSpacing: 7 }}>LEXUS</span>
            <span
              style={{
                marginTop: 18,
                fontSize: 24,
                letterSpacing: 9,
                textTransform: 'uppercase',
              }}
            >
              Персональное приглашение
            </span>
            <div
              style={{
                width: 480,
                height: 2,
                display: 'flex',
                marginTop: 23,
                background: 'linear-gradient(90deg, transparent, #b59660, transparent)',
              }}
            />
            <span
              style={{
                display: 'flex',
                maxWidth: 760,
                marginTop: 20,
                color: '#d2b98f',
                fontSize: displayName.length > 24 ? 77 : 94,
                fontWeight: 400,
                lineHeight: 0.96,
              }}
            >
              {displayName}
            </span>
            <div
              style={{
                width: 480,
                height: 2,
                display: 'flex',
                marginTop: 24,
                background: 'linear-gradient(90deg, transparent, #b59660, transparent)',
              }}
            />
            <span style={{ display: 'flex', maxWidth: 650, marginTop: 23, fontSize: 25, lineHeight: 1.28 }}>
              приглашаем Вас в наш новый специализированный техцентр
            </span>
            {/* next/image нельзя использовать внутри ImageResponse. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="Lexus" width={330} height={60} style={{ marginTop: 28 }} />
            <span
              style={{
                marginTop: 10,
                color: '#b69a6d',
                fontSize: 17,
                letterSpacing: 7,
                textTransform: 'uppercase',
              }}
            >
              от «АвтоГарантСити»
            </span>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sceneSrc}
            alt=""
            width={1510}
            height={850}
            style={{ position: 'absolute', top: 650, left: -305 }}
          />
          <div
            style={{
              position: 'absolute',
              top: 640,
              left: 0,
              right: 0,
              height: 880,
              display: 'flex',
              background: 'linear-gradient(180deg, #000 0%, transparent 13%, transparent 75%, #020202 100%)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              top: 1125,
              left: 389,
              display: 'flex',
              padding: '4px 8px 3px',
              color: '#111',
              background: '#e2e1dd',
              border: '2px solid #222',
              borderRadius: 3,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            {plate}
          </span>

          <div
            style={{
              position: 'absolute',
              top: 1300,
              left: 110,
              right: 110,
              height: 225,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 22px 20px',
              border: '2px solid #b59660',
              borderRadius: 36,
              background: 'rgba(0,0,0,.92)',
              textAlign: 'center',
            }}
          >
            <span style={{ color: '#c5a66c', fontSize: 17, letterSpacing: 7, textTransform: 'uppercase' }}>
              Ваш персональный подарок
            </span>
            <span style={{ marginTop: 15, fontSize: 36, letterSpacing: 3, textTransform: 'uppercase' }}>
              Сертификат на диагностику
            </span>
            <span style={{ marginTop: 12, color: '#b99d70', fontSize: 16, letterSpacing: 7, textTransform: 'uppercase' }}>
              в честь знакомства
            </span>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 76,
              right: 76,
              bottom: 66,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 20 }}>Снеговая, 1 · «Таксопарк»</span>
              <span style={{ fontSize: 20 }}>+7 (423) 205-50-50</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="" width={70} height={70} />
            </div>
            <span style={{ marginTop: 20, color: '#a98e63', fontSize: 14, letterSpacing: 5, textTransform: 'uppercase' }}>
              {car}
            </span>
            <span style={{ marginTop: 18, color: 'rgba(255,255,255,.54)', fontSize: 15, letterSpacing: 6, textTransform: 'uppercase' }}>
              Действителен только для этого автомобиля
            </span>
          </div>
        </div>
      ),
      {
        width: 900,
        height: 1800,
        headers: {
          'cache-control': 'private, no-store, max-age=0',
          'content-disposition': `inline; filename="${kind}-${session.code}.png"`,
        },
      },
    )
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '74px 76px 72px',
          color: '#f6f2eb',
          background: gift
            ? 'radial-gradient(circle at 78% 14%, rgba(226,170,91,.24), transparent 34%), linear-gradient(145deg, #17120d 0%, #090909 58%, #24160b 100%)'
            : 'radial-gradient(circle at 76% 12%, rgba(205,188,155,.2), transparent 34%), linear-gradient(145deg, #141616 0%, #080909 62%, #171a18 100%)',
          border: '3px solid #bba17d',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              color: '#dbc6a9',
              fontSize: 34,
              letterSpacing: 9,
              textTransform: 'uppercase',
            }}
          >
            <span style={{ fontSize: 48, letterSpacing: 6 }}>LEXUS</span>
            <span style={{ opacity: 0.48 }}>×</span>
            <span>CARWIN</span>
          </div>
          <div
            style={{
              width: 168,
              height: 2,
              marginTop: 28,
              background: 'linear-gradient(90deg, #e4ccae, transparent)',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 880 }}>
          <span
            style={{
              color: '#c4ab88',
              fontSize: 27,
              letterSpacing: 6,
              textTransform: 'uppercase',
            }}
          >
            {gift ? 'Подарок в честь знакомства' : 'Персональный сертификат'}
          </span>
          <span
            style={{
              display: 'flex',
              marginTop: 22,
              color: '#e4ccae',
              fontSize: gift ? 126 : 78,
              fontWeight: 600,
              lineHeight: 1.02,
            }}
          >
            {gift ? `${amount} ₽` : 'Комплексная диагностика'}
          </span>
          <span style={{ marginTop: 52, color: 'rgba(255,255,255,.5)', fontSize: 25 }}>
            Персонально для
          </span>
          <span style={{ marginTop: 10, fontSize: 52, fontWeight: 500, lineHeight: 1.15 }}>
            {details.fullName}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(228,204,174,.32)',
            paddingTop: 34,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: 'rgba(255,255,255,.48)', fontSize: 22 }}>Автомобиль</span>
            <span style={{ marginTop: 7, fontSize: 31 }}>{car}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {details.plate && (
              <span
                style={{
                  padding: '10px 18px',
                  border: '2px solid rgba(228,204,174,.62)',
                  borderRadius: 8,
                  fontSize: 28,
                  letterSpacing: 3,
                }}
              >
                {details.plate}
              </span>
            )}
            <span style={{ marginTop: 18, color: 'rgba(255,255,255,.42)', fontSize: 19 }}>
              Код {session.code}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      headers: {
        'cache-control': 'private, no-store, max-age=0',
        'content-disposition': `inline; filename="${kind}-${session.code}.png"`,
      },
    },
  )
}
