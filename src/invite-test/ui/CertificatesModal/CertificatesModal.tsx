'use client'

import Image from 'next/image'
import { useEffect } from 'react'

import { DEFAULT_CERTIFICATES } from '../../config/certificates'
import type { useInviteSession } from '../../model/useInviteSession'
import { CertificateCard } from '../CertificateCard'
import { MessengerButton } from '../MessengerButton'
import styles from './CertificatesModal.module.scss'

interface CertificatesModalProps {
  delivery: ReturnType<typeof useInviteSession>
  onClose: () => void
}

export function CertificatesModal({ delivery, onClose }: CertificatesModalProps) {
  const { session, status, error, opened, openChat } = delivery

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const hint = (): string | null => {
    if (status === 'sent') return 'Менеджер отправил сертификаты в чат'
    if (status === 'failed') return error ?? 'Менеджер отправит сертификаты сам'
    if (status === 'waiting') return 'Отправьте сообщение в чате, сертификаты придут в ответ'
    if (opened === 'max' && session && !session.channels.max.autoDelivery)
      return `Для автоматической отправки настройте бота MAX. Код: ${session.code}`
    return null
  }

  const message = hint()

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Ваши персональные пригласительные"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
          <Image src="/invite-test/icon-close.svg" alt="" width={24} height={24} />
        </button>

        <h2 className={styles.title}>Ваши персональные пригласительные</h2>
        <p className={styles.subtitle}>Напишите менеджеру, и он пришлёт их в чат</p>

        <div className={styles.cards}>
          {(session?.certificates ?? DEFAULT_CERTIFICATES).map((certificate) => (
            <CertificateCard key={certificate.id} certificate={certificate} />
          ))}
        </div>

        <div className={styles.actions}>
          <MessengerButton
            icon="/invite-test/icon-max.png"
            label="Отправить в MAX"
            disabled={!session?.channels.max.enabled}
            onClick={() => openChat('max')}
          />
          <MessengerButton
            icon="/invite-test/icon-telegram.png"
            label="Отправить в Telegram"
            disabled={!session?.channels.telegram.enabled}
            onClick={() => openChat('telegram')}
          />
          <MessengerButton
            icon="/invite-test/icon-whatsapp.svg"
            label="Отправить в WhatsApp"
            disabled={!session?.channels.whatsapp.enabled}
            onClick={() => openChat('whatsapp')}
          />
        </div>

        {message && (
          <p className={status === 'failed' ? styles.error : styles.note}>{message}</p>
        )}
        {!session && <p className={styles.note}>Готовим ссылки…</p>}
        {session && !Object.values(session.channels).some((c) => c.enabled) && (
          <p className={styles.note}>Менеджеры не настроены: заполните переменные INVITE_TEST_*</p>
        )}
      </div>
    </div>
  )
}
