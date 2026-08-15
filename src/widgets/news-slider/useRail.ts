import { useCallback, useEffect, useRef, useState } from 'react'

/** Шаг ленты — ширина карточки вместе с колоночным зазором. */
function railStep(rail: HTMLElement) {
  const first = rail.firstElementChild as HTMLElement | null
  if (!first) return null
  return first.offsetWidth + parseFloat(getComputedStyle(rail).columnGap || '0')
}

/**
 * Горизонтальная лента с прокруткой к выбранному кадру. На мобиле кадр встаёт
 * по центру, на десктопе стрелки шагают видимым экраном карточек.
 */
export function useRail(count: number) {
  const railRef = useRef<HTMLUListElement>(null)
  const motionRef = useRef<number | null>(null)
  const [active, setActive] = useState(0)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const sync = useCallback(() => {
    const rail = railRef.current
    if (!rail) return
    const step = railStep(rail)
    if (step === null) return
    const index = Math.round(rail.scrollLeft / (step || 1))
    setActive(Math.max(0, Math.min(count - 1, index)))
    setAtStart(rail.scrollLeft <= 2)
    setAtEnd(rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2)
  }, [count])

  // ширина карточек тянется от вьюпорта: после ресайза стрелки надо пересчитать
  useEffect(() => {
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [sync])

  useEffect(
    () => () => {
      if (motionRef.current !== null) cancelAnimationFrame(motionRef.current)
    },
    [],
  )

  const stopMotion = () => {
    if (motionRef.current !== null) {
      cancelAnimationFrame(motionRef.current)
      motionRef.current = null
    }
    railRef.current?.removeAttribute('data-moving')
  }

  // Нативный smooth-scroll вместе со scroll-snap на мобильных делал два
  // последовательных рывка: сначала прокрутку, затем дополнительное
  // прилипание. Двигаем ленту сами к уже рассчитанной snap-позиции.
  const animateTo = (left: number) => {
    const rail = railRef.current
    if (!rail) return
    stopMotion()
    const from = rail.scrollLeft
    const to = Math.max(0, Math.min(left, rail.scrollWidth - rail.clientWidth))
    const distance = to - from
    if (Math.abs(distance) < 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      rail.scrollLeft = to
      return
    }

    const started = performance.now()
    const duration = Math.min(620, Math.max(380, 360 + Math.abs(distance) * 0.28))
    rail.dataset.moving = ''
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration)
      const eased =
        progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2
      rail.scrollLeft = from + distance * eased
      if (progress < 1) motionRef.current = requestAnimationFrame(tick)
      else {
        motionRef.current = null
        rail.removeAttribute('data-moving')
      }
    }
    motionRef.current = requestAnimationFrame(tick)
  }

  const goTo = (index: number) => {
    const rail = railRef.current
    const target = rail?.children[index] as HTMLElement | undefined
    if (!rail || !target) return
    const centered = window.matchMedia('(max-width: 768px)').matches
    const left =
      target.offsetLeft -
      rail.offsetLeft -
      (centered ? (rail.clientWidth - target.offsetWidth) / 2 : 0)
    animateTo(left)
  }

  // на десктопе шагаем видимым экраном карточек, а не по одной
  const nudge = (dir: 1 | -1) => {
    const rail = railRef.current
    if (!rail) return
    const step = railStep(rail) ?? rail.clientWidth
    const page = Math.max(1, Math.floor(rail.clientWidth / step))
    goTo(Math.max(0, Math.min(count - 1, active + dir * page)))
  }

  return { railRef, active, atStart, atEnd, sync, stopMotion, goTo, nudge }
}
