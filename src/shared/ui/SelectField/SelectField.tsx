'use client'

import clsx from 'clsx'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import styles from './SelectField.module.scss'

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  label?: string
  error?: string
  placeholder?: string
  options: SelectOption[]
  value?: string
  disabled?: boolean
  className?: string
  id?: string
  name?: string
  onChange: (value: string) => void
}

interface PopupBox {
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
 * Свой выпадающий список: системный select рисует попап силами ОС, оформить
 * его нельзя. Умеет клавиатуру и поиск по первым буквам.
 *
 * Список уходит порталом в body и позиционируется fixed, иначе его режет
 * overflow: hidden у сцены.
 */
export function SelectField({
  label,
  error,
  placeholder = 'Выбрать',
  options,
  value = '',
  disabled,
  className,
  id,
  name,
  onChange,
}: SelectFieldProps) {
  const autoId = useId()
  const fieldId = id ?? `select-${autoId}`
  const labelId = `${fieldId}-label`
  const listId = `${fieldId}-list`

  const [open, setOpen] = useState(false)
  const [box, setBox] = useState<PopupBox | null>(null)
  const [cursor, setCursor] = useState(-1)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const search = useRef({ text: '', at: 0 })

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null

  const close = useCallback((focusTrigger = true) => {
    setOpen(false)
    setCursor(-1)
    if (focusTrigger) triggerRef.current?.focus()
  }, [])

  const pick = useCallback(
    (i: number) => {
      const o = options[i]
      if (!o) return
      onChange(o.value)
      close()
    },
    [options, onChange, close],
  )

  // раскрываем вниз, а если снизу тесно: вверх; в обоих случаях режем высоту
  // по свободному месту, чтобы список никогда не уезжал за экран
  const place = useCallback(() => {
    const t = triggerRef.current
    if (!t) return
    const r = t.getBoundingClientRect()
    const wanted = Math.min(options.length * OPTION_H + 12, 264)
    const below = window.innerHeight - r.bottom - GAP - EDGE
    const above = r.top - GAP - EDGE
    const up = below < wanted && above > below
    const maxHeight = Math.max(120, Math.min(wanted, up ? above : below))
    setBox({
      left: r.left,
      top: up ? r.top - GAP - maxHeight : r.bottom + GAP,
      width: r.width,
      maxHeight,
      up,
    })
  }, [options.length])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  // клик мимо, скролл и ресайз: закрываем или пересчитываем позицию
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return
      close(false)
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
  }, [open, close, place])

  // держим активный пункт в зоне видимости
  useEffect(() => {
    if (!open || cursor < 0) return
    listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' })
  }, [open, cursor])

  const toggle = () => {
    if (disabled) return
    if (open) close()
    else {
      setCursor(selectedIndex >= 0 ? selectedIndex : 0)
      setOpen(true)
    }
  }

  const step = (delta: number) => {
    setOpen(true)
    setCursor((c) => {
      const from = c < 0 ? selectedIndex : c
      const next = from + delta
      if (next < 0) return options.length - 1
      if (next >= options.length) return 0
      return next
    })
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        step(1)
        return
      case 'ArrowUp':
        e.preventDefault()
        step(-1)
        return
      case 'Home':
        if (!open) return
        e.preventDefault()
        setCursor(0)
        return
      case 'End':
        if (!open) return
        e.preventDefault()
        setCursor(options.length - 1)
        return
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (open && cursor >= 0) pick(cursor)
        else toggle()
        return
      case 'Escape':
        if (open) {
          e.preventDefault()
          close()
        }
        return
      case 'Tab':
        if (open) close(false)
        return
    }

    // поиск по первым буквам: «то» -> Toyota
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = Date.now()
      search.current.text = now - search.current.at > 900 ? e.key : search.current.text + e.key
      search.current.at = now
      const q = search.current.text.toLowerCase()
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(q))
      if (i >= 0) {
        setOpen(true)
        setCursor(i)
      }
    }
  }

  const popup = open && box && (
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      aria-labelledby={label ? labelId : undefined}
      className={clsx(styles.popup, box.up && styles.popupUp)}
      style={{ left: box.left, top: box.top, width: box.width, maxHeight: box.maxHeight }}
      tabIndex={-1}
    >
      {options.map((o, i) => (
        <li
          key={o.value}
          id={`${fieldId}-opt-${i}`}
          role="option"
          aria-selected={o.value === value}
          className={clsx(
            styles.option,
            i === cursor && styles.optionActive,
            o.value === value && styles.optionSelected,
          )}
          // click, а не pointerdown: иначе на телефоне пункт выбирается в
          // момент касания и список не пролистать
          onClick={() => pick(i)}
          // на тач-экране палец «наводится» на всё, мимо чего проезжает
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse') setCursor(i)
          }}
        >
          {o.label}
        </li>
      ))}
    </ul>
  )

  return (
    <div className={clsx(styles.wrap, className)}>
      {label && (
        <span className={styles.label} id={labelId}>
          {label}
        </span>
      )}

      <div className={styles.control}>
        <button
          ref={triggerRef}
          id={fieldId}
          type="button"
          className={clsx(styles.trigger, !selected && styles.empty, error && styles.invalid)}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && cursor >= 0 ? `${fieldId}-opt-${cursor}` : undefined}
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : placeholder}
          disabled={disabled}
          onClick={toggle}
          onKeyDown={onKeyDown}
        >
          <span className={styles.value}>{selected ? selected.label : placeholder}</span>
          <span className={styles.chevron} aria-hidden />
        </button>
      </div>

      {popup && createPortal(popup, document.body)}
      {name && <input type="hidden" name={name} value={value} />}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
