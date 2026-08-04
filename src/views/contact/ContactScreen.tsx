'use client'

import Image from 'next/image'
import { useState } from 'react'

import { isPhoneComplete, maskPhone } from '@/features/save-contact'
import { isApiError, patchApplication } from '@/shared/api/funnel'
import { useScreenView } from '@/shared/analytics'
import { useFunnel, useFunnelGuard } from '@/shared/lib/funnel'
import { useSceneAssets } from '@/shared/lib/useSceneAssets'
import { useStageTransition } from '@/widgets/curtain-transition'
import { Button, Checkbox, Loader } from '@/shared/ui'
import { validateFullName, validatePhone } from '@/lib/validation'
import styles from './ContactScreen.module.scss'

const CONTACT_ASSETS = [
  '/images/redesign/reception.webp',
  '/images/redesign/gold-dust.webp',
] as const

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
  const assetsReady = useSceneAssets(CONTACT_ASSETS)

  if (!show) return null

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
        status: 'draft_personal',
      })
      track('personal_submitted')
      go('/certificate')
    } catch (e) {
      setErrors({ form: isApiError(e) ? e.message : 'Не удалось сохранить' })
      setSubmitting(false)
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
              onChange={(e) => setPhone(maskPhone(e.target.value))}
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
    </main>
  )
}
