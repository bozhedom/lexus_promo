'use client'

import Image from 'next/image'
import { useState } from 'react'

import { Button, Divider } from '@/shared/ui'
import { GUEST_NAME, INVITE_LINKS } from '../../config/content'
import { useInviteSession } from '../../model/useInviteSession'
import { ActionLink } from '../ActionLink'
import { BenefitTiles } from '../BenefitTiles'
import { CertificateRail } from '../CertificateRail'
import { CertificatesModal } from '../CertificatesModal'
import styles from './InviteTestScreen.module.scss'

export function InviteTestScreen() {
  const [open, setOpen] = useState(false)
  const delivery = useInviteSession(GUEST_NAME)

  return (
    <main className={styles.screen}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <h1 className={styles.name}>{GUEST_NAME}</h1>
          <p className={styles.lead}>Ваши персональные пригласительные</p>
          <Divider className={styles.divider} />
          <p className={styles.invite}>Ждем вас в гости!</p>
        </header>

        <CertificateRail />
        <BenefitTiles />

        <Button variant="outline" block className={styles.cta} onClick={() => setOpen(true)}>
          <Image
            src="/invite-test/icon-mail.svg"
            alt=""
            width={28}
            height={28}
            className={styles.ctaIcon}
          />
          <span className={styles.ctaLabel}>Скачать пригласительные сертификаты</span>
          <Image
            src="/invite-test/icon-download.svg"
            alt=""
            width={24}
            height={24}
            className={styles.ctaIcon}
          />
        </Button>

        <nav className={styles.links}>
          {INVITE_LINKS.map((link) => (
            <ActionLink key={link.id} link={link} />
          ))}
        </nav>
      </div>

      {open && <CertificatesModal delivery={delivery} onClose={() => setOpen(false)} />}
    </main>
  )
}
