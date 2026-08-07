'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useMediaQuery } from '@/shared/lib/useMediaQuery'

import {
  DEFAULT_PLATE_REGION,
  MAIN_SLOT_KINDS,
  fitsSlot,
  plateSlots,
  toCyrillic,
} from '../../lib/mask'
import { PlateKeypad } from '../PlateKeypad'
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

const MAIN_PLACEHOLDER = 'А000АА'
const REGION_PLACEHOLDER = '000'

type Part = 'main' | 'region'
interface Caret {
  part: Part
  index: number
}

const LENGTH: Record<Part, number> = { main: 6, region: 3 }

/**
 * Ввод госномера. Крупный вариант рисует настоящий знак: цифры крупнее букв,
 * регион отдельным блоком.
 *
 * Номер хранится позициями, а не строкой: у каждой позиции свой тип (буква или
 * цифра), поэтому каретку можно поставить в любую ячейку тапом, а «Стереть»
 * убирает ровно один символ и не сдвигает соседние.
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
  const initial = plateSlots(defaultValue)
  const [main, setMain] = useState(initial.main)
  const [region, setRegion] = useState(initial.region)
  const [caret, setCaret] = useState<Caret>({ part: 'main', index: 0 })
  const [focused, setFocused] = useState(false)
  const fieldRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // своя клавиатура только там, где нет мыши: на десктопе печатают железной
  const touch = useMediaQuery('(hover: none) and (pointer: coarse)')
  const [padOpen, setPadOpen] = useState(false)

  const value = main.join('') + region.join('')

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

  const emit = (m: string[], r: string[]) => onChange(m.join('') + r.join(''))

  const writeSlot = (part: Part, index: number, ch: string) => {
    if (part === 'main') {
      const next = [...main]
      next[index] = ch
      setMain(next)
      emit(next, region)
    } else {
      const next = [...region]
      next[index] = ch
      setRegion(next)
      emit(main, next)
    }
  }

  /** Ввод символа в текущую ячейку: перезаписываем её и уходим на следующую. */
  const pressKey = (raw: string) => {
    const { part, index } = caret
    if (index >= LENGTH[part]) return
    const kind = part === 'region' ? 'digit' : MAIN_SLOT_KINDS[index]
    if (!fitsSlot(kind, raw)) return
    writeSlot(part, index, toCyrillic(raw))
    if (part === 'main' && index === 5) setCaret({ part: 'region', index: 0 })
    else setCaret({ part, index: index + 1 })
  }

  /**
   * Стирание. Каретка стоит на ячейке, и убирать надо именно её: тапом по
   * последнему символу каретка правее него не встаёт, поэтому «стереть
   * предыдущую» не давало погасить последнюю букву номера вообще.
   *
   * Пустая ячейка означает, что стирать здесь нечего — тогда шагаем влево и
   * гасим соседнюю, как обычный backspace после набора.
   */
  const erase = () => {
    const { part, index } = caret
    const slots = part === 'main' ? main : region
    if (index < LENGTH[part] && slots[index]) {
      writeSlot(part, index, '')
      return
    }
    const flat = (part === 'main' ? index : 6 + index) - 1
    if (flat < 0) return
    const target: Caret = flat < 6 ? { part: 'main', index: flat } : { part: 'region', index: flat - 6 }
    writeSlot(target.part, target.index, '')
    setCaret(target)
  }

  const moveCaret = (step: -1 | 1) => {
    const flat = caret.part === 'main' ? caret.index : 6 + caret.index
    const next = Math.min(8, Math.max(0, flat + step))
    setCaret(next < 6 ? { part: 'main', index: next } : { part: 'region', index: next - 6 })
  }

  /**
   * Тап ставит каретку в выбранную ячейку, но не дальше первой незаполненной:
   * иначе по пустому знаку можно было бы начать печатать с середины и оставить
   * дырки. Внутри уже введённой части каретка встаёт куда угодно — ради того,
   * чтобы поправить один символ, всё и затевалось.
   */
  const openAt = (part: Part, index: number) => {
    if (disabled) return
    const slots = part === 'main' ? main : region
    let limit = 0
    while (limit < slots.length && slots[limit]) limit += 1
    setCaret({ part, index: Math.min(index, limit, LENGTH[part] - 1) })
    if (touch) setPadOpen(true)
    else fieldRef.current?.focus()
  }

  // Ввод с железной клавиатуры: поле невидимое, поэтому клавиши разбираем сами
  // и ведём ту же каретку, что рисуется на ячейках.
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    if (e.key === 'Backspace') {
      e.preventDefault()
      erase()
      return
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      moveCaret(e.key === 'ArrowLeft' ? -1 : 1)
      return
    }
    if (e.key === 'Delete') {
      e.preventDefault()
      const { part, index } = caret
      if (index < LENGTH[part]) writeSlot(part, index, '')
      return
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      pressKey(e.key)
    }
  }

  // Вставка и автозаполнение приходят одним куском: раскладываем по ячейкам.
  const onPaste = (text: string) => {
    const slots = plateSlots(text)
    setMain(slots.main)
    setRegion(slots.region)
    emit(slots.main, slots.region)
    setCaret({ part: 'region', index: slots.region.filter(Boolean).length })
  }

  const padKind = caret.part === 'region' ? 'digit' : MAIN_SLOT_KINDS[caret.index]
  const caretVisible = touch ? padOpen : focused

  // В body: у карточки StageLayout своя transform, а она превращается в
  // containing block, и position: fixed прилипал бы к карточке, а не к экрану.
  const keypad =
    touch && padOpen
      ? createPortal(
          <PlateKeypad
            kind={padKind}
            onKey={pressKey}
            onErase={erase}
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
          onChange={(e) => onPaste(e.target.value.replace(/\s+/g, ''))}
          onFocus={() => {
            if (!touch) return
            const filled = main.filter(Boolean).length
            openAt(filled >= 6 ? 'region' : 'main', filled >= 6 ? region.filter(Boolean).length : filled)
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

  const anyFilled = main.some(Boolean)
  const regionFilled = region.some(Boolean)

  // Тап ставит каретку в ближайшую по горизонтали ячейку, а не в конец: между
  // символами есть зазоры, и попадание «мимо буквы» тоже должно срабатывать.
  const pickSlot = (part: Part, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (disabled) return
    const cells = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[data-slot]'),
    )
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
      {/* основная часть */}
      <div
        className={styles.mainBlock}
        data-focus={(caretVisible && caret.part === 'main') || undefined}
        onPointerDown={(e) => pickSlot('main', e)}
      >
        <span className={styles.display}>
          {MAIN_SLOT_KINDS.map((kind, i) => {
            // подсказку показываем только у пустого поля целиком
            const typed = main[i]
            const ch = typed || (anyFilled ? '' : MAIN_PLACEHOLDER[i])
            return (
              <span
                key={i}
                data-slot
                className={`${styles.slot} ${styles[kind]}`}
                data-hint={typed ? undefined : true}
                data-caret={caretVisible && caret.part === 'main' && caret.index === i ? true : undefined}
              >
                {ch || ' '}
              </span>
            )
          })}
        </span>
      </div>

      {/* регион */}
      <div
        className={styles.regionBlock}
        data-focus={(caretVisible && caret.part === 'region') || undefined}
        onPointerDown={(e) => pickSlot('region', e)}
      >
        <span className={styles.regionDisplay}>
          {[0, 1, 2].map((i) => {
            const typed = region[i]
            const ch = typed || (regionFilled ? '' : REGION_PLACEHOLDER[i])
            return (
              <span
                key={i}
                data-slot
                className={`${styles.slot} ${styles.digit} ${styles.regionDigit}`}
                data-hint={typed ? undefined : true}
                data-caret={
                  caretVisible && caret.part === 'region' && caret.index === i ? true : undefined
                }
              >
                {ch || ' '}
              </span>
            )
          })}
        </span>
        <Image
          className={styles.flag}
          src="/images/plate-rus-flag.svg"
          alt="RUS"
          width={48}
          height={12}
        />
      </div>

      {/* Невидимое поле поверх знака: держит фокус, принимает вставку и
          автозаполнение. Клавиши разбираются в onKeyDown, поэтому его value
          нужно только как источник для paste. */}
      <input
        ref={fieldRef}
        className={styles.field}
        value={value}
        onChange={(e) => onPaste(e.target.value)}
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
