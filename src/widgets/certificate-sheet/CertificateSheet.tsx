'use client'

import type { CSSProperties } from 'react'

import {
  CERT_LAYOUT,
  certificateCopy,
  certificateFace,
  formatPlateLine,
  isToyota,
  plateParts,
  splitGuestName,
  type CertificateKind,
} from './layout'
import styles from './CertificateSheet.module.scss'

export interface CertificateSheetProps {
  kind: CertificateKind
  /** Марка из заявки: от неё зависят и кадр, и надпись над автомобилем. */
  brand: string
  /** Имя и отчество гостя. На превью до заполнения формы — «Ваше имя». */
  name: string
  /** «Lexus RX»: марка с моделью над строкой номера. На превью не показывается. */
  carTitle?: string | null
  /** Госномер гостя: печатается и в подписи, и прямо на кадре автомобиля. */
  plate?: string | null
  amount?: number
  className?: string
}

/**
 * Пригласительный сертификат как разметка, а не картинка: он раскрывается на
 * весь экран, а превью в модалке — тот же компонент в меньшем масштабе, чтобы
 * маленькая и большая карточки не могли разъехаться.
 *
 * Все размеры заданы в `--u` — это один пиксель макета шириной 360. По высоте
 * кадр тянется от 640u и выше: лишнюю высоту забирают два зазора вокруг марки,
 * между которыми на фотографии стоит автомобиль.
 */
export function CertificateSheet({
  kind,
  brand,
  name,
  carTitle,
  plate,
  amount = 1500,
  className,
}: CertificateSheetProps) {
  const toyota = isToyota(brand)
  const face = certificateFace(kind, brand)
  const copy = certificateCopy(kind, amount)
  const nameLines = splitGuestName(name)
  const onCar = plate ? plateParts(plate) : null

  return (
    <article
      className={`${styles.sheet}${className ? ` ${className}` : ''}`}
      style={{ '--sheet-photo': `url(${face.photo})` } as CSSProperties}
    >
      {/* Кадр лежит отдельным слоем со своей пропорцией: когда сертификат
          растянут по высоте, номер должен ехать вместе с фотографией, а не с
          рамкой сертификата. */}
      <div className={styles.photo} aria-hidden>
        {onCar && face.plate && (
          <span
            className={styles.carPlate}
            // Слой кадра ровно 360×640 макетных пикселей, поэтому доли рамки
            // знака переводим в те же единицы, что и вся остальная вёрстка.
            style={
              {
                '--plate-left': face.plate.x * CERT_LAYOUT.width,
                '--plate-top': face.plate.y * CERT_LAYOUT.height,
                '--plate-width': face.plate.w * CERT_LAYOUT.width,
              } as CSSProperties
            }
          >
            <b>{onCar.first}</b>
            <i>{onCar.digits}</i>
            <b>{onCar.last}</b>
            <u>{onCar.region}</u>
          </span>
        )}
      </div>
      <div className={styles.veil} aria-hidden />
      <div className={styles.border} aria-hidden />

      <header className={styles.top}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.crown} src="/images/cert/crown.svg" alt="" />

        <p className={styles.eyebrow}>Персональное приглашение</p>

        <Rule />

        <h2 className={styles.name}>
          {nameLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>

        <Rule />

        {carTitle && (
          <p className={styles.carLine}>
            <span>{carTitle}</span>
            {plate && (
              <>
                <i aria-hidden />
                <span>{formatPlateLine(plate)}</span>
              </>
            )}
          </p>
        )}

        <p className={styles.invite}>
          приглашаем Вас в новый
          <br />
          специализированный техцентр
        </p>
      </header>

      <span className={styles.gapTop} aria-hidden />

      <div className={styles.brand}>
        {toyota ? (
          <p className={styles.wordmarkToyota}>TOYOTA</p>
        ) : (
          // Логотип взят из того же фрейма Figma: у копии в /redesign другая
          // пропорция, и в кадре сертификата она была бы уже макетной.
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className={styles.wordmark} src="/images/cert/lexus.svg" alt="Lexus" />
        )}
        <p className={styles.from}>от «АвтоГарантСити»</p>
      </div>

      <span className={styles.gapBrand} aria-hidden />

      <div className={styles.panelWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.giftIcon} src="/images/cert/gift.svg" alt="" />

        <div className={styles.panel}>
          <span className={styles.panelEyebrow}>
            {copy.eyebrow.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
          <strong className={copy.amount ? styles.panelAmount : styles.panelTitle}>
            {copy.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </strong>
          <span className={styles.panelNote}>{copy.note}</span>
        </div>
      </div>

      <span className={styles.gapPanel} aria-hidden />

      <div className={styles.contacts}>
        <p className={styles.contact}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/cert/marker.svg" alt="" />
          <span>
            {face.address.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        </p>

        <p className={styles.contact}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/cert/phone.svg" alt="" />
          <span>
            <span>{CERT_LAYOUT.phone}</span>
            <span>Без выходных</span>
          </span>
        </p>
      </div>

      <span className={styles.gapContacts} aria-hidden />

      <p className={styles.legal}>Действителен только для этого автомобиля</p>

      <span className={styles.gapFoot} aria-hidden />
    </article>
  )
}

/** Золотая черта с ромбом посередине: линии гаснут к краям, как в макете. */
function Rule() {
  return (
    <span className={styles.rule} aria-hidden>
      <i />
      <b />
      <i />
    </span>
  )
}
