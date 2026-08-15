'use client'

import clsx from 'clsx'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { createTypeahead, type SelectOption } from './options'
import { SelectPopup } from './SelectPopup'
import { usePopupPlacement } from './usePopupPlacement'
import styles from './SelectField.module.scss'

export type { SelectOption }

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

/**
 * Свой выпадающий список: системный select рисует попап силами ОС, оформить его
 * нельзя. Умеет клавиатуру и поиск по первым буквам.
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
  const [cursor, setCursor] = useState(-1)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const typeahead = useRef(createTypeahead())

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null

  const close = useCallback((focusTrigger = true) => {
    setOpen(false)
    setCursor(-1)
    if (focusTrigger) triggerRef.current?.focus()
  }, [])

  const dismiss = useCallback(() => close(false), [close])

  const box = usePopupPlacement({
    open,
    optionCount: options.length,
    triggerRef,
    listRef,
    onDismiss: dismiss,
  })

  const pick = useCallback(
    (index: number) => {
      const option = options[index]
      if (!option) return
      onChange(option.value)
      close()
    },
    [options, onChange, close],
  )

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
    setCursor((current) => {
      const from = current < 0 ? selectedIndex : current
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

    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const found = typeahead.current(e.key, options)
      if (found >= 0) {
        setOpen(true)
        setCursor(found)
      }
    }
  }

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

      {open &&
        box &&
        createPortal(
          <SelectPopup
            listRef={listRef}
            id={listId}
            labelledBy={label ? labelId : undefined}
            fieldId={fieldId}
            box={box}
            options={options}
            value={value}
            cursor={cursor}
            onPick={pick}
            onHover={setCursor}
          />,
          document.body,
        )}
      {name && <input type="hidden" name={name} value={value} />}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
