'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'

import styles from './CertificateSheet.module.scss'

export type CertificateKind = 'diagnostics' | 'gift'

export interface CertificateSheetProps {
  kind: CertificateKind
  /** Марка из заявки: от неё зависят и кадр, и надпись над автомобилем. */
  brand: string
  /** Имя и отчество гостя. На превью до заполнения формы — «Ваше имя». */
  name: string
  /** «Lexus RX ┃ А 555 АА 125». На превью не показывается. */
  carLine?: string | null
  amount?: number
}

const ADDRESS = {
  diagnostics: ['Снеговая, 1', '«Таксопарк»'],
  gift: ['Шилкинская, 32а'],
} as const

const PHONE = '+7 (423) 2222-999'

export const isToyota = (brand: string) => /toyota|тойота/i.test(brand)

/**
 * Пригласительный сертификат как разметка, а не картинка: он открывается на
 * весь экран и должен точно попадать в кадр любого телефона.
 *
 * Все размеры заданы в `--u` — это один пиксель макета 360×800. Кадр целиком
 * вписывается в экран по меньшей из сторон, поэтому пропорции совпадают с
 * Figma, а за край ничего не уезжает.
 */
export function CertificateSheet({ kind, brand, name, carLine, amount = 1500 }: CertificateSheetProps) {
  const toyota = isToyota(brand)
  const photo =
    kind === 'gift'
      ? '/images/redesign/offer-oil.webp'
      : toyota
        ? '/images/cert-lift-toyota.png'
        : '/images/cert-lift-lexus.png'

  // «Валерий Михайлович» разбивается на две строки, «Ваше имя» остаётся одной:
  // короткая подпись в две строки выглядит как обрывок.
  const words = name.trim().split(/\s+/).filter(Boolean)
  const nameLines =
    words.length > 1 && words.join(' ').length > 13 ? [words[0], words.slice(1).join(' ')] : [words.join(' ')]
  const longest = Math.max(...nameLines.map((line) => line.length), 1)

  return (
    <article
      className={styles.sheet}
      data-kind={kind}
      style={{ '--sheet-photo': `url(${photo})`, '--name-fit': String(longest) } as CSSProperties}
    >
      <div className={styles.photo} aria-hidden />
      <div className={styles.veil} aria-hidden />

      <header className={styles.top}>
        <svg className={styles.crown} viewBox="0 0 64 44" aria-hidden>
          <path d="M4 40 8 12l12 12L32 4l12 20 12-12 4 28z" />
          <path d="M4 40h56" />
        </svg>

        <p className={styles.eyebrow}>Персональное приглашение</p>
        <span className={styles.rhombus} aria-hidden />

        <h2 className={styles.name}>
          {nameLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>

        {carLine && <p className={styles.carLine}>{carLine}</p>}

        <p className={styles.invite}>
          приглашаем Вас в наш новый
          <br />
          специализированный техцентр
        </p>

        {toyota ? (
          <p className={styles.wordmarkToyota}>TOYOTA</p>
        ) : (
          <Image
            className={styles.wordmark}
            src="/images/redesign/lexus-logo.svg"
            alt="Lexus"
            width={154}
            height={28}
          />
        )}

        <p className={styles.from}>от «АвтоГарантСити»</p>
      </header>

      <footer className={styles.bottom}>
        <svg className={styles.giftIcon} viewBox="0 0 28 30" aria-hidden>
          <path d="M14 8.5c-2.6 0-5.6-.4-6.8-1.9-1.3-1.7.3-4.2 2.7-3.6C12.3 3.6 13.5 6.2 14 8.5Z" />
          <path d="M14 8.5c2.6 0 5.6-.4 6.8-1.9 1.3-1.7-.3-4.2-2.7-3.6C15.7 3.6 14.5 6.2 14 8.5Z" />
          <rect x="0.6" y="8.5" width="26.8" height="5.4" rx="0.8" />
          <path d="M3 13.9h22v15.4H3z" />
          <path d="M14 8.5v20.8" />
        </svg>

        <div className={styles.panel}>
          <span className={styles.panelEyebrow}>Ваш персональный подарок</span>
          {kind === 'gift' ? (
            <>
              <strong className={styles.panelTitle}>на первую замену масла</strong>
              <strong className={styles.panelAmount}>
                {new Intl.NumberFormat('ru-RU').format(amount)} ₽
              </strong>
            </>
          ) : (
            <strong className={styles.panelTitle}>Сертификат на диагностику</strong>
          )}
          <span className={styles.panelNote}>в честь знакомства</span>
        </div>

        <div className={styles.contacts}>
          <p className={styles.contact}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="11" />
              <path d="M12 6.5c2 0 3.6 1.6 3.6 3.6 0 2.6-3.6 7.4-3.6 7.4S8.4 12.7 8.4 10.1c0-2 1.6-3.6 3.6-3.6Z" />
            </svg>
            <span>
              {ADDRESS[kind].map((line) => (
                <span key={line}>{line}</span>
              ))}
            </span>
          </p>

          <p className={styles.contact}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M6 3h4l2 5-2.5 1.5a12 12 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3Z" />
            </svg>
            <span>
              <span>{PHONE}</span>
              <span className={styles.hours}>Без выходных</span>
            </span>
          </p>

          <Image
            className={styles.qr}
            src="/images/redesign/qr-contact.png"
            alt=""
            width={84}
            height={84}
          />
        </div>

        <p className={styles.legal}>Действителен только для этого автомобиля</p>
      </footer>
    </article>
  )
}
