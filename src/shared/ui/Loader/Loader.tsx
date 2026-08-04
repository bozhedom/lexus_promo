import clsx from 'clsx'

import styles from './Loader.module.scss'

interface LoaderProps {
  /** `beam`: бегущий луч софита (в строку/на кнопку), `stage`, крупный на весь блок */
  variant?: 'beam' | 'stage'
  label?: string
  className?: string
}

/**
 * Загрузка в стилистике сцены: по кругу бежит луч прожектора. Дуга и свечение
 * это один контур с бегущим штрихом, поэтому они не расходятся.
 */
export function Loader({ variant = 'beam', label, className }: LoaderProps) {
  return (
    <span className={clsx(styles.wrap, styles[variant], className)} role="status">
      <svg className={styles.ring} viewBox="0 0 44 44" aria-hidden>
        <circle className={styles.track} cx="22" cy="22" r="19" />
        <circle className={styles.arc} cx="22" cy="22" r="19" />
      </svg>
      {label && <span className={styles.label}>{label}</span>}
    </span>
  )
}
