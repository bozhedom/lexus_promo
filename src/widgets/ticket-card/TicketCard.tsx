import Image from 'next/image'
import { forwardRef } from 'react'

import styles from './TicketCard.module.scss'

// Приложенная заказчиком иконка 40×40. Data URL оставляет исходный PNG без
// перерисовки и гарантированно попадает в сохраняемый через html-to-image файл.
const HANDSHAKE_ICON =
  'data:image/png;base64,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'

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

        <section className={styles.guest}>
          <Image
            src={HANDSHAKE_ICON}
            alt=""
            width={40}
            height={40}
            unoptimized
          />
          <p>Ждем Вас в гости</p>
        </section>

        <footer className={styles.trust}>
          <p>Доверие. Качество. Забота</p>
        </footer>
      </div>
    </div>
  )
})
