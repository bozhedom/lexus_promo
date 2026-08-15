export type PlatePart = 'main' | 'region'

export interface Caret {
  part: PlatePart
  index: number
}

export const SLOT_COUNT: Record<PlatePart, number> = { main: 6, region: 3 }

/** Обе части номера как одна дорожка из девяти ячеек: так проще шагать каретке. */
export function flatIndex({ part, index }: Caret): number {
  return part === 'main' ? index : SLOT_COUNT.main + index
}

export function caretAt(flat: number): Caret {
  return flat < SLOT_COUNT.main
    ? { part: 'main', index: flat }
    : { part: 'region', index: flat - SLOT_COUNT.main }
}

export function shiftCaret(caret: Caret, step: -1 | 1): Caret {
  const flat = flatIndex(caret)
  return caretAt(Math.min(8, Math.max(0, flat + step)))
}

/**
 * Докуда можно поставить каретку тапом: до последней заполненной ячейки плюс
 * одна. Считаем именно по последней заполненной, а не по первой пустой — иначе
 * стёртый символ в середине номера сам становится границей и каретка запирается
 * слева от дырки.
 */
export function filledLimit(slots: string[]): number {
  let limit = 0
  slots.forEach((slot, index) => {
    if (slot) limit = index + 1
  })
  return limit
}

/**
 * Куда встанет каретка при тапе по ячейке: не дальше конца набранного, иначе по
 * пустому знаку можно было бы начать печатать с середины и оставить дырки.
 */
export function clampCaret(part: PlatePart, index: number, slots: string[]): Caret {
  return { part, index: Math.min(index, filledLimit(slots), SLOT_COUNT[part] - 1) }
}

/**
 * Что стирать. Каретка стоит на ячейке, и убирать надо именно её: тапом по
 * последнему символу каретка правее него не встаёт, поэтому «стереть предыдущую»
 * не давало погасить последнюю букву номера вообще. Пустая ячейка означает, что
 * стирать здесь нечего — тогда шагаем влево, как обычный backspace.
 */
export function eraseTarget(caret: Caret, slots: string[]): Caret | null {
  if (caret.index < SLOT_COUNT[caret.part] && slots[caret.index]) return caret
  const flat = flatIndex(caret) - 1
  return flat < 0 ? null : caretAt(flat)
}
