'use client'

import type { PointerEvent } from 'react'

import styles from './PlateKeypad.module.scss'

// В госномере разрешены только эти двенадцать букв, они же есть в латинице
const LETTERS = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х']
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

interface PlateKeypadProps {
  /** что принимает текущая позиция: на букве гасим цифры, на цифре буквы */
  kind: 'letter' | 'digit'
  onKey: (ch: string) => void
  onErase: () => void
  onDone: () => void
  canErase: boolean
}

/**
 * Своя клавиатура под госномер. Системную на телефоне нельзя сузить до нужных
 * символов, поэтому на тач-экранах показываем эту: сразу видны все двенадцать
 * букв и цифры, а неподходящая половина на текущей позиции заблокирована.
 */
export function PlateKeypad({ kind, onKey, onErase, onDone, canErase }: PlateKeypadProps) {
  // палец не должен уводить фокус с поля: иначе каретка гаснет на первом нажатии
  const hold = (e: PointerEvent) => e.preventDefault()

  return (
    <div
      className={styles.sheet}
      data-plate-keypad
      onPointerDown={hold}
      role="group"
      aria-label="Клавиатура для госномера"
    >
      <div className={styles.bar}>
        <span className={styles.hint} aria-live="polite">
          {kind === 'digit' ? 'Введите цифру' : 'Введите букву'}
        </span>
        <button type="button" className={styles.done} onClick={onDone}>
          Готово
        </button>
      </div>

      <div className={`${styles.zone} ${styles.digits}`} data-off={kind !== 'digit' || undefined}>
        {DIGITS.map((d) => (
          <button
            key={d}
            type="button"
            className={styles.key}
            disabled={kind !== 'digit'}
            onClick={() => onKey(d)}
          >
            {d}
          </button>
        ))}
      </div>

      <div className={`${styles.zone} ${styles.letters}`} data-off={kind !== 'letter' || undefined}>
        {LETTERS.map((l) => (
          <button
            key={l}
            type="button"
            className={styles.key}
            disabled={kind !== 'letter'}
            onClick={() => onKey(l)}
          >
            {l}
          </button>
        ))}
      </div>

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
  )
}
