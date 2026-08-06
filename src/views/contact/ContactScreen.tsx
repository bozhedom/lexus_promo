'use client'

import Image from 'next/image'
import { useState } from 'react'

import { isPhoneComplete, maskPhone, phoneCaretPosition } from '@/features/save-contact'
import {
  isApiError,
  patchApplication,
  requestPhoneVerification,
  verifyPhoneCode,
  type PhoneChallengeResult,
} from '@/shared/api/funnel'
import { useScreenView } from '@/shared/analytics'
import { useFunnel, useFunnelGuard } from '@/shared/lib/funnel'
import { useSceneAssets } from '@/shared/lib/useSceneAssets'
import { useStageTransition } from '@/widgets/curtain-transition'
import { Button, Checkbox, Loader } from '@/shared/ui'
import { validateFullName, validatePhone } from '@/lib/validation'
import { PhoneVerificationModal } from './PhoneVerificationModal'
import styles from './ContactScreen.module.scss'

const CONTACT_ASSETS = [
  '/images/redesign/reception.webp',
  '/images/redesign/gold-dust.webp',
] as const

interface ActiveChallenge extends PhoneChallengeResult {
  phone: string
  expiresAt: number
}

// Экран 4: личные данные
export function ContactScreen() {
  const { go } = useStageTransition()
  const show = useFunnelGuard((d) => Boolean(d.applicationId && d.carBrand), '/car-number')
  const { data, sessionId, update, track } = useFunnel()
  useScreenView('personal')

  const savedName = (data.fullName ?? '').trim().split(/\s+/)
  const [firstName, setFirstName] = useState(savedName[0] ?? '')
  const [patronymic, setPatronymic] = useState(savedName.slice(1).join(' '))
  const [phone, setPhone] = useState(data.phone ?? '')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const assetsReady = useSceneAssets(CONTACT_ASSETS)

  if (!show) return null

  const sendCode = async (normalizedPhone: string) => {
    if (!data.applicationId) return
    const result = await requestPhoneVerification(data.applicationId, sessionId)
    setChallenge({
      ...result,
      phone: normalizedPhone,
      expiresAt: Date.now() + result.expiresIn * 1000,
    })
    setVerifyError('')
    setVerifyOpen(true)
  }

  const submit = async () => {
    const next: Record<string, string> = {}
    const name = validateFullName(`${firstName} ${patronymic}`)
    if (!name) next.fullName = 'Укажите имя и отчество, только буквы'
    const normPhone = validatePhone(phone)
    if (!isPhoneComplete(phone) || !normPhone) next.phone = 'Введите номер телефона'
    if (!consent) next.consent = 'Нужно согласие'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    if (!data.applicationId) return

    setSubmitting(true)
    try {
      await patchApplication(data.applicationId, {
        sessionId,
        fullName: name!,
        phone: normPhone!,
        consentGiven: true,
      })
      update({
        fullName: name!,
        phone: normPhone!,
        phoneVerificationToken: undefined,
        status: 'draft_personal',
      })
      track('personal_submitted')
      if (
        challenge &&
        challenge.phone === normPhone &&
        challenge.expiresAt > Date.now()
      ) {
        setVerifyError('')
        setVerifyOpen(true)
      } else {
        await sendCode(normPhone!)
      }
    } catch (e) {
      setErrors({ form: isApiError(e) ? e.message : 'Не удалось сохранить' })
    } finally {
      setSubmitting(false)
    }
  }

  const verify = async (code: string) => {
    if (!challenge || !data.applicationId || verifying) return
    setVerifying(true)
    setVerifyError('')
    try {
      const result = await verifyPhoneCode(data.applicationId, {
        sessionId,
        challengeToken: challenge.challengeToken,
        code,
      })
      update({ phoneVerificationToken: result.verificationToken })
      go('/certificate')
    } catch (e) {
      setVerifyError(isApiError(e) ? e.message : 'Не удалось проверить код')
    } finally {
      setVerifying(false)
    }
  }

  const resend = async () => {
    if (!challenge || submitting) return
    setVerifying(true)
    setVerifyError('')
    try {
      await sendCode(challenge.phone)
    } catch (e) {
      setVerifyError(isApiError(e) ? e.message : 'Не удалось отправить СМС')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <main className={styles.screen} data-ready={assetsReady}>
      <div className={styles.reception} aria-hidden />
      <div className={styles.dust} aria-hidden />

      <div className={styles.content}>
        <header className={styles.heading}>
          <h1>Получите<br />персональное приглашение</h1>
          <p><span />И заберите свой подарок<span /></p>
        </header>

        <div className={styles.form}>
          <div className={styles.nameRow}>
            <label className={styles.field}>
              <span>Имя</span>
              <input
                placeholder="Иван"
                maxLength={30}
                autoComplete="given-name"
                value={firstName}
                aria-invalid={Boolean(errors.fullName)}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Отчество</span>
              <input
                placeholder="Иванович"
                maxLength={30}
                autoComplete="additional-name"
                value={patronymic}
                aria-invalid={Boolean(errors.fullName)}
                onChange={(e) => setPatronymic(e.target.value)}
              />
            </label>
          </div>
          {errors.fullName && <span className={styles.error}>{errors.fullName}</span>}

          <label className={styles.field}>
            <span>Телефон</span>
            <input
              placeholder="+7 ___ ___-__-__"
              inputMode="tel"
              autoComplete="tel"
              maxLength={18}
              value={phone}
              aria-invalid={Boolean(errors.phone)}
              onChange={(e) => {
                const input = e.currentTarget
                const raw = input.value
                const next = maskPhone(raw)
                const caret = phoneCaretPosition(
                  raw,
                  input.selectionStart ?? raw.length,
                  next,
                )
                setPhone(next)
                requestAnimationFrame(() => {
                  if (document.activeElement === input) {
                    input.setSelectionRange(caret, caret)
                  }
                })
              }}
            />
          </label>
          {errors.phone && <span className={styles.error}>{errors.phone}</span>}

          <Checkbox
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className={`${styles.consent} ${errors.consent ? styles.consentError : ''}`}
          >
            Я даю согласие на{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.policyLink}
              onClick={(e) => e.stopPropagation()}
            >
              обработку персональных данных
            </a>{' '}
            и отправку приглашения в мессенджеры
          </Checkbox>

          {(errors.consent || errors.form) && (
            <p className={styles.error}>{errors.form ?? errors.consent}</p>
          )}

          <Button block className={styles.submit} onClick={submit} disabled={submitting}>
            {submitting ? <Loader label="Оформляем" /> : 'Получить приглашение'}
          </Button>

          <p className={styles.secure}>
            <Image src="/images/icon-shield.svg" alt="" width={20} height={20} />
            Ваши данные защищены и не передаются третьим лицам
          </p>
        </div>
      </div>

      {verifyOpen && challenge && (
        <PhoneVerificationModal
          key={challenge.challengeToken}
          phone={challenge.phone}
          retryAfter={challenge.retryAfter}
          devCode={challenge.devCode}
          busy={verifying}
          error={verifyError}
          onVerify={verify}
          onResend={resend}
          onClose={() => setVerifyOpen(false)}
        />
      )}
    </main>
  )
}
