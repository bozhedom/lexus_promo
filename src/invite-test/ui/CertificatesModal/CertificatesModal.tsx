'use client'

import { useEffect, useState } from 'react'

import { CertificateViewer, type CertificateKind } from '@/widgets/certificate-sheet'

import type { useInviteSession } from '../../model/useInviteSession'
import { MessengerButton } from '../MessengerButton'
import styles from './CertificatesModal.module.scss'

interface CertificatesModalProps {
  delivery: ReturnType<typeof useInviteSession>
  /** Имя и отчество гостя: они же напечатаны на самих пригласительных. */
  guestName?: string
  /** Марка из заявки: от неё зависит оформление развёрнутого пригласительного. */
  brand?: string
  amount?: number
  onClose: () => void
}

const KINDS: CertificateKind[] = ['diagnostics', 'gift']

export function CertificatesModal({
  delivery,
  guestName,
  brand = 'Lexus',
  amount,
  onClose,
}: CertificatesModalProps) {
  const { session, status, error, opened, openChat } = delivery
  const [expanded, setExpanded] = useState<CertificateKind | null>(null)
  const certificates = session?.certificates ?? []

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (expanded) setExpanded(null)
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [expanded, onClose])

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
    <div className={styles.overlay} onClick={onClose}>
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Ваши персональные пригласительные"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M16.5 7.5 7.5 16.5M7.5 7.5l9 9" />
          </svg>
        </button>

        {guestName && <p className={styles.guest}>{guestName}</p>}

        <h2 className={styles.title}>Ваши персональные<br />пригласительные готовы</h2>

        <p className={styles.subtitle}>Ждем Вас в гости!</p>

        <div className={styles.cards}>
          {certificates.map((certificate, index) => (
            <button
              type="button"
              className={styles.previewButton}
              key={certificate.id}
              onClick={() => setExpanded(KINDS[index] ?? 'diagnostics')}
              aria-label={`Открыть: ${certificate.alt}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.preview}
                src={certificate.image}
                alt={certificate.alt}
                loading="eager"
              />
              <span className={styles.zoom} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M9 4H5a1 1 0 0 0-1 1v4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
                </svg>
              </span>
              <span className={styles.previewLabel}>{index === 0 ? 'Диагностика' : 'В честь знакомства'}</span>
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
            onClick={() => openChat('max')}
          />
          <MessengerButton
            icon="/invite-test/icon-telegram.png"
            label="Telegram"
            disabled={!session?.channels.telegram.enabled}
            onClick={() => openChat('telegram')}
          />
          <MessengerButton
            icon="/invite-test/icon-whatsapp.svg"
            label="W"
            ariaLabel="WhatsApp"
            disabled={!session?.channels.whatsapp.enabled}
            onClick={() => openChat('whatsapp')}
          />
        </div>

        {message && <p className={status === 'failed' ? styles.error : styles.note}>{message}</p>}
      </section>

      {expanded && (
        <CertificateViewer
          kind={expanded}
          brand={brand}
          name={guestName ?? ''}
          amount={amount}
          onClose={() => setExpanded(null)}
        />
      )}
    </div>
  )
}
