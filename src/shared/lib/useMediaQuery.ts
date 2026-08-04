'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Подписка на медиавыражение. Через useSyncExternalStore, а не setState в
 * эффекте: на сервере отдаёт false, а на клиенте пересчитывается сразу и
 * реагирует на смену условий, например поворот экрана или подключённую мышь.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
