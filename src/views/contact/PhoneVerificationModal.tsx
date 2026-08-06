'use client'

import { useEffect, useRef, useState } from 'react'

import { maskPhone } from '@/features/save-contact'
import { Loader } from '@/shared/ui'
import styles from './ContactScreen.module.scss'

interface PhoneVerificationModalProps {
  phone: string
  retryAfter: number
  devCode?: string
  busy: boolean
  error: string
  onVerify: (code: string) => void
  onResend: () => void
  onClose: () => void
}

export function PhoneVerificationModal({
  phone,
  retryAfter,
  devCode,
  busy,
  error,
  onVerify,
  onResend,
  onClose,
}: PhoneVerificationModalProps) {
  const [code, setCode] = useState('')
  const [seconds, setSeconds] = useState(retryAfter)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [seconds])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [busy, onClose])

  const modal = (
    <div className={styles.verifyOverlay} role="presentation" onPointerDown={() => !busy && onClose()}>
      <section
        className={styles.verifyModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-verification-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.verifyClose}
          aria-label="Закрыть"
          onClick={onClose}
          disabled={busy}
        >
          ×
        </button>

        <h2 id="phone-verification-title">Введите код из СМС</h2>
        <p>Отправили на {maskPhone(phone)}</p>

        <label className={styles.codeField} data-invalid={Boolean(error) || undefined}>
          <span className={styles.srOnly}>Шестизначный код из СМС</span>
          <span className={styles.codeSlots} aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <i key={index} data-filled={Boolean(code[index]) || undefined}>
                {code[index] ?? ''}
              </i>
            ))}
          </span>
          <input
            ref={inputRef}
            className={styles.codeInput}
            value={code}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            disabled={busy}
            autoFocus
            onChange={(event) => {
              const next = event.target.value.replace(/\D/g, '').slice(0, 6)
              setCode(next)
              if (next.length === 6) onVerify(next)
            }}
          />
        </label>

        <div className={styles.verifyStatus} aria-live="polite">
          {busy ? <Loader label="Проверяем код" /> : error || null}
        </div>

        {seconds > 0 ? (
          <p className={styles.resendHint}>Запросить код повторно через {seconds} сек.</p>
        ) : (
          <button type="button" className={styles.resendButton} onClick={onResend} disabled={busy}>
            Запросить код повторно
          </button>
        )}

        {devCode && <p className={styles.devCode}>Код для локальной разработки: {devCode}</p>}
      </section>
    </div>
  )

  return modal
}
