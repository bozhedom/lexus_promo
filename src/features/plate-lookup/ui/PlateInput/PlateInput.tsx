'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useMediaQuery } from '@/shared/lib/useMediaQuery'

import { maskPlateMain, maskRegion, splitPlate } from '../../lib/mask'
import { PlateKeypad } from '../PlateKeypad'
import styles from './PlateInput.module.scss'

interface PlateInputProps {
  defaultValue?: string
  onChange: (plate: string) => void
  invalid?: boolean
  autoFocus?: boolean
  /** `plate`: крупный номерной знак (экран 2), `compact`, обычное поле (экран 3c) */
  size?: 'plate' | 'compact'
}

// Позиции символов основной части: буква, три цифры, две буквы
const MAIN_SLOTS = ['letter', 'digit', 'digit', 'digit', 'letter', 'letter'] as const
const MAIN_PLACEHOLDER = 'А000АА'
const REGION_PLACEHOLDER = '000'

/**
 * Ввод госномера. Крупный вариант рисует настоящий знак: цифры крупнее букв,
 * регион отдельным блоком. Печатаем в невидимое поле поверх, иначе не работают
 * клавиатура, вставка и автозаполнение.
 *
 * На тач-экранах системную клавиатуру подменяем своей (`PlateKeypad`): сузить
 * системную до двенадцати разрешённых букв нельзя, а переключение inputMode на
 * ходу iOS игнорирует, пока поле не потеряет фокус.
 */
