'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  DEFAULT_PLATE_REGION,
  PlateInput,
  isPlateComplete,
  splitPlate,
} from '@/features/plate-lookup'
import { createApplication, isApiError, patchApplication } from '@/shared/api/funnel'
import { useScreenView } from '@/shared/analytics'
import { useFunnel } from '@/shared/lib/funnel'
import { Button, Loader, StageLayout } from '@/shared/ui'
import { validatePlate } from '@/lib/validation'
import styles from './CarNumberScreen.module.scss'

// Экран 2: ввод госномера
export function CarNumberScreen() {
  const { ready } = useFunnel()
  useScreenView('plate')
  if (!ready) return null
  return <ReadyCarNumberScreen />
}

function ReadyCarNumberScreen() {
  const router = useRouter()
  const { data, sessionId, utm, update, reset, track } = useFunnel()
  const [plate, setPlate] = useState(data.plateNumber ?? DEFAULT_PLATE_REGION)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const openManual = () => {
    // Ручная форма живёт на следующем экране, но номер (даже частично
    // заполненный) не должен пропадать при переключении вкладки.
    update({ plateNumber: plate })
    router.push('/car-info?manual=1')
  }

  const submit = async () => {
    const { main, region } = splitPlate(plate)
    const canonical = validatePlate(main + region)
    if (!isPlateComplete(main, region) || !canonical) {
      setError('Введите номер полностью')
      track('plate_error', { reason: 'incomplete' })
      return
    }
    setError(null)
    setSubmitting(true)
    // Продолжаем черновик только если он ещё не завершён. Иначе (нет заявки или
    // прошлый прогон уже completed) начинаем новый прогон с чистого листа.
    const canContinue = Boolean(data.applicationId) && data.status !== 'completed'
    try {
      if (canContinue) {
        await patchApplication(data.applicationId!, { sessionId, plateNumber: canonical })
        update({ plateNumber: canonical, status: 'draft_plate' })
      } else {
        const res = await createApplication({ plateNumber: canonical, sessionId, ...utm })
        reset()
        update({ applicationId: res.id, plateNumber: canonical, status: 'draft_plate' })
      }
      track('plate_submitted', { plate: canonical })
      router.push('/car-info')
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Не удалось сохранить номер')
      track('plate_error', { reason: 'server' })
      setSubmitting(false)
    }
  }

  return (
    <StageLayout
      cardClassName={styles.lookupCard}
      secureInside
      subtitle={
        <>
          Внесите номер, чтобы получить <b>персональное приглашение</b>
        </>
      }
    >
      <div className={styles.body}>
        <div className={styles.tabs} aria-label="Способ ввода автомобиля">
          <span className={styles.tabActive}>По номеру авто</span>
          <button type="button" onClick={openManual} disabled={submitting}>
            Указать вручную
          </button>
        </div>

        <div className={styles.stack}>
          <PlateInput
            defaultValue={data.plateNumber ?? DEFAULT_PLATE_REGION}
            invalid={Boolean(error)}
            onChange={(v) => {
              setPlate(v)
              if (error) setError(null)
            }}
            autoFocus
          />

          {error && <p className={styles.error}>{error}</p>}

          <Button
            block
            onClick={submit}
            disabled={submitting}
            aria-label={submitting ? 'Определяем автомобиль' : undefined}
          >
            {submitting ? <Loader /> : 'Определить автомобиль'}
          </Button>
        </div>
      </div>
    </StageLayout>
  )
}
