import { useEffect, useRef, useState } from 'react'
import type { TouchEvent as ReactTouchEvent } from 'react'

interface LightboxDrag {
  dx: number
  dy: number
  live: boolean
  animating: boolean
}

const IDLE_DRAG: LightboxDrag = { dx: 0, dy: 0, live: false, animating: false }

/** Страница под развёрнутым кадром не должна ехать. */
function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const scrollY = window.scrollY
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    }
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.overflow = prev.overflow
      document.body.style.position = prev.position
      document.body.style.top = prev.top
      document.body.style.width = prev.width
      window.scrollTo(0, scrollY)
    }
  }, [locked])
}

/**
 * Разворот кадра через <dialog>: он живёт в верхнем слое, поэтому его не режут
 * ни overflow ленты, ни трансформы занавеса между экранами.
 *
 * `onReturn` доводит ленту до того кадра, на котором закрыли разворот.
 */
export function useLightbox(count: number, onReturn: (index: number) => void) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [opened, setOpened] = useState<number | null>(null)
  const swipe = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null)
  const gestureTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [drag, setDrag] = useState<LightboxDrag>(IDLE_DRAG)
  const isOpen = opened !== null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (opened === null) {
      if (dialog.open) dialog.close()
    } else if (!dialog.open) {
      dialog.showModal()
    }
  }, [opened])

  // Страховка: если кадр закрыли мимо нашего состояния, подтягиваем состояние.
  // Слушаем нативно, событие close не всплывает и делегирование React его теряет.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const sink = () => setOpened(null)
    dialog.addEventListener('close', sink)
    return () => dialog.removeEventListener('close', sink)
  }, [])

  useEffect(
    () => () => {
      if (gestureTimer.current) clearTimeout(gestureTimer.current)
    },
    [],
  )

  useBodyScrollLock(isOpen)

  const close = () => {
    if (gestureTimer.current) clearTimeout(gestureTimer.current)
    gestureTimer.current = null
    setDrag(IDLE_DRAG)
    // возвращаемся к тому кадру, который смотрели
    if (opened !== null) onReturn(opened)
    setOpened(null)
  }

  const step = (to: 1 | -1) =>
    setOpened((index) => (index === null ? index : (index + to + count) % count))

  const settleGesture = () => {
    if (gestureTimer.current) clearTimeout(gestureTimer.current)
    setDrag({ ...IDLE_DRAG, animating: true })
    gestureTimer.current = setTimeout(() => {
      gestureTimer.current = null
      setDrag(IDLE_DRAG)
    }, 300)
  }

  const dismissGesture = (fromDy: number) => {
    if (gestureTimer.current) clearTimeout(gestureTimer.current)
    setDrag({ dx: 0, dy: Math.max(window.innerHeight, fromDy + 280), live: false, animating: true })
    gestureTimer.current = setTimeout(() => {
      gestureTimer.current = null
      close()
    }, 280)
  }

  const onTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0]
    swipe.current = { x: touch.clientX, y: touch.clientY, axis: null }
  }

  // Горизонтальный жест только выбирает соседний кадр. Саму сцену за пальцем
  // не тянем: при мгновенной смене это давало заметный скачок назад.
  // Вертикальный жест остаётся живым — им окно можно мягко закрыть вниз.
  const onTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    const from = swipe.current
    if (!from) return
    const touch = e.touches[0]
    const rawDx = touch.clientX - from.x
    const rawDy = touch.clientY - from.y
    if (!from.axis) {
      if (Math.max(Math.abs(rawDx), Math.abs(rawDy)) < 8) return
      from.axis = Math.abs(rawDx) > Math.abs(rawDy) ? 'x' : 'y'
    }
    e.preventDefault()
    if (from.axis === 'y') {
      // Вверх кадр двигается с сопротивлением, вниз следует за пальцем.
      const resisted = rawDy < 0 ? rawDy * 0.16 : rawDy
      setDrag({ dx: 0, dy: resisted, live: true, animating: false })
    }
  }

  const onTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    const from = swipe.current
    swipe.current = null
    if (!from) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - from.x
    const dy = touch.clientY - from.y
    if (from.axis === 'x' && Math.abs(dx) > 55) {
      step(dx < 0 ? 1 : -1)
      setDrag(IDLE_DRAG)
    } else if (from.axis === 'x') {
      setDrag(IDLE_DRAG)
    } else if (from.axis === 'y' && dy > 110) {
      dismissGesture(dy)
    } else {
      settleGesture()
    }
  }

  const onTouchCancel = () => {
    const horizontal = swipe.current?.axis === 'x'
    swipe.current = null
    if (horizontal) setDrag(IDLE_DRAG)
    else settleGesture()
  }

  const stageStyle =
    drag.live || drag.animating
      ? {
          transform: `translate(${drag.dx}px, ${drag.dy}px)`,
          opacity:
            drag.animating && drag.dy > 300
              ? 0
              : 1 - Math.min(Math.max(drag.dy, Math.abs(drag.dx) * 0.35) / 520, 0.42),
          transition: drag.live
            ? 'none'
            : 'transform 280ms cubic-bezier(0.2, 0.72, 0.2, 1), opacity 220ms ease',
        }
      : undefined

  /** Соседние кадры держим в разметке: без них смена выглядит как подмена. */
  const frameSlot = (index: number): 'previous' | 'current' | 'next' | null => {
    if (opened === null) return null
    if (index === opened) return 'current'
    if (index === (opened - 1 + count) % count) return 'previous'
    if (index === (opened + 1) % count) return 'next'
    return null
  }

  return {
    dialogRef,
    opened,
    open: setOpened,
    close,
    step,
    dragging: drag.live,
    stageStyle,
    frameSlot,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
  }
}
