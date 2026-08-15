'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'

import { useMediaQuery } from '@/shared/lib/useMediaQuery'

import { DEFAULT_PLATE_REGION, MAIN_SLOT_KINDS } from '../../lib/mask'
import { SLOT_COUNT, type PlatePart } from '../../lib/caret'
import { PlateKeypad } from '../PlateKeypad'
import { PlateDisplay } from './PlateDisplay'
import { usePlateSlots } from './usePlateSlots'
import styles from './PlateInput.module.scss'

interface PlateInputProps {
  defaultValue?: string
  onChange: (plate: string) => void
  invalid?: boolean
  autoFocus?: boolean
  disabled?: boolean
  /** `plate`: крупный номерной знак (экран 2), `compact`, обычное поле (экран 3c) */
  size?: 'plate' | 'compact'
}

/**
 * Ввод госномера.
 *
 * На тач-экранах системную клавиатуру подменяем своей (`PlateKeypad`): сузить
 * системную до двенадцати разрешённых букв нельзя, а переключение inputMode на
 * ходу iOS игнорирует, пока поле не потеряет фокус.
 */
export function PlateInput({
  defaultValue = DEFAULT_PLATE_REGION,
  onChange,
  invalid,
  autoFocus,
  disabled = false,
  size = 'plate',
}: PlateInputProps) {
  const slots = usePlateSlots(defaultValue, onChange)
  const { main, region, value, caret } = slots
  const [focused, setFocused] = useState(false)
  const fieldRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // своя клавиатура только там, где нет мыши: на десктопе печатают железной
  const touch = useMediaQuery('(hover: none) and (pointer: coarse)')
  const [padOpen, setPadOpen] = useState(false)

  // Только там, где есть железная клавиатура: на телефоне автофокус поднимает
  // экранную и закрывает пол-формы.
  useEffect(() => {
    if (!autoFocus || disabled) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    fieldRef.current?.focus()
  }, [autoFocus, disabled])

  // закрываем панель тапом мимо номера, как это делает системная клавиатура
  useEffect(() => {
    if (!padOpen) return
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null
      // сама панель лежит в body, поэтому проверяем и её, а не только номер
      if (el?.closest?.('[data-keypad]')) return
      if (!rootRef.current?.contains(el as Node)) setPadOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [padOpen])

  // панель занимает низ экрана, поэтому подтягиваем к ней сам номер
  useEffect(() => {
    if (!padOpen) return
    rootRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [padOpen])

  const openAt = (part: PlatePart, index: number) => {
    if (disabled) return
    slots.focusSlot(part, index)
    if (touch) setPadOpen(true)
    else fieldRef.current?.focus()
  }

  // Ввод с железной клавиатуры: поле невидимое, поэтому клавиши разбираем сами
  // и ведём ту же каретку, что рисуется на ячейках.
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    if (e.key === 'Backspace') {
      e.preventDefault()
      slots.erase()
      return
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      slots.moveCaret(e.key === 'ArrowLeft' ? -1 : 1)
      return
    }
    if (e.key === 'Delete') {
      e.preventDefault()
      slots.clearSlot()
      return
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      slots.pressKey(e.key)
    }
  }

  const padKind =
    caret.part === 'region'
      ? 'digit'
      : caret.index >= SLOT_COUNT.main
        ? 'done'
        : MAIN_SLOT_KINDS[caret.index]
  const caretVisible = touch ? padOpen : focused

  // В body: у карточки StageLayout своя transform, а она превращается в
  // containing block, и position: fixed прилипал бы к карточке, а не к экрану.
  const keypad =
    touch && padOpen
      ? createPortal(
          <PlateKeypad
            kind={padKind}
            onKey={slots.pressKey}
            onErase={slots.erase}
            onDone={() => setPadOpen(false)}
            canErase={Boolean(value)}
          />,
          document.body,
        )
      : null

  if (size === 'compact') {
    const parts = [
      main.slice(0, 1).join(''),
      main.slice(1, 4).join(''),
      main.slice(4, 6).join(''),
      region.join(''),
    ].filter(Boolean)
    return (
      <div className={styles.compactWrap} data-disabled={disabled || undefined} ref={rootRef}>
        <input
          className={styles.compact}
          data-invalid={invalid || undefined}
          value={parts.join(' ')}
          onChange={(e) => slots.applyPaste(e.target.value.replace(/\s+/g, ''))}
          onFocus={() => {
            if (!touch) return
            const filled = main.filter(Boolean).length
            openAt(
              filled >= 6 ? 'region' : 'main',
              filled >= 6 ? region.filter(Boolean).length : filled,
            )
          }}
          // на тач-экране печатает наша клавиатура, системную не поднимаем
          readOnly={touch || disabled}
          disabled={disabled}
          inputMode={touch ? 'none' : 'text'}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="А 000 АА 125"
          aria-label="Госномер"
          autoFocus={autoFocus}
        />
        {keypad}
      </div>
    )
  }

  // Тап ставит каретку в ближайшую по горизонтали ячейку, а не в конец: между
  // символами есть зазоры, и попадание «мимо буквы» тоже должно срабатывать.
  const pickSlot = (part: PlatePart, e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (disabled) return
    const cells = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-slot]'))
    let nearest = 0
    let best = Infinity
    cells.forEach((el, i) => {
      const box = el.getBoundingClientRect()
      const distance = Math.abs(e.clientX - (box.left + box.width / 2))
      if (distance < best) {
        best = distance
        nearest = i
      }
    })
    openAt(part, nearest)
  }

  return (
    <div
      className={styles.plate}
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      ref={rootRef}
    >
      <PlateDisplay
        main={main}
        region={region}
        caret={caret}
        caretVisible={caretVisible}
        onPickSlot={pickSlot}
      />

      {/* Невидимое поле поверх знака: держит фокус, принимает вставку и
          автозаполнение. Клавиши разбираются в onKeyDown, поэтому его value
          нужно только как источник для paste. */}
      <input
        ref={fieldRef}
        className={styles.field}
        value={value}
        onChange={(e) => slots.applyPaste(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        readOnly={touch || disabled}
        disabled={disabled}
        inputMode={touch ? 'none' : padKind === 'digit' ? 'numeric' : 'text'}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        maxLength={9}
        aria-label="Госномер"
      />

      {keypad}
    </div>
  )
}
