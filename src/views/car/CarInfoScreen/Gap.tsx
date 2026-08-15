import type { CSSProperties } from 'react'

import styles from './CarInfoScreen.module.scss'

/**
 * Зазор между блоками карточки. Высота у него не своя: свободную высоту экрана
 * зазоры делят между собой пропорционально макету (39:3661), поэтому карточка
 * всегда занимает окно целиком, а не оставляет пустое место снизу.
 */
export function Gap({ size }: { size: number }) {
  return <span className={styles.gap} style={{ '--gap': size } as CSSProperties} aria-hidden />
}
