'use client'

import type { PointerEvent, ReactNode } from 'react'

import styles from './Keypad.module.scss'

export const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

interface KeypadSheetProps {
  /** подсказка слева в шапке: что ждём на текущей позиции */
  hint: string
  label: string
  onErase: () => void
  onDone: () => void
  canErase: boolean
  children: ReactNode
}

/**
 * Нижняя шторка своей клавиатуры. Системную на телефоне нельзя ни сузить до
 * нужного набора символов, ни заставить не поднимать масштаб страницы при
 * фокусе, поэтому во всей воронке ввод коротких кодов идёт через эту панель.
 *
 * `pointerdown` гасится: палец не должен уводить фокус с поля, иначе каретка
 * пропадает на первом же нажатии.
 */
export function KeypadSheet({
  hint,
  label,
  onErase,
  onDone,
  canErase,
  children,
}: KeypadSheetProps) {
  const hold = (e: PointerEvent) => e.preventDefault()

  return (
    <div
      className={styles.sheet}
      data-keypad
      onPointerDown={hold}
      role="group"
      aria-label={label}
    >
      <div className={styles.bar}>
        <span className={styles.hint} aria-live="polite">
          {hint}
        </span>
        <button
          type="button"
          className={styles.erase}
          onClick={onErase}
          disabled={!canErase}
          aria-label="Удалить символ"
        >
          Стереть
        </button>
      </div>

      {children}

      <button
        type="button"
        className={styles.done}
        onClick={onDone}
      >
        Готово
      </button>
    </div>
  )
}

interface KeypadZoneProps {
  keys: readonly string[]
  columns: 5 | 6
  disabled?: boolean
  onKey: (ch: string) => void
}

export function KeypadZone({ keys, columns, disabled, onKey }: KeypadZoneProps) {
  return (
    <div
      className={`${styles.zone} ${columns === 5 ? styles.digits : styles.letters}`}
      data-off={disabled || undefined}
    >
      {keys.map((ch) => (
        <button
          key={ch}
          type="button"
          className={styles.key}
          disabled={disabled}
          onClick={() => onKey(ch)}
        >
          {ch}
        </button>
      ))}
    </div>
  )
}

interface DigitKeypadProps {
  hint?: string
  label?: string
  onKey: (ch: string) => void
  onErase: () => void
  onDone: () => void
  canErase: boolean
}

/** Только цифры: код из СМС. Раскладка та же, что у клавиатуры госномера. */
export function DigitKeypad({
  hint = 'Введите цифру',
  label = 'Цифровая клавиатура',
  onKey,
  onErase,
  onDone,
  canErase,
}: DigitKeypadProps) {
  return (
    <KeypadSheet hint={hint} label={label} onErase={onErase} onDone={onDone} canErase={canErase}>
      <KeypadZone keys={DIGITS} columns={5} onKey={onKey} />
    </KeypadSheet>
  )
}
