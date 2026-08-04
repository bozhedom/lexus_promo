import Image from 'next/image'

import type { Certificate } from '../../model/types'
import styles from './CertificateCard.module.scss'

export function CertificateCard({ certificate }: { certificate: Certificate }) {
  return (
    <figure className={styles.card}>
      <Image src={certificate.image} alt={certificate.alt} width={120} height={220} />
    </figure>
  )
}
