'use client'

import Image from 'next/image'
import clsx from 'clsx'
import type { ReactNode } from 'react'

import { NewsSlider } from '@/widgets/news-slider'
import { useSceneAssets } from '@/shared/lib/useSceneAssets'
import styles from './StageLayout.module.scss'

const STAGE_ASSETS = [
  '/images/redesign/form-stage.webp',
  '/images/redesign/form-stage-hands.webp',
  '/images/logo-agc.svg',
] as const

interface StageLayoutProps {
  subtitle: ReactNode
  children: ReactNode
  cardClassName?: string
  secureInside?: boolean
}

// Каркас экранов 2-4: сцена, заголовок «В ЧИСЛЕ ПЕРВЫХ», карточка формы, футер
export function StageLayout({ subtitle, children, cardClassName, secureInside = false }: StageLayoutProps) {
  const assetsReady = useSceneAssets(STAGE_ASSETS)
  const secure = (
    <p className={styles.secure}>
      <Image src="/images/icon-shield.svg" alt="" width={20} height={20} />
      <span>Ваши данные защищены и не передаются третьим лицам</span>
    </p>
  )

  return (
    <div className={styles.page} data-ready={assetsReady}>
      <section className={styles.stage}>
        <div className={styles.scene} aria-hidden>
          <div className={styles.sceneBox}>
            <span className={styles.smoke} />
          </div>
          <span className={styles.dim} />
        </div>

        <div className={styles.inner}>
          <Image
            className={styles.logo}
            src="/images/logo-agc.svg"
            alt="АвтоГарантСити"
            width={84}
            height={40}
            priority
          />

          <header className={styles.header}>
            <p className={styles.eyebrow}>получите приглашение</p>
            <h1 className={styles.title}>В числе первых</h1>
            <span className={styles.divider} aria-hidden />
            <p className={styles.subtitle}>{subtitle}</p>
          </header>

          <div className={clsx(styles.card, cardClassName)}>
            {children}
            {secureInside && secure}
          </div>

          {!secureInside && secure}
        </div>

        <div className={styles.hands} aria-hidden>
          <div className={styles.handsBox} />
        </div>
      </section>

      <NewsSlider />
    </div>
  )
}
