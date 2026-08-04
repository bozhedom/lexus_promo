'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

interface MetrikaPageviewsProps {
  counterId: number
}

/**
 * Досылает Метрике просмотр при переходе между экранами. Счётчик считает
 * страницу один раз при init, а App Router меняет экраны на клиенте, без
 * этого вся воронка была бы одним заходом на главную.
 */
export function MetrikaPageviews({ counterId }: MetrikaPageviewsProps) {
  const pathname = usePathname()
  const previous = useRef<string | null>(null)

  useEffect(() => {
    // первый экран Метрика посчитала сама при init
    if (previous.current === null) {
      previous.current = pathname
      return
    }
    if (previous.current === pathname) return

    const from = previous.current
    previous.current = pathname

    const ym = (window as Window & { ym?: (...args: unknown[]) => void }).ym
    if (typeof ym !== 'function') return
    // без referer переход в отчёте «Источники» выглядит прямым заходом
    ym(counterId, 'hit', window.location.href, {
      referer: window.location.origin + from,
    })
  }, [pathname, counterId])

  return null
}
