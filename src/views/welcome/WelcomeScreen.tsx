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

// Иконки преимуществ обведены по кадру Figma: коробка с бантом, ножницы,
// перерезающие ленту (открытие техцентра), и бриллиант. Пропорции у всех трёх
// разные, поэтому viewBox у каждой свой, а в ряд они выравниваются по высоте.
function BenefitIcon({ kind }: { kind: 'gift' | 'scissors' | 'diamond' }) {
  if (kind === 'gift') {
    return (
      <svg viewBox="0 0 28 30" aria-hidden>
        <path d="M14 8.5c-2.6 0-5.6-.4-6.8-1.9-1.3-1.7.3-4.2 2.7-3.6C12.3 3.6 13.5 6.2 14 8.5Z" />
        <path d="M14 8.5c2.6 0 5.6-.4 6.8-1.9 1.3-1.7-.3-4.2-2.7-3.6C15.7 3.6 14.5 6.2 14 8.5Z" />
        <rect x="0.5" y="8.5" width="27" height="5.5" rx="0.8" />
        <path d="M3 14h22v14.1a1.4 1.4 0 0 1-1.4 1.4H4.4A1.4 1.4 0 0 1 3 28.1Z" />
        <path d="M14 8.5v21" />
      </svg>
    )
  }
  if (kind === 'scissors') {
    return (
      <svg viewBox="0 0 37 29" aria-hidden>
        {/* лента уходит за лезвия, поэтому собрана из отрезков */}
        <path d="M0.4 3.7h11.2M25.9 3.4h10.7M0.4 8.9h11.2M27.6 8.6h9M16.4 6.2h9.3" />
        <path d="m21.4 6.4 2.2-5.9 2.1 5.3" />
        <path d="M12.9.4c-.7 5.2 1.7 11 4.5 15l3.2 4.4 2-1.5-3.2-4.4C16.6 10 14.6 5 12.9.4Z" />
        <path d="M24.5.4c.7 5.2-1.7 11-4.5 15l-3.2 4.4-2-1.5 3.2-4.4C20.8 10 22.8 5 24.5.4Z" />
        <path d="m21.6 19.4 4.4 3.2M15.8 19.4l-4.4 3.2" />
        <circle cx="18.7" cy="16.6" r="0.8" />
        <circle cx="28.4" cy="23.9" r="4.3" />
        <circle cx="28.4" cy="23.9" r="2" />
        <circle cx="8.2" cy="24.2" r="4.3" />
        <circle cx="8.2" cy="24.2" r="2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 31 28" aria-hidden>
      <path d="M5.9.5h19.2l5.4 9-15 18-15-18Z" />
      <path d="M.5 9.5h30" />
      <path d="M11.2.5 10 9.5M19.8.5 21 9.5" />
      <path d="M10 9.5l5.5 18M21 9.5l-5.5 18" />
    </svg>
  )
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
            width={150}
            height={72}
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

        {/* Свободная высота уходит сюда: на высоком экране распорка растягивает
            композицию, на низком сжимается раньше текста и кнопок. */}
        <div className={styles.viewport} aria-hidden />

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
          {/* Переносы строк проставлены руками: в макете у каждой колонки свой
              разрыв, а автоматический зависит от ширины экрана. */}
          <article>
            <BenefitIcon kind="gift" />
            <strong>Персональный<br />подарок</strong>
            <span>каждому гостю</span>
          </article>
          <i />
          <article>
            <BenefitIcon kind="scissors" />
            <strong>Специальные<br />условия открытия</strong>
            <span>только для приглашенных</span>
          </article>
          <i />
          <article>
            <BenefitIcon kind="diamond" />
            <strong>Премиум сервис<br />высокого уровня</strong>
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
