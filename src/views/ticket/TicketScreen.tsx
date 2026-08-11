'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { completeApplication, isApiError, type CompleteResult } from '@/shared/api/funnel'
import { useScreenView } from '@/shared/analytics'
import { useFunnel, useFunnelGuard } from '@/shared/lib/funnel'
import { useSceneAssets } from '@/shared/lib/useSceneAssets'
import { useStageTransition } from '@/widgets/curtain-transition'
import { Button, Loader } from '@/shared/ui'
import { TicketCard } from '@/widgets/ticket-card'
import { CertificatesModal } from '@/invite-test/ui/CertificatesModal'
import { useInviteSession } from '@/invite-test/model/useInviteSession'
import type { PersonalInviteDetails } from '@/invite-test/model/types'
import styles from './TicketScreen.module.scss'

const TICKET_ASSETS = [
  '/images/redesign/invite-center.webp',
  '/images/redesign/invite-car.webp',
  '/images/redesign/invite-team.webp',
] as const

type Phase = 'loading' | 'ready' | 'error'

// Экран 5: команда автомобиля и выдача пригласительных
export function TicketScreen() {
  const router = useRouter()
  const { go } = useStageTransition()
  const show = useFunnelGuard(
    (d) => Boolean(d.applicationId && d.fullName && d.phone && d.phoneVerificationToken),
    '/personal',
  )
  const { data, sessionId, update, track } = useFunnel()
  useScreenView('certificate')

  const [phase, setPhase] = useState<Phase>('loading')
  const [result, setResult] = useState<CompleteResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const assetsReady = useSceneAssets(TICKET_ASSETS)

  // идемпотентно создаём сертификат
  useEffect(() => {
    if (!show || !data.applicationId) return
    // стартовое состояние и так 'loading': лишний сброс только плодит рендеры
    let active = true
    completeApplication(data.applicationId, sessionId, data.phoneVerificationToken ?? '')
      .then((res) => {
        if (!active) return
        setResult(res)
        update({
          status: 'completed',
          certificateCode: res.certificate.code,
          certificateAmount: res.certificate.amount,
        })
        track('certificate_created', { code: res.certificate.code })
        setPhase('ready')
      })
      .catch((e) => {
        if (!active) return
        setErrorMsg(isApiError(e) ? e.message : 'Не удалось оформить пригласительный')
        setPhase('error')
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, data.applicationId])

  // Данные для персональных сертификатов. Сессию заводим заранее, пока человек
  // рассматривает экран: к моменту открытия модалки картинки уже готовы.
  const details = useMemo<PersonalInviteDetails | null>(() => {
    const fullName = (result?.application.fullName ?? data.fullName ?? '').trim()
    if (phase !== 'ready' || !fullName) return null
    return {
      fullName,
      brand: (result?.application.carBrand ?? data.carBrand ?? 'Lexus').trim(),
      model: (result?.application.carModel ?? data.carModel ?? '').trim(),
      year: result?.application.carYear ?? data.carYear ?? null,
      plate: (result?.application.plateNumber ?? data.plateNumber ?? '').trim().toUpperCase(),
      amount: result?.certificate.amount ?? data.certificateAmount ?? 1500,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, result, data.fullName, data.carBrand, data.carModel, data.carYear, data.plateNumber])

  const delivery = useInviteSession(details)

  if (!show) return null

  const openCertificates = () => {
    track('certificate_saved', { code: result?.certificate.code })
    setModalOpen(true)
  }

  // Нативный «Поделиться» ведёт на соцсети и мессенджеры телефона; без него
  // (десктоп) кладём ссылку в буфер обмена.
  const recommend = async () => {
    track('outbound_click', { id: 'recommend' })
    const url = window.location.origin
    const share = { title: 'Персональное приглашение', text: 'Приглашение в новый техцентр «АвтоГарантСити»', url }
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(share)
        return
      } catch {
        // отмена шеринга — молча выходим
      }
    }
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // буфер недоступен: показывать нечего, кнопка просто не сработала
    }
  }

  return (
    <main className={styles.screen}>
      {/* пока идёт оформление, показываем саму сцену с лоадером поверх —
          чёрного экрана ожидания больше нет */}
      {(phase === 'loading' || (phase === 'ready' && !assetsReady)) && (
        <div className={styles.pending} data-ready={assetsReady}>
          <span className={styles.pendingScene} aria-hidden />
          <span className={styles.pendingDim} aria-hidden />
          <Loader variant="stage" label="Готовим ваш пригласительный" className={styles.status} />
        </div>
      )}

      {phase === 'error' && (
        <div className={styles.errorBox}>
          <p>{errorMsg}</p>
          <Button onClick={() => router.refresh()}>Попробовать снова</Button>
        </div>
      )}

      {phase === 'ready' && result && assetsReady && (
        <div className={styles.reveal}>
          <TicketCard
            fullName={result.application.fullName ?? data.fullName ?? ''}
            brand={result.application.carBrand ?? data.carBrand ?? ''}
            model={result.application.carModel ?? data.carModel ?? ''}
            year={result.application.carYear ?? data.carYear ?? null}
            plate={result.application.plateNumber ?? data.plateNumber ?? ''}
            amount={result.certificate.amount}
            onMeet={() => {
              track('outbound_click', { id: 'meet_team' })
              go('/links')
            }}
          />

          <div className={styles.bar}>
            <Button className={styles.saveBtn} onClick={openCertificates}>
              Отправить в мессенджер
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14" />
              </svg>
            </Button>

            {/* Кнопка на соцсети из макета: системный шеринг открывает список
                мессенджеров и соцсетей телефона. */}
            <button type="button" className={styles.recommend} onClick={recommend}>
              <span>Рекомендовать друзьям</span>
              <svg viewBox="0 0 24 24" aria-hidden>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {modalOpen && details && delivery.session && (
        <CertificatesModal
          delivery={delivery}
          guestName={details.fullName}
          brand={details.brand}
          amount={details.amount}
          onClose={() => setModalOpen(false)}
        />
      )}
    </main>
  )
}
