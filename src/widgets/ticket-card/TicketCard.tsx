import Image from 'next/image'
import { forwardRef } from 'react'

import styles from './TicketCard.module.scss'

export interface TicketCardProps {
  fullName: string
  brand: string
  model: string
  year: number | null
  plate: string
  amount: number
  onMeet?: () => void
}

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value

// Персональный экран команды. Ref остаётся на всём макете, чтобы существующий
// механизм сохранения PNG продолжал работать без изменений.
export const TicketCard = forwardRef<HTMLDivElement, TicketCardProps>(function TicketCard(
  { fullName, onMeet },
  ref,
) {
  const displayName = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(capitalize)
    .join(' ')

  return (
    <div className={styles.card} ref={ref}>
      <span className={styles.backdrop} aria-hidden />

      <div className={styles.content}>
        <header className={styles.heading}>
          <h1>{displayName}</h1>
          <p>Ваши персональные пригласительные готовы</p>
          <span className={styles.ornament} aria-hidden><i /></span>
          <h2>Ждем Вас в гости!</h2>
        </header>

        <section className={styles.teamCard}>
          <header className={styles.teamHeading}>
            <p>Ваша персональная</p>
            <h3>Команда автомобиля</h3>
            <span className={styles.ornament} aria-hidden><i /></span>
          </header>

          <div className={styles.teamVisual} aria-hidden>
            <Image
              className={styles.car}
              src="/images/redesign/invite-car.webp"
              alt=""
              width={1024}
              height={1450}
              priority
              unoptimized
            />
            <Image
              className={styles.people}
              src="/images/redesign/invite-team.webp"
              alt=""
              width={1024}
              height={1450}
              priority
              unoptimized
            />
            <span className={styles.visualFade} />
          </div>

          <div className={styles.teamNames}>
            <div>
              <small>Ваш автосекретарь</small>
              <strong className={styles.secretary}>Любовь</strong>
            </div>
            <span className={styles.nameDivider} aria-hidden><i /></span>
            <div>
              <small>Ваш главный механик</small>
              <strong className={styles.mechanic}>Александр</strong>
            </div>
          </div>

          <button type="button" className={styles.meet} onClick={onMeet}>
            Познакомиться
          </button>
        </section>

        <footer className={styles.trust}>
          <p>Доверие. Качество. Забота</p>
          <small>Ваш автомобиль — наша ответственность</small>
        </footer>
      </div>
    </div>
  )
})
