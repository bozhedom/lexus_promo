import styles from './Divider.module.scss'

// Разделитель: две градиент-линии и ромб по центру
export function Divider({ className }: { className?: string }) {
  return (
    <div className={`${styles.divider}${className ? ` ${className}` : ''}`} aria-hidden>
      <span className={styles.line} />
      <span className={styles.rhombus} />
      <span className={styles.line} />
    </div>
  )
}
