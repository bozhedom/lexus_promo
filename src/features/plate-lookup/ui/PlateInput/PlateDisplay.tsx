import Image from 'next/image'
import type { PointerEvent as ReactPointerEvent } from 'react'

import { MAIN_SLOT_KINDS } from '../../lib/mask'
import type { Caret, PlatePart } from '../../lib/caret'
import styles from './PlateInput.module.scss'

const MAIN_PLACEHOLDER = 'А000АА'
const REGION_PLACEHOLDER = '000'

interface PlateDisplayProps {
  main: string[]
  region: string[]
  caret: Caret
  caretVisible: boolean
  onPickSlot: (part: PlatePart, e: ReactPointerEvent<HTMLDivElement>) => void
}

/** Крупный вариант рисует настоящий знак: цифры крупнее букв, регион отдельным блоком. */
export function PlateDisplay({
  main,
  region,
  caret,
  caretVisible,
  onPickSlot,
}: PlateDisplayProps) {
  const anyFilled = main.some(Boolean)
  const regionFilled = region.some(Boolean)

  return (
    <>
      <div
        className={styles.mainBlock}
        data-focus={(caretVisible && caret.part === 'main') || undefined}
        onPointerDown={(e) => onPickSlot('main', e)}
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
                {ch || ' '}
              </span>
            )
          })}
        </span>
      </div>

      <div
        className={styles.regionBlock}
        data-focus={(caretVisible && caret.part === 'region') || undefined}
        onPointerDown={(e) => onPickSlot('region', e)}
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
                {ch || ' '}
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
    </>
  )
}
