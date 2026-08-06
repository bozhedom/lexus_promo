'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { saveTicket } from '@/features/download-ticket'
import { completeApplication, isApiError, type CompleteResult } from '@/shared/api/funnel'
import { useScreenView } from '@/shared/analytics'
import { useFunnel, useFunnelGuard } from '@/shared/lib/funnel'
import { useSceneAssets } from '@/shared/lib/useSceneAssets'
import { useStageTransition } from '@/widgets/curtain-transition'
import { Button, Loader } from '@/shared/ui'
import { TicketCard } from '@/widgets/ticket-card'
import styles from './TicketScreen.module.scss'

const TICKET_ASSETS = [
  '/images/redesign/invite-center.webp',
  '/images/redesign/invite-car.webp',
  '/images/redesign/invite-team.webp',
] as const

type Phase = 'loading' | 'ready' | 'error'

// Экран 5: пригласительный (сертификат) + сохранение PNG
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
  const [saving, setSaving] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
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

  if (!show) return null

  const save = async () => {
    if (!cardRef.current || saving) return
    setSaving(true)
    track('certificate_saved', { code: result?.certificate.code })
    try {
      await saveTicket(
        cardRef.current,
        `priglasitelnyj-${result?.certificate.code ?? 'gift'}.png`,
        result?.certificate.id,
      )
    } catch {
      // если рендер/шеринг сорвался: не блокируем воронку
    }
    go('/links')
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
            ref={cardRef}
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

          {/* Кнопка находится за пределами карточки и в сохраняемое изображение не попадает. */}
          <div className={styles.bar}>
            <Button className={styles.saveBtn} onClick={save} disabled={saving}>
              {saving ? (
                <Loader label="Сохраняем" />
              ) : (
                <>
                  Скачать пригласительный
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14" />
                  </svg>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}
