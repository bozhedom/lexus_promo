import Image from 'next/image'

import type { InviteLink } from '../../config/content'
import styles from './ActionLink.module.scss'

export function ActionLink({ link }: { link: InviteLink }) {
  return (
    <a className={styles.link} href={link.href} target="_blank" rel="noopener noreferrer">
      <Image src={link.icon} alt="" width={28} height={28} className={styles.icon} />
      <span className={styles.label}>{link.label}</span>
      <Image
        src="/invite-test/icon-chevron.svg"
        alt=""
        width={24}
        height={24}
        className={styles.chevron}
      />
    </a>
  )
}
