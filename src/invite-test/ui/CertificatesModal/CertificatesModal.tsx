'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { CertificateSheet, CertificateViewer, type CertificateKind } from '@/widgets/certificate-sheet'

import type { Channel } from '../../model/types'
import type { useInviteSession } from '../../model/useInviteSession'
import { MessengerButton } from '../MessengerButton'
import styles from './CertificatesModal.module.scss'

interface CertificatesModalProps {
  delivery: ReturnType<typeof useInviteSession>
  /** Имя и отчество гостя: они же напечатаны на самих пригласительных. */
  guestName?: string
  /** Марка из заявки: от неё зависит оформление пригласительного. */
  brand?: string
  /** Модель и год: по ним подбирается кадр автомобиля на пригласительном. */
  model?: string | null
  year?: number | null
  /** «Lexus RX»: подпись над номером на самом пригласительном. */
  carTitle?: string | null
  plate?: string | null
  amount?: number
  /**
   * Крестик появляется, только когда закрывать модалку действительно можно.
   * На шаге выдачи пригласительных возврата нет: сертификаты уже выписаны на
   * гостя, и обработчик туда не передаётся.
   */
  onClose?: () => void
  /**
   * Мессенджер открылся: дальше гость забирает пригласительные в чате. Экран
   * под модалкой к этому моменту уже готов, поэтому вызывающий закрывает её —
   * вернувшись из мессенджера, гость попадает сразу на него.
   */
  onSent?: (channel: Channel) => void
}

/**
 * Подписи под превью. Перенос проставлен вручную: у диагностики строка длиннее
 * карточки, и автоперенос ронял «части» третьей строкой — от этого пара
 * пригласительных вставала на разной высоте.
 */
const CARDS: { kind: CertificateKind; label: ReactNode; title: string }[] = [
  {
    kind: 'diagnostics',
    label: (
      <>
        Диагностика
        <br />
        ходовой части
      </>
    ),
    title: 'Диагностика ходовой части',
  },
  { kind: 'gift', label: 'Замена масла', title: 'Замена масла' },
]

export function CertificatesModal({
  delivery,
  guestName,
  brand = 'Lexus',
  model,
  year,
  carTitle,
  plate,
  amount,
  onClose,
  onSent,
}: CertificatesModalProps) {
  const { session, status, error, opened, openChat } = delivery
  const [expanded, setExpanded] = useState<CertificateKind | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (expanded) setExpanded(null)
      else onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [expanded, onClose])

  // Мессенджер открывается в соседней вкладке, а модалка уступает место экрану
  // под собой: гость возвращается из чата уже на готовую страницу, а не на
  // окно, которое ему нечем закрыть.
  const send = (channel: Channel) => {
    if (openChat(channel)) onSent?.(channel)
  }

  const message = (() => {
    if (status === 'sent') return 'Пригласительные отправлены в чат'
    if (status === 'failed') return error ?? 'Менеджер отправит приглашения вручную'
    if (status === 'waiting') return 'Отправьте сообщение в чате — приглашения придут в ответ'
    if (opened === 'max' && session && !session.channels.max.autoDelivery) {
      return `Для автоматической отправки настройте бота MAX. Код: ${session.code}`
    }
    if (opened === 'whatsapp' && session && !session.channels.whatsapp.autoDelivery) {
      return `Отправьте сообщение менеджеру в WhatsApp. Код: ${session.code}`
    }
    return null
  })()

  return (
    <div className={styles.overlay} onClick={onClose ? () => onClose() : undefined}>
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Ваши персональные пригласительные"
        onClick={(event) => event.stopPropagation()}
      >
        {onClose && (
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M16.5 7.5 7.5 16.5M7.5 7.5l9 9" />
            </svg>
          </button>
        )}

        {guestName && <p className={styles.guest}>{guestName}</p>}

        <h2 className={styles.title}>Ваши персональные<br />пригласительные готовы</h2>

        <p className={styles.subtitle}>Ждем Вас в гости!</p>

        {/* Превью — тот же компонент, что раскрывается на весь экран: маленькая
            и большая карточки не могут разойтись оформлением. */}
        <div className={styles.cards}>
          {CARDS.map((card) => (
            <button
              type="button"
              className={styles.previewButton}
              key={card.kind}
              onClick={() => setExpanded(card.kind)}
              aria-label={`Открыть пригласительный: ${card.title}`}
            >
              <span className={styles.previewFrame}>
                <CertificateSheet
                  kind={card.kind}
                  brand={brand}
                  model={model}
                  year={year}
                  name={guestName ?? ''}
                  carTitle={carTitle}
                  plate={plate}
                  amount={amount}
                />
              </span>
              <span className={styles.zoom} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M9 4H5a1 1 0 0 0-1 1v4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
                </svg>
              </span>
              <span className={styles.previewLabel}>{card.label}</span>
            </button>
          ))}
        </div>

        <p className={styles.or}>
          <span />
          отправить в мессенджер
          <span />
        </p>

        <div className={styles.actions}>
          <MessengerButton
            icon="/invite-test/icon-max.png"
            label="MAX"
            disabled={!session?.channels.max.enabled}
            onClick={() => send('max')}
          />
          <MessengerButton
            icon="/invite-test/icon-telegram.png"
            label="Telegram"
            disabled={!session?.channels.telegram.enabled}
            onClick={() => send('telegram')}
          />
          <MessengerButton
            icon="/invite-test/icon-whatsapp.svg"
            label="W"
            ariaLabel="WhatsApp"
            disabled={!session?.channels.whatsapp.enabled}
            onClick={() => send('whatsapp')}
          />
        </div>

        {message && <p className={status === 'failed' ? styles.error : styles.note}>{message}</p>}
      </section>

      {expanded && (
        <CertificateViewer
          kind={expanded}
          brand={brand}
          model={model}
          year={year}
          name={guestName ?? ''}
          carTitle={carTitle}
          plate={plate}
          amount={amount}
          onClose={() => setExpanded(null)}
        />
      )}
    </div>
  )
}
