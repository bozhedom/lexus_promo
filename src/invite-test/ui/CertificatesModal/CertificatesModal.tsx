'use client'

import { useEffect, useState } from 'react'

import { Loader } from '@/shared/ui'

import { DEFAULT_CERTIFICATES } from '../../config/certificates'
import type { useInviteSession } from '../../model/useInviteSession'
import type { Certificate, PersonalInviteDetails } from '../../model/types'
import { MessengerButton } from '../MessengerButton'
import styles from './CertificatesModal.module.scss'

interface CertificatesModalProps {
  delivery: ReturnType<typeof useInviteSession>
  details: PersonalInviteDetails
  /** Заявка в админке: туда кладём копию картинки, чтобы менеджер видел выданное. */
  certificateId?: string
  onClose: () => void
}

const fileName = (certificate: Certificate, details: PersonalInviteDetails) => {
  const owner = details.plate || details.fullName.split(/\s+/)[0] || 'gost'
  return `${certificate.id === 'gift' ? 'podarok' : 'diagnostika'}-${owner}.png`
}

/**
 * Скачивание на телефон. На мобильных сначала пробуем системный «Поделиться»
 * с файлами: так картинка уходит прямо в мессенджер или в галерею, а не
 * теряется в загрузках браузера.
 */
async function saveToPhone(
  certificates: Certificate[],
  details: PersonalInviteDetails,
  certificateId?: string,
) {
  const files = await Promise.all(
    certificates.map(async (certificate) => {
      const blob = await (await fetch(certificate.image)).blob()
      return new File([blob], fileName(certificate, details), { type: 'image/png' })
    }),
  )

  // Копию кладём в админку, но выдачу этим не задерживаем.
  if (certificateId && files[0]) void uploadCopy(certificateId, files[0])

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  if (typeof nav.share === 'function' && nav.canShare?.({ files })) {
    try {
      await nav.share({ files, title: 'Персональные пригласительные' })
      return
    } catch {
      // отмена шеринга: сохраняем обычной загрузкой
    }
  }

  files.forEach((file) => {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.download = file.name
    link.href = url
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  })
}

async function uploadCopy(id: string, file: File): Promise<void> {
  try {
    const body = new FormData()
    body.append('file', file, file.name)
    await fetch(`/api/certificates/${id}/image`, { method: 'POST', body })
  } catch {
    // картинка в админке приятна, но не критична
  }
}

export function CertificatesModal({
  delivery,
  details,
  certificateId,
  onClose,
}: CertificatesModalProps) {
  const { session, status, error, opened, openChat } = delivery
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const certificates = session?.certificates ?? DEFAULT_CERTIFICATES

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

  const download = async () => {
    if (saving || !session) return
    setSaving(true)
    setSaveError('')
    try {
      await saveToPhone(certificates, details, certificateId)
    } catch {
      setSaveError('Не удалось сохранить картинки, попробуйте ещё раз')
    } finally {
      setSaving(false)
    }
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
        {/* крестик рисуем здесь, а не картинкой: цвет берётся от кнопки и
            остаётся золотым, как остальная модалка */}
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M16.5 7.5 7.5 16.5M7.5 7.5l9 9" />
          </svg>
        </button>

        <h2 className={styles.title}>Ваши персональные пригласительные</h2>
        <p className={styles.subtitle}>Сохраните на телефон или отправьте себе в мессенджер</p>

        <div className={styles.cards}>
          {certificates.map((certificate) => (
            /* обычный img: это уже готовая картинка с сервера, оптимизация
               next/image ей не нужна и только добавила бы второй проход */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={certificate.id}
              className={styles.preview}
              src={certificate.image}
              alt={certificate.alt}
              loading="eager"
            />
          ))}
        </div>

        <button
          type="button"
          className={styles.download}
          onClick={download}
          disabled={saving || !session}
        >
          {saving ? (
            <Loader label="Сохраняем" />
          ) : (
            <>
              Скачать на телефон
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14" />
              </svg>
            </>
          )}
        </button>

        <p className={styles.or}>
          <span />
          или отправить в мессенджер
          <span />
        </p>

        <div className={styles.actions}>
          <MessengerButton
            icon="/invite-test/icon-whatsapp.svg"
            label="WhatsApp"
            disabled={!session?.channels.whatsapp.enabled}
            onClick={() => openChat('whatsapp')}
          />
          <MessengerButton
            icon="/invite-test/icon-telegram.png"
            label="Telegram"
            disabled={!session?.channels.telegram.enabled}
            onClick={() => openChat('telegram')}
          />
          <MessengerButton
            icon="/invite-test/icon-max.png"
            label="MAX"
            disabled={!session?.channels.max.enabled}
            onClick={() => openChat('max')}
          />
        </div>

        {saveError && <p className={styles.error}>{saveError}</p>}
        {message && <p className={status === 'failed' ? styles.error : styles.note}>{message}</p>}
        {!session && <p className={styles.note}>Готовим пригласительные…</p>}
        {session && !Object.values(session.channels).some((c) => c.enabled) && (
          <p className={styles.note}>Мессенджеры не настроены: заполните переменные INVITE_TEST_*</p>
        )}
      </div>
    </div>
  )
}
