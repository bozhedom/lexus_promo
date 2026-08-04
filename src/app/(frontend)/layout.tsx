import type { Metadata, Viewport } from 'next'
import React from 'react'

import { AnalyticsScripts } from '@/shared/analytics'
import { fontVariables } from '@/shared/config/fonts'
import { FunnelProvider } from '@/shared/lib/funnel'
import { StageTransitionProvider } from '@/widgets/curtain-transition'
import './globals.scss'

export const metadata: Metadata = {
  title: 'Персональный пригласительный на тех. открытие автоцентра',
  description:
    'Получите персональный пригласительный и подарок в честь знакомства с новым автоцентром.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={fontVariables}>
      <body>
        <FunnelProvider>
          <StageTransitionProvider>{children}</StageTransitionProvider>
        </FunnelProvider>
        <AnalyticsScripts />
      </body>
    </html>
  )
}
