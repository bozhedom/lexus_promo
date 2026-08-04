'use client'

import { useState } from 'react'

import { isPhoneComplete, maskPhone } from '@/features/save-contact'
import { isApiError, patchApplication } from '@/shared/api/funnel'
import { useScreenView } from '@/shared/analytics'
import { useFunnel, useFunnelGuard } from '@/shared/lib/funnel'
import { useStageTransition } from '@/widgets/curtain-transition'
import { Button, Checkbox, Loader, StageLayout, TextField } from '@/shared/ui'
import { validateFullName, validatePhone } from '@/lib/validation'
import styles from './ContactScreen.module.scss'

// Экран 4: личные данные
export function ContactScreen() {
  const { go } = useStageTransition()
  const show = useFunnelGuard((d) => Boolean(d.applicationId && d.carBrand), '/car-number')
  const { data, sessionId, update, track } = useFunnel()
  useScreenView('personal')

  const [fullName, setFullName] = useState(data.fullName ?? '')
  const [phone, setPhone] = useState(data.phone ?? '')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  if (!show) return null

  const submit = async () => {
    const next: Record<string, string> = {}
    const name = validateFullName(fullName)
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
    <StageLayout
      subtitle={
        <>
          Заполните, чтобы получить <b>персональное приглашение</b> на тех. открытие автоцентра
        </>
      }
    >
      <div className={styles.form}>
        <TextField
          label="Как к вам обращаться"
          placeholder="Имя Отчество"
          maxLength={60}
          autoComplete="name"
          value={fullName}
          error={errors.fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <TextField
          label="Номер телефона"
          placeholder="+7 (___) ___-__-__"
          inputMode="tel"
          autoComplete="tel"
          maxLength={18}
          value={phone}
          error={errors.phone}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
        />

        <Checkbox
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className={errors.consent ? styles.consentError : undefined}
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
          и отправку пригласительного в мессенджеры
        </Checkbox>

        {errors.form && <p className={styles.error}>{errors.form}</p>}

        <Button block onClick={submit} disabled={submitting}>
          {submitting ? <Loader label="Оформляем" /> : 'Получить пригласительный'}
        </Button>
      </div>
    </StageLayout>
  )
}
