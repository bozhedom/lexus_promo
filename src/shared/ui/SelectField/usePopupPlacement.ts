import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react'

export interface PopupBox {
  left: number
  top: number
  width: number
  maxHeight: number
  up: boolean
}

const OPTION_H = 40
const GAP = 8
const EDGE = 12

/**
 * Позиция выпадающего списка. Раскрываем вниз, а если снизу тесно — вверх; в
 * обоих случаях режем высоту по свободному месту, чтобы список никогда не
 * уезжал за экран.
 *
 * Список позиционируется fixed и уходит порталом в body, иначе его режет
 * overflow: hidden у сцены.
 */
export function usePopupPlacement({
  open,
  optionCount,
  triggerRef,
  listRef,
  onDismiss,
}: {
  open: boolean
  optionCount: number
  triggerRef: RefObject<HTMLButtonElement | null>
  listRef: RefObject<HTMLUListElement | null>
  onDismiss: () => void
}) {
  const [box, setBox] = useState<PopupBox | null>(null)

  const place = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const wanted = Math.min(optionCount * OPTION_H + 12, 264)
    const below = window.innerHeight - rect.bottom - GAP - EDGE
    const above = rect.top - GAP - EDGE
    const up = below < wanted && above > below
    const maxHeight = Math.max(120, Math.min(wanted, up ? above : below))
    setBox({
      left: rect.left,
      top: up ? rect.top - GAP - maxHeight : rect.bottom + GAP,
      width: rect.width,
      maxHeight,
      up,
    })
  }, [optionCount, triggerRef])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  // клик мимо, скролл и ресайз: закрываем или пересчитываем позицию
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return
      onDismiss()
    }
    const onScroll = () => place()
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, onDismiss, place, triggerRef, listRef])

  return box
}
