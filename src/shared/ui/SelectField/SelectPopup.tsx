import clsx from 'clsx'
import type { RefObject } from 'react'

import type { SelectOption } from './options'
import type { PopupBox } from './usePopupPlacement'
import styles from './SelectField.module.scss'

interface SelectPopupProps {
  listRef: RefObject<HTMLUListElement | null>
  id: string
  labelledBy?: string
  fieldId: string
  box: PopupBox
  options: SelectOption[]
  value: string
  cursor: number
  onPick: (index: number) => void
  onHover: (index: number) => void
}

export function SelectPopup({
  listRef,
  id,
  labelledBy,
  fieldId,
  box,
  options,
  value,
  cursor,
  onPick,
  onHover,
}: SelectPopupProps) {
  return (
    <ul
      ref={listRef}
      id={id}
      role="listbox"
      aria-labelledby={labelledBy}
      className={clsx(styles.popup, box.up && styles.popupUp)}
      style={{ left: box.left, top: box.top, width: box.width, maxHeight: box.maxHeight }}
      tabIndex={-1}
    >
      {options.map((option, index) => (
        <li
          key={option.value}
          id={`${fieldId}-opt-${index}`}
          role="option"
          aria-selected={option.value === value}
          className={clsx(
            styles.option,
            index === cursor && styles.optionActive,
            option.value === value && styles.optionSelected,
            option.featured && styles.optionFeatured,
            // Черта отделяет группу (марки техцентра, ходовые марки) от следующей.
            option.divider && styles.optionFeaturedLast,
          )}
          // click, а не pointerdown: иначе на телефоне пункт выбирается в
          // момент касания и список не пролистать
          onClick={() => onPick(index)}
          // на тач-экране палец «наводится» на всё, мимо чего проезжает
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse') onHover(index)
          }}
        >
          {option.label}
        </li>
      ))}
    </ul>
  )
}
