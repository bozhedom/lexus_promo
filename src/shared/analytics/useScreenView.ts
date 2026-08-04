'use client'

import { useEffect, useRef } from 'react'

import { useFunnel } from '@/shared/lib/funnel'
import type { ScreenName } from './event-names'

/**
 * Шлёт screen_view один раз за экран. Ref нужен, чтобы пересборка вида
 * занавесом и StrictMode в dev не слали повторы и не завышали статистику.
 */
export function useScreenView(screen: ScreenName): void {
  const { track, ready } = useFunnel()
  const sent = useRef<ScreenName | null>(null)

  useEffect(() => {
    if (!ready || sent.current === screen) return
    sent.current = screen
    track('screen_view', { screen })
    // экран не меняется в рамках одного маршрута
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, screen])
}