export function PlateInput({
  defaultValue = '',
  onChange,
  invalid,
  autoFocus,
  size = 'plate',
}: PlateInputProps) {
  const initial = splitPlate(defaultValue)
  const [main, setMain] = useState(initial.main)
  const [region, setRegion] = useState(initial.region)
  const [focus, setFocus] = useState<'main' | 'region' | null>(null)
  const mainRef = useRef<HTMLInputElement>(null)
  const regionRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // своя клавиатура только там, где нет мыши: на десктопе печатают железной
  const touch = useMediaQuery('(hover: none) and (pointer: coarse)')
  const [padOpen, setPadOpen] = useState(false)
  // куда встанет следующий символ, когда ввод идёт с нашей клавиатуры
  const [part, setPart] = useState<'main' | 'region'>('main')

  // Только там, где есть железная клавиатура: на телефоне автофокус поднимает
  // экранную и закрывает пол-формы.
  useEffect(() => {
    if (!autoFocus) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    mainRef.current?.focus()
  }, [autoFocus])

  // закрываем панель тапом мимо номера, как это делает системная клавиатура
  useEffect(() => {
    if (!padOpen) return
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null
      // сама панель лежит в body, поэтому проверяем и её, а не только номер
      if (el?.closest?.('[data-plate-keypad]')) return
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

  const emit = (m: string, r: string) => onChange(m + r)

  // Клавиатура под текущую позицию: на месте букв обычная, на месте цифр
  // цифровая. Системной больше не объяснить, набор букв ей не сузить, но
  // лишние символы всё равно отсекает маска.
  const mainKind = MAIN_SLOTS[Math.min(main.length, MAIN_SLOTS.length - 1)]
  // для своей клавиатуры позиция известна точно, включая регион
  const padKind = part === 'region' ? 'digit' : mainKind

  const onMain = (raw: string) => {
    const m = maskPlateMain(raw)
    setMain(m)
    emit(m, region)
    // номер заполнен: сразу переводим курсор в регион
    if (m.length === 6 && main.length < 6) regionRef.current?.focus()
  }

  // ── ввод с нашей клавиатуры ──────────────────────────────────────────────
  const pressKey = (ch: string) => {
    if (part === 'region') {
      const r = maskRegion(region + ch)
      setRegion(r)
      emit(main, r)
      return
    }
    const m = maskPlateMain(main + ch)
    setMain(m)
    emit(m, region)
    if (m.length === 6) setPart('region')
  }

  const erase = () => {
    if (part === 'region' && region) {
      const r = region.slice(0, -1)
      setRegion(r)
      emit(main, r)
      return
    }
    // регион пуст: возвращаемся в основную часть и стираем там
    if (part === 'region') setPart('main')
    const m = main.slice(0, -1)
    setMain(m)
    emit(m, region)
  }

  const openPad = (which: 'main' | 'region') => {
    setPart(which)
    setPadOpen(true)
  }

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
            canErase={Boolean(main || region)}
          />,
          document.body,
        )
      : null

  if (size === 'compact') {
    const parts = [main.slice(0, 1), main.slice(1, 4), main.slice(4, 6), region].filter(Boolean)
    return (
      <div className={styles.compactWrap} ref={rootRef}>
        <input
          className={styles.compact}
          data-invalid={invalid || undefined}
          value={parts.join(' ')}
          onChange={(e) => {
            const flat = e.target.value.replace(/\s+/g, '')
            const m = maskPlateMain(flat.slice(0, 6))
            const r = maskRegion(flat.slice(m.length))
            setMain(m)
            setRegion(r)
            emit(m, r)
          }}
          onFocus={() => touch && openPad(main.length === 6 ? 'region' : 'main')}
          // на тач-экране печатает наша клавиатура, системную не поднимаем
          readOnly={touch}
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

  // каретку на тач-экране ведёт наша клавиатура, на десктопе, реальный фокус
  const caretAt = touch ? (padOpen ? part : null) : focus

  return (
    <div className={styles.plate} data-invalid={invalid || undefined} ref={rootRef}>
      {/* основная часть */}
      <label
        className={styles.mainBlock}
        data-focus={caretAt === 'main' || undefined}
        onPointerDown={touch ? () => openPad('main') : undefined}
      >
        <span className={styles.display}>
          {MAIN_SLOTS.map((kind, i) => {
            // подсказку показываем только у пустого поля целиком
            const typed = main[i]
            const ch = typed ?? (main ? '' : MAIN_PLACEHOLDER[i])
            return (
              <span
                key={i}
                className={`${styles.slot} ${styles[kind]}`}
                data-hint={typed ? undefined : true}
                data-caret={caretAt === 'main' && i === main.length ? true : undefined}
              >
                {ch || ' '}
              </span>
            )
          })}
        </span>
        <input
          ref={mainRef}
          className={styles.field}
          value={main}
          onChange={(e) => onMain(e.target.value)}
          onFocus={() => setFocus('main')}
          onBlur={() => setFocus(null)}
          readOnly={touch}
          inputMode={touch ? 'none' : mainKind === 'digit' ? 'numeric' : 'text'}
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          maxLength={6}
          aria-label="Госномер"
        />
      </label>

      {/* регион */}
      <label
        className={styles.regionBlock}
        data-focus={caretAt === 'region' || undefined}
        onPointerDown={touch ? () => openPad('region') : undefined}
      >
        <span className={styles.regionDisplay}>
          {[0, 1, 2].map((i) => {
            const typed = region[i]
            const ch = typed ?? (region ? '' : REGION_PLACEHOLDER[i])
            return (
              <span
                key={i}
                className={`${styles.slot} ${styles.digit} ${styles.regionDigit}`}
                data-hint={typed ? undefined : true}
                data-caret={caretAt === 'region' && i === region.length ? true : undefined}
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
        <input
          ref={regionRef}
          className={styles.field}
          value={region}
          onChange={(e) => {
            const r = maskRegion(e.target.value)
            setRegion(r)
            emit(main, r)
          }}
          onFocus={() => setFocus('region')}
          onBlur={() => setFocus(null)}
          readOnly={touch}
          inputMode={touch ? 'none' : 'numeric'}
          autoComplete="off"
          maxLength={3}
          aria-label="Регион"
        />
      </label>

      {keypad}
    </div>
  )
}
