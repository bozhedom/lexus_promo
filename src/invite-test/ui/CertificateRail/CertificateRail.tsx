import Image from 'next/image'

import type { PersonalInviteDetails } from '../../model/types'
import styles from './CertificateRail.module.scss'

interface CertificateRailProps {
  details: PersonalInviteDetails
}

const carLabel = ({ brand, model, year }: PersonalInviteDetails) =>
  [brand, model, year].filter(Boolean).join(' ')

export function CertificateRail({ details }: CertificateRailProps) {
  const amount = new Intl.NumberFormat('ru-RU').format(details.amount)

  return (
    <div className={styles.rail} aria-label="Персональные сертификаты">
      <article className={styles.slide} data-kind="diagnostics">
        <Image
          className={styles.logo}
          src="/images/redesign/lexus-logo.svg"
          alt="Lexus"
          width={154}
          height={28}
        />
        <span className={styles.eyebrow}>Персональный сертификат</span>
        <strong className={styles.title}>Комплексная диагностика</strong>
        <span className={styles.person}>{details.fullName}</span>
        <span className={styles.car}>{carLabel(details)}</span>
        {details.plate && <span className={styles.plate}>{details.plate}</span>}
      </article>

      <article className={styles.slide} data-kind="gift">
        <Image
          className={styles.logo}
          src="/images/redesign/lexus-logo.svg"
          alt="Lexus"
          width={154}
          height={28}
        />
        <span className={styles.eyebrow}>Подарок в честь знакомства</span>
        <strong className={styles.amount}>{amount} ₽</strong>
        <span className={styles.person}>{details.fullName}</span>
        <span className={styles.car}>{carLabel(details)}</span>
        {details.plate && <span className={styles.plate}>{details.plate}</span>}
      </article>
    </div>
  )
}
