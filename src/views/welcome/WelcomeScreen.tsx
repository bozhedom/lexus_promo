'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'

import { useScreenView } from '@/shared/analytics'
import { OUTBOUND_LINKS } from '@/shared/config/links'
import { useFunnel } from '@/shared/lib/funnel'
import { useSceneAssets } from '@/shared/lib/useSceneAssets'
import { useStageTransition } from '@/widgets/curtain-transition'
import { Button } from '@/shared/ui'
import styles from './WelcomeScreen.module.scss'

const booking = OUTBOUND_LINKS.find((link) => link.id === 'booking')!
const introCurtainEnabled = process.env.NEXT_PUBLIC_INTRO_CURTAIN_ENABLED === 'true'

type BrandVariant = 'toyota' | 'lexus' | 'both'

const STAGE_IMAGE: Record<BrandVariant, string> = {
  toyota: '/images/redesign/intro-stage-toyota.webp',
  lexus: '/images/redesign/intro-stage.webp',
  // Для общего QR оставляем премиальный Lexus-кадр, а заголовок сообщает,
  // что приглашение действует для владельцев обеих марок.
  both: '/images/redesign/intro-stage.webp',
}

// Экран 1: приглашение. Клик по CTA закрывает занавес и открывает его уже на шаге 2.
export function WelcomeScreen({ brand = 'both' }: { brand?: BrandVariant }) {
  const { track } = useFunnel()
  const { go, busy } = useStageTransition()
  const stageImage = STAGE_IMAGE[brand]
  const assetsReady = useSceneAssets([stageImage, '/images/logo-agc.svg'])
  useScreenView('welcome')

  const start = () => {
    track('cta_click')
    go('/car-number')
  }

  return (
    <main
      className={styles.screen}
      data-ready={assetsReady}
      data-brand={brand}
      style={{ '--welcome-stage-image': `url(${stageImage})` } as CSSProperties}
    >
      {introCurtainEnabled && (
        <div className={styles.introCurtain} data-active={assetsReady || undefined} aria-hidden>
          <span className={`${styles.introPanel} ${styles.introLeft}`} />
          <span className={`${styles.introPanel} ${styles.introRight}`} />
          <span className={styles.introSeam} />
        </div>
      )}

      <div className={styles.stage} aria-hidden />

      <div className={styles.content}>
        <header className={styles.brand}>
          <Image
            className={styles.logo}
            src="/images/logo-agc.svg"
            alt="АвтоГарантСити"
            width={94}
            height={45}
            priority
          />
          <p className={styles.carBrand}>
            {brand === 'both' ? (
              <><span>Toyota</span><i aria-hidden /><span>Lexus</span></>
            ) : brand === 'toyota' ? 'Toyota' : 'Lexus'}
          </p>
          <p className={styles.spec}>
            Специализированный
            <br />
            техцентр от «АвтоГарантСити»
          </p>
        </header>

        {/* Безопасная зона оставляет решётку автомобиля открытой. Ниже все
            текстовые блоки и кнопки идут единым ритмом без auto-распорок. */}
        <div className={styles.viewport} aria-hidden />

        <div className={styles.lower}>
          <section className={styles.invitation}>
            <h1>
              Персональное
              <br />
              приглашение
            </h1>
            <span className={styles.spark} aria-hidden />
            <p>
              Вы и Ваш автомобиль приглашены
              <br />
              в новый специализированный техцентр
            </p>
          </section>

          <div className={styles.actions}>
            <Button className={styles.cta} onClick={start} disabled={busy}>
              Получить приглашение <span aria-hidden>⟶</span>
            </Button>

            <a
              className={styles.booking}
              href={booking.href}
              target={booking.external ? '_blank' : undefined}
              rel={booking.external ? 'noopener noreferrer' : undefined}
              onClick={() => track('outbound_click', { id: booking.id, url: booking.href })}
            >
              Рассчитать и записаться
            </a>
          </div>

          <p className={styles.tagline}>Дело, как искусство</p>
        </div>
      </div>
    </main>
  )
}
