import { useState } from 'react'

import {
  MAIN_SLOT_KINDS,
  fitsSlot,
  plateSlots,
  toCyrillic,
} from '../../lib/mask'
import {
  SLOT_COUNT,
  clampCaret,
  eraseTarget,
  shiftCaret,
  type Caret,
  type PlatePart,
} from '../../lib/caret'

/**
 * Номер хранится позициями, а не строкой: у каждой позиции свой тип (буква или
 * цифра), поэтому каретку можно поставить в любую ячейку тапом, а «Стереть»
 * убирает ровно один символ и не сдвигает соседние.
 */
export function usePlateSlots(defaultValue: string, onChange: (plate: string) => void) {
  const initial = plateSlots(defaultValue)
  const [main, setMain] = useState(initial.main)
  const [region, setRegion] = useState(initial.region)
  const [caret, setCaret] = useState<Caret>({ part: 'main', index: 0 })

  const value = main.join('') + region.join('')

  const writeSlot = (part: PlatePart, index: number, ch: string) => {
    if (part === 'main') {
      const next = [...main]
      next[index] = ch
      setMain(next)
      onChange(next.join('') + region.join(''))
    } else {
      const next = [...region]
      next[index] = ch
      setRegion(next)
      onChange(main.join('') + next.join(''))
    }
  }

  /**
   * Ввод символа в текущую ячейку: перезаписываем её и уходим на следующую.
   *
   * На последней ячейке основной части каретка в регион не перескакивает: там
   * уже стоит 125, и почти всем его менять не надо. Кому надо — ставит каретку
   * тапом по региону.
   */
  const pressKey = (raw: string) => {
    const { part, index } = caret
    if (index >= SLOT_COUNT[part]) return
    const kind = part === 'region' ? 'digit' : MAIN_SLOT_KINDS[index]
    if (!fitsSlot(kind, raw)) return
    writeSlot(part, index, toCyrillic(raw))
    setCaret({ part, index: index + 1 })
  }

  const erase = () => {
    const slots = caret.part === 'main' ? main : region
    const target = eraseTarget(caret, slots)
    if (!target) return
    writeSlot(target.part, target.index, '')
    if (target !== caret) setCaret(target)
  }

  /** Delete гасит ячейку под кареткой, не двигая саму каретку. */
  const clearSlot = () => {
    const { part, index } = caret
    if (index < SLOT_COUNT[part]) writeSlot(part, index, '')
  }

  const moveCaret = (step: -1 | 1) => setCaret(shiftCaret(caret, step))

  const focusSlot = (part: PlatePart, index: number) =>
    setCaret(clampCaret(part, index, part === 'main' ? main : region))

  // Вставка и автозаполнение приходят одним куском: раскладываем по ячейкам.
  const applyPaste = (text: string) => {
    const slots = plateSlots(text)
    setMain(slots.main)
    setRegion(slots.region)
    onChange(slots.main.join('') + slots.region.join(''))
    setCaret({ part: 'region', index: slots.region.filter(Boolean).length })
  }

  return {
    main,
    region,
    value,
    caret,
    pressKey,
    erase,
    clearSlot,
    moveCaret,
    focusSlot,
    applyPaste,
  }
}
