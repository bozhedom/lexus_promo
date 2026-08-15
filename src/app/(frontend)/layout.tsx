import type { Metadata, Viewport } from 'next'
import React from 'react'

import { AnalyticsScripts } from '@/shared/analytics'
import { fontVariables } from '@/shared/config/fonts'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/shared/config/site'
import { FunnelProvider } from '@/shared/lib/funnel'
import { StageTransitionProvider } from '@/widgets/curtain-transition'
import './globals.scss'

export const metadata: Metadata = {
  // Без metadataBase Next собирает canonical и og:image относительными, а
  // мессенджеры и поиск принимают только абсолютные адреса.
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Ссылку на воронку рассылают в мессенджерах — карточка ссылки видна гостю
  // раньше самого сайта.
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: '/',
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Safari сам увеличивает страницу при фокусе на поле и обратно уже не
  // отъезжает — экран остаётся «уехавшим» до перезагрузки. maximumScale это
  // выключает; ручной pinch-zoom с iOS 10 работает всё равно.
  maximumScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={fontVariables}>
      <head>
        <link rel="preload" as="image" href="/images/redesign/intro-stage.webp" fetchPriority="high" />
        <link rel="preload" as="image" href="/images/curtain-left.webp" />
        <link rel="preload" as="image" href="/images/curtain-right.webp" />
        <link rel="preload" as="image" href="/images/logo-agc.svg" />
      </head>
      <body>
        <FunnelProvider>
          <StageTransitionProvider>{children}</StageTransitionProvider>
        </FunnelProvider>
        <AnalyticsScripts />
      </body>
    </html>
  )
}
