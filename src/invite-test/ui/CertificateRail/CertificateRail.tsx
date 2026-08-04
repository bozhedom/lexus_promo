import Image from 'next/image'

import styles from './CertificateRail.module.scss'

const SLIDES = ['Сертификат на комплексную диагностику', 'Подарок в честь знакомства']

export function CertificateRail() {
  return (
    <div className={styles.rail}>
      {SLIDES.map((alt) => (
        <figure key={alt} className={styles.slide}>
          <Image src="/invite-test/cert-wide.png" alt={alt} width={306} height={187} />
        </figure>
      ))}
    </div>
  )
}
