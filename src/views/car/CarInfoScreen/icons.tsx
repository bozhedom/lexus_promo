import styles from './CarInfoScreen.module.scss'

type StepIconKind = 'gift' | 'letter' | 'owner'

// Иконки обведены по кадру Figma. Раньше здесь стояли типографские символы
// (♧, ✉, ∞): они брались из системного шрифта, поэтому на разных телефонах
// отличались и размером, и начертанием.
export function StepIcon({ kind }: { kind: StepIconKind }) {
  if (kind === 'gift') {
    return (
      <svg className={styles.stepIcon} viewBox="0 0 26 28" aria-hidden>
        <path d="M13 8c-2.4 0-5.2-.4-6.3-1.8-1.2-1.5.2-3.9 2.4-3.4C11.5 3.3 12.6 5.8 13 8Z" />
        <path d="M13 8c2.4 0 5.2-.4 6.3-1.8 1.2-1.5-.2-3.9-2.4-3.4C14.5 3.3 13.4 5.8 13 8Z" />
        <rect x="0.6" y="8" width="24.8" height="5" rx="0.8" />
        <path d="M2.9 13h20.2v13.2a1.2 1.2 0 0 1-1.2 1.2H4.1a1.2 1.2 0 0 1-1.2-1.2Z" />
        <path d="M13 8v19.4" />
      </svg>
    )
  }
  if (kind === 'letter') {
    return (
      <svg className={styles.stepIcon} viewBox="0 0 28 26" aria-hidden>
        <path d="M11.2 5.4a2.8 2.8 0 0 1 5.6 0" />
        <path d="M6.2 5.4h15.6v6.4M6.2 5.4v6.4" />
        <path d="M9.6 8.4h8.8M9.6 11h8.8" />
        <path d="M2.5 10.4h23v13h-23z" />
        <path d="m2.5 10.4 11.5 8.4 11.5-8.4" />
      </svg>
    )
  }
  return (
    <svg className={styles.stepIcon} viewBox="0 0 28 25" aria-hidden>
      <path d="M0.5 24.5C0.5 22.4471 1.09958 20.4378 2.22712 18.7132C3.35465 16.9886 4.96212 15.622 6.85661 14.7774C8.7511 13.9327 10.8521 13.646 12.9075 13.9516C14.9629 14.2571 16.8854 15.142 18.4442 16.5M19.4 21.8333L22.1 24.5L27.5 19.1667M18.05 7.16667C18.05 10.8486 15.0279 13.8333 11.3 13.8333C7.57208 13.8333 4.55 10.8486 4.55 7.16667C4.55 3.48477 7.57208 0.5 11.3 0.5C15.0279 0.5 18.05 3.48477 18.05 7.16667Z" />
    </svg>
  )
}

export function StepCheck() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden>
      <path d="m3.2 7.3 2.7 2.8 4.9-5.4" />
    </svg>
  )
}
