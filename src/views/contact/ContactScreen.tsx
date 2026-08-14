'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

import {
  certificateSerialsOf,
  isApiError,
  issueCertificates,
  patchApplication,
} from '@/shared/api/funnel'
import { useScreenView } from '@/shared/analytics'
import { useFunnel, useFunnelGuard } from '@/shared/lib/funnel'
import { useSceneAssets } from '@/shared/lib/useSceneAssets'
import { useStageTransition } from '@/widgets/curtain-transition'
import { Button, Checkbox, Loader } from '@/shared/ui'
import { validateFullName } from '@/lib/validation'
import { CertificatesModal } from '@/invite-test/ui/CertificatesModal'
import { useInviteSession } from '@/invite-test/model/useInviteSession'
import type { PersonalInviteDetails } from '@/invite-test/model/types'
import styles from './ContactScreen.module.scss'

const CONTACT_ASSETS = [
  '/images/redesign/reception.webp',
  '/images/redesign/gold-dust.webp',
  '/images/icon-shield-check.svg',
] as const

// Экран 4: личные данные
export function ContactScreen() {
  const show = useFunnelGuard((d) => Boolean(d.applicationId && d.carBrand), '/car-number')
  const { data, sessionId, update, track } = useFunnel()
  const { go } = useStageTransition()
  useScreenView('personal')

  const savedName = (data.fullName ?? '').trim().split(/\s+/)
  const [firstName, setFirstName] = useState(savedName[0] ?? '')
  const [patronymic, setPatronymic] = useState(savedName.slice(1).join(' '))
  const [savedFullName, setSavedFullName] = useState(data.fullName ?? '')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [certificatesOpen, setCertificatesOpen] = useState(false)
  const assetsReady = useSceneAssets(CONTACT_ASSETS)

  const inviteDetails = useMemo<PersonalInviteDetails | null>(() => {
    if (!certificatesOpen || !savedFullName) return null
    return {
      fullName: savedFullName,
      brand: data.carBrand ?? 'Lexus',
      model: data.carModel ?? '',
      year: data.carYear ?? null,
      plate: data.plateNumber ?? '',
      amount: data.certificateAmount ?? 1500,
    }
  }, [certificatesOpen, data.carBrand, data.carModel, data.carYear, data.plateNumber, data.certificateAmount, savedFullName])
  const delivery = useInviteSession(inviteDetails)
  const preparingCertificates = certificatesOpen && !delivery.session

  if (!show) return null

  const submitName = async () => {
    const next: Record<string, string> = {}
    // Отчество необязательно: достаточно имени.
    const name = validateFullName(`${firstName} ${patronymic}`.trim())
    if (!name) next.fullName = 'Укажите имя, только буквы'
    if (!consent) next.consent = 'Нужно согласие на обработку персональных данных'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    if (!data.applicationId) return

    setSubmitting(true)
    try {
      await patchApplication(data.applicationId, {
        sessionId,
        fullName: name!,
        consentGiven: true,
      })
      // Пригласительные выписываются здесь же: с этого шага гость уже не
      // возвращается назад, и в админке заявка должна лежать с обоими
      // сертификатами, а не только с именем.
      const issued = await issueCertificates(data.applicationId, sessionId)
      const gift = issued.certificates.find((cert) => cert.kind === 'gift')
      update({
        fullName: name!,
        phoneVerificationToken: undefined,
        status: 'completed',
        certificateId: gift?.id,
        certificateCode: gift?.code,
        certificateAmount: gift?.amount,
        certificateExpiresAt: gift?.expiresAt ?? undefined,
        certificateSerials: certificateSerialsOf(issued.certificates),
      })
      setErrors({})
      setSavedFullName(name!)
      track('personal_submitted')
      setCertificatesOpen(true)
    } catch (e) {
      setErrors({ form: isApiError(e) ? e.message : 'Не удалось сохранить' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.screen} data-ready={assetsReady}>
      <div className={styles.reception} aria-hidden />
      <div className={styles.dust} aria-hidden />

      <div className={styles.content}>
        <header className={styles.heading}>
          <h1>На кого выписать<br />пригласительные</h1>
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
              <span>Отчество <i>по желанию</i></span>
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

          <Checkbox
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked)
              if (e.target.checked) setErrors((p) => ({ ...p, consent: '' }))
            }}
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

          <Button
            block
            className={styles.submit}
            onClick={submitName}
            disabled={submitting || preparingCertificates}
          >
            {preparingCertificates ? (
              <Loader label="Готовим приглашения" />
            ) : submitting ? (
              <Loader label="Оформляем" />
            ) : (
              'Оформить приглашение'
            )}
          </Button>

          <p className={styles.secure}>
            <Image src="/images/icon-shield-check.svg" alt="" width={22} height={22} />
            <span>
              Ваши данные защищены<br />и не передаются третьим лицам
            </span>
          </p>
        </div>
      </div>

      {certificatesOpen && inviteDetails && delivery.session && (
        <CertificatesModal
          delivery={delivery}
          guestName={savedFullName}
          brand={inviteDetails.brand}
          // Модель и год нужны не подписи, а подбору кадра: без них на
          // пригласительном оказывался кадр марки вообще или дефолтный
          // автомобиль — не тот, который гость только что подтвердил.
          model={inviteDetails.model}
          year={inviteDetails.year}
          carTitle={[data.carBrand, data.carModel].filter(Boolean).join(' ')}
          plate={data.plateNumber}
          amount={data.certificateAmount ?? 1500}
          serials={data.certificateSerials}
          // Пригласительные гость забирает в мессенджере — на этом путь по
          // сайту заканчивается. Переход делаем сразу по клику, чтобы,
          // вернувшись из чата, он попал на первый экран, а не на модалку с
          // уже выданными пригласительными.
          onSent={(channel) => {
            track('outbound_click', { id: `messenger_${channel}` })
            go('/')
          }}
        />
      )}
    </main>
  )
}
