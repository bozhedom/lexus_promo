'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

import { useScreenView } from '@/shared/analytics'
import { useFunnel } from '@/shared/lib/funnel'
import { useSceneAssets } from '@/shared/lib/useSceneAssets'
import { Button, Divider } from '@/shared/ui'
import { GUEST_NAME, INVITE_LINKS } from '../../config/content'
import { useInviteSession } from '../../model/useInviteSession'
import type { PersonalInviteDetails } from '../../model/types'
import { ActionLink } from '../ActionLink'
import { BenefitTiles } from '../BenefitTiles'
import { CertificateRail } from '../CertificateRail'
import { CertificatesModal } from '../CertificatesModal'
import styles from './InviteTestScreen.module.scss'

const INVITE_ASSETS = [
  '/images/redesign/invite-car.webp',
  '/images/redesign/invite-center.webp',
  '/images/redesign/invite-team.webp',
  '/images/redesign/lexus-logo.svg',
] as const

export function InviteTestScreen() {
  const [open, setOpen] = useState(false)
  const assetsReady = useSceneAssets(INVITE_ASSETS)
  const { data, ready } = useFunnel()
  const guestName = data.fullName?.trim() || GUEST_NAME
  const details = useMemo<PersonalInviteDetails>(
    () => ({
      fullName: guestName,
      brand: data.carBrand?.trim() || 'Lexus',
      model: data.carModel?.trim() || '',
      year: data.carYear ?? null,
      plate: data.plateNumber?.trim().toUpperCase() || '',
      amount: data.certificateAmount ?? 1500,
    }),
    [data.carBrand, data.carModel, data.carYear, data.certificateAmount, data.plateNumber, guestName],
  )
  const delivery = useInviteSession(ready ? details : null)
  useScreenView('final')

  return (
    <main className={styles.screen} data-ready={assetsReady}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <h1 className={styles.name}>{guestName}</h1>
          <p className={styles.lead}>Ваши персональные пригласительные</p>
          <Divider className={styles.divider} />
          <p className={styles.invite}>Ждем вас в гости!</p>
        </header>

        <CertificateRail details={details} />
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

      {open && (
        <CertificatesModal
          delivery={delivery}
          details={details}
          onClose={() => setOpen(false)}
        />
      )}
    </main>
  )
}
