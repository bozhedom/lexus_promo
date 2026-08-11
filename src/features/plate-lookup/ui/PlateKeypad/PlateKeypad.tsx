'use client'

import { DIGITS, KeypadSheet, KeypadZone } from '@/shared/ui/Keypad'

// В госномере разрешены только эти двенадцать букв, они же есть в латинице
const LETTERS = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х']

interface PlateKeypadProps {
  /**
   * Что принимает текущая позиция: на букве гасим цифры, на цифре буквы.
   * `done` — основная часть набрана целиком, дальше только «Готово» или правка.
   */
  kind: 'letter' | 'digit' | 'done'
  onKey: (ch: string) => void
  onErase: () => void
  onDone: () => void
  canErase: boolean
}

const HINTS = {
  digit: 'Введите цифру',
  letter: 'Введите букву',
  done: 'Номер набран',
} as const

/**
 * Своя клавиатура под госномер: сразу видны все двенадцать разрешённых букв и
 * цифры, а неподходящая на текущей позиции половина заблокирована.
 */
export function PlateKeypad({ kind, onKey, onErase, onDone, canErase }: PlateKeypadProps) {
  return (
    <KeypadSheet
      hint={HINTS[kind]}
      label="Клавиатура для госномера"
      onErase={onErase}
      onDone={onDone}
      canErase={canErase}
    >
      <KeypadZone keys={DIGITS} columns={5} disabled={kind !== 'digit'} onKey={onKey} />
      <KeypadZone keys={LETTERS} columns={6} disabled={kind !== 'letter'} onKey={onKey} />
    </KeypadSheet>
  )
}
