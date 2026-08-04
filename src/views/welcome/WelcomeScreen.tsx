'use client'

import Image from 'next/image'

import { useScreenView } from '@/shared/analytics'
import { useFunnel } from '@/shared/lib/funnel'
import { AnimatedCar } from '@/widgets/animated-car'
import { useStageTransition } from '@/widgets/curtain-transition'
import { Button } from '@/shared/ui'
import styles from './WelcomeScreen.module.scss'

// Экран 1: приглашение. Клик по CTA закрывает занавес и открывает его уже на шаге 2.
export function WelcomeScreen() {
  const { track } = useFunnel()
  const { go, busy } = useStageTransition()
  useScreenView('welcome')

  const start = () => {
    track('cta_click')
    go('/car-number')
  }

  return (
    <main className={styles.screen}>
      <AnimatedCar />

      <div className={styles.content}>
        <div className={styles.top}>
          <Image
            className={styles.logo}
            src="/images/logo-agc.svg"
            alt="АвтоГарантСити"
            width={150}
            height={72}
            priority
          />

          <Image
            className={styles.wordmark}
            src="/images/toyota-lexus-wordmark.svg"
            alt="Toyota Lexus"
            width={488}
            height={53}
            priority
          />

          <p className={styles.spec}>Специализированный автоцентр от «АвтоГарантСити»</p>
        </div>

        <div className={styles.bottom}>
          <p className={styles.script}>
            Мы изменим Ваше
            <br />
            представление об автосервисе
          </p>

          <p className={styles.invite}>
            Приглашаем вас лично на тех. открытие
            <br />
            персональный подарок в честь знакомства
          </p>

          <Button variant="outline" className={styles.cta} onClick={start} disabled={busy}>
            Получить приглашение и подарок
          </Button>

          <p className={styles.tagline}>
            сравни цены и сервис
            <br />
            почувствуй разницу
          </p>
        </div>
      </div>
    </main>
  )
}
