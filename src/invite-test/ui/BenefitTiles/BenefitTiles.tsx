import Image from 'next/image'

import { BENEFITS } from '../../config/content'
import styles from './BenefitTiles.module.scss'

export function BenefitTiles() {
  return (
    <ul className={styles.tiles}>
      {BENEFITS.map((benefit) => (
        <li key={benefit.id} className={styles.tile}>
          <Image src={benefit.icon} alt="" width={36} height={36} className={styles.icon} />
          <p className={styles.title}>{benefit.title}</p>
          <p className={styles.text}>{benefit.text}</p>
        </li>
      ))}
    </ul>
  )
}
