import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { ImageResponse } from 'next/og'

import { SITE_NAME } from '@/shared/config/site'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Персональный пригласительный на тех. открытие автоцентра'

const asset = (relative: string) => path.join(process.cwd(), relative)

/**
 * Карточка ссылки для мессенджеров: воронку рассылают в Telegram, MAX и
 * WhatsApp, и превью гость видит раньше самого сайта. Собрана из тех же золота
 * и шрифта, что и сам пригласительный, но без данных гостя — карточку видят все,
 * кому переслали ссылку.
 */
export default async function OpengraphImage() {
  const [crown, forum, condensed] = await Promise.all([
    readFile(asset('public/images/cert/crown.svg')).then(
      (file) => `data:image/svg+xml;base64,${file.toString('base64')}`,
    ),
    readFile(asset('public/fonts/forum.ttf')),
    readFile(asset('public/fonts/roboto-condensed-400.ttf')),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          fontFamily: 'RobotoCondensed',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            width: 1152,
            height: 582,
            border: '1px solid #7b7254',
            borderRadius: 20,
          }}
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={crown} alt="" width={94} height={71} />

        <div
          style={{
            display: 'flex',
            marginTop: 34,
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: 7,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.82)',
          }}
        >
          Персональное приглашение
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 26,
            fontFamily: 'Forum',
            fontSize: 82,
            lineHeight: 1.05,
            backgroundImage: 'linear-gradient(90deg, #9a7b56 0%, #e4ccae 52%, #7b7254 100%)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          на техническое открытие
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 30,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: 8,
            textTransform: 'uppercase',
            color: '#e0c7a9',
          }}
        >
          {SITE_NAME}
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 22,
            fontSize: 24,
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          Toyota и Lexus · подарок в честь знакомства
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Forum', data: forum, weight: 400, style: 'normal' },
        { name: 'RobotoCondensed', data: condensed, weight: 400, style: 'normal' },
      ],
    },
  )
}
