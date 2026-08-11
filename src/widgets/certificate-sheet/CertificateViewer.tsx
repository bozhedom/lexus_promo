'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { CertificateSheet, type CertificateSheetProps } from './CertificateSheet'
import styles from './CertificateViewer.module.scss'

interface CertificateViewerProps extends CertificateSheetProps {
  onClose: () => void
}

/** Пригласительный на весь экран: тап мимо кадра и Esc закрывают его. */
export function CertificateViewer({ onClose, ...sheet }: CertificateViewerProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Пригласительный сертификат"
      onClick={onClose}
    >
      <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть сертификат">
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M16.5 7.5 7.5 16.5M7.5 7.5l9 9" />
        </svg>
      </button>

      <div className={styles.frame} onClick={(event) => event.stopPropagation()}>
        <CertificateSheet {...sheet} />
      </div>
    </div>,
    document.body,
  )
}
