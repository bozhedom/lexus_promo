import Image from 'next/image'

import type { Certificate, PersonalInviteDetails } from '../../model/types'
import styles from './CertificateCard.module.scss'

interface CertificateCardProps {
  certificate: Certificate
  details: PersonalInviteDetails
}

export function CertificateCard({ certificate, details }: CertificateCardProps) {
  const gift = certificate.id === 'gift'
  const car = [details.brand, details.model, details.year].filter(Boolean).join(' ')
  const amount = new Intl.NumberFormat('ru-RU').format(details.amount)

  return (
    <article className={styles.card} data-kind={gift ? 'gift' : 'diagnostics'}>
      <Image
        className={styles.logo}
        src="/images/redesign/lexus-logo.svg"
        alt="Lexus"
        width={154}
        height={28}
      />
      <span className={styles.kicker}>
        {gift ? 'Подарок в честь знакомства' : 'Персональный сертификат'}
      </span>
      {gift ? (
        <strong className={styles.amount}>{amount} ₽</strong>
      ) : (
        <strong className={styles.title}>Комплексная диагностика</strong>
      )}
      <span className={styles.for}>для</span>
      <span className={styles.name}>{details.fullName}</span>
      <span className={styles.car}>{car}</span>
      {details.plate && <span className={styles.plate}>{details.plate}</span>}
    </article>
  )
}
