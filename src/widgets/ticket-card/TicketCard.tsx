import Image from 'next/image'
import { forwardRef } from 'react'

import { formatPlate } from '@/features/plate-lookup'
import styles from './TicketCard.module.scss'

export interface TicketCardProps {
  fullName: string
  brand: string
  model: string
  year: number | null
  plate: string
  amount: number
}

// Виджет пригласительного (экран 5). Ref нужен для рендера карточки в PNG.
export const TicketCard = forwardRef<HTMLDivElement, TicketCardProps>(function TicketCard(
  { fullName, brand, model, year, plate, amount },
  ref,
) {
  const pretty = formatPlate(plate)
  const car = `${brand} ${model}`.trim().toUpperCase()

  return (
    <div className={styles.card} ref={ref}>
      {/* Коробка ровно по кадру фотографии: госномер лежит внутри неё, поэтому
          остаётся на бампере при любом соотношении сторон экрана. */}
      <span className={styles.scene}>
        <span className={styles.carPlate}>
          <span className={styles.carPlateMain}>{pretty.main}</span>
          <span className={styles.carPlateRegion}>
            <span className={styles.carPlateDigits}>{pretty.region}</span>
            <Image
              className={styles.carPlateFlag}
              src="/images/plate-rus-flag.svg"
              alt=""
              width={40}
              height={16}
            />
          </span>
        </span>
      </span>

      <p className={styles.frame}>Персональный пригласительный на тех.открытие</p>

      <p className={styles.brand}>
        <span className={styles.brandAccent}>TOYOTA</span>
        <span className={styles.brandSep}>|</span>
        <span className={styles.brandLight}>LEXUS</span>
      </p>
      <p className={styles.spec}>Специализированный автоцентр от «АвтоГарантСити»</p>

      <div className={styles.data}>
        <span className={styles.name}>{fullName.toUpperCase()}</span>
        <span className={styles.vline} />
        <span className={styles.car}>
          <b>{car}</b>
          {year ? <em className={styles.year}>{year}</em> : null}
        </span>
      </div>

      <div className={styles.gift}>
        <p className={styles.giftTitle}>Ваш персональный подарок</p>
        <p className={styles.amount}>{amount}₽</p>
        <p className={styles.giftSub}>
          <span className={styles.giftLine} />
          <span>В честь знакомства</span>
          <span className={styles.giftLine} />
        </p>
      </div>
    </div>
  )
})
