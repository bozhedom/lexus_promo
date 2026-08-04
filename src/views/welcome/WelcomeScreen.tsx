'use client'

import Image from 'next/image'

import { useScreenView } from '@/shared/analytics'
import { OUTBOUND_LINKS } from '@/shared/config/links'
import { useFunnel } from '@/shared/lib/funnel'
import { useSceneAssets } from '@/shared/lib/useSceneAssets'
import { useStageTransition } from '@/widgets/curtain-transition'
import { Button } from '@/shared/ui'
import styles from './WelcomeScreen.module.scss'

const booking = OUTBOUND_LINKS.find((link) => link.id === 'booking')!
const WELCOME_ASSETS = ['/images/redesign/intro-stage.webp', '/images/logo-agc.svg'] as const
const introCurtainEnabled = process.env.NEXT_PUBLIC_INTRO_CURTAIN_ENABLED === 'true'

function BenefitIcon({ kind }: { kind: 'gift' | 'plane' | 'diamond' }) {
  if (kind === 'gift') {
    return (
      <svg viewBox="0 0 36 36" aria-hidden>
        <path d="M5 14h26v17H5zM18 14v17M3 10h30v6H3zM18 10H10c-5 0-5-7-1-7 5 0 9 7 9 7Zm0 0h8c5 0 5-7 1-7-5 0-9 7-9 7Z" />
      </svg>
    )
  }
  if (kind === 'plane') {
    return (
      <svg viewBox="0 0 36 36" aria-hidden>
        <path d="m3 18 30-10-9 24-7-10-14-4Zm14 4 5-5M8 12l7 3M24 4l4 3" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 36 36" aria-hidden>
      <path d="M3 12 10 3h16l7 9-15 21L3 12Zm0 0h30M10 3l8 9 8-9M18 12v21" />
    </svg>
  )
}

// Экран 1: приглашение. Клик по CTA закрывает занавес и открывает его уже на шаге 2.
export function WelcomeScreen() {
  const { track } = useFunnel()
  const { go, busy } = useStageTransition()
  const assetsReady = useSceneAssets(WELCOME_ASSETS)
  useScreenView('welcome')

  const start = () => {
    track('cta_click')
    go('/car-number')
  }

  return (
    <main className={styles.screen} data-ready={assetsReady}>
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
            width={150}
            height={72}
            priority
          />
          <p className={styles.lexus}>Lexus</p>
          <p className={styles.spec}>
            Специализированный
            <br />
            техцентр от «АвтоГарантСити»
          </p>
        </header>

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

        <div className={styles.benefits}>
          <article>
            <BenefitIcon kind="gift" />
            <strong>Персональный подарок</strong>
            <span>каждому гостю</span>
          </article>
          <i />
          <article>
            <BenefitIcon kind="plane" />
            <strong>Специальные условия открытия</strong>
            <span>только для приглашенных</span>
          </article>
          <i />
          <article>
            <BenefitIcon kind="diamond" />
            <strong>Премиум сервис высокого уровня</strong>
            <span>для вашего автомобиля</span>
          </article>
        </div>

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
            Записаться
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm10 9h4M17 12v4" />
            </svg>
          </a>
        </div>

        <p className={styles.tagline}>Дело, как искусство</p>
      </div>
    </main>
  )
}
