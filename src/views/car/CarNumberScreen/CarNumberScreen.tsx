'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { PlateInput, isPlateComplete, splitPlate } from '@/features/plate-lookup'
import { createApplication, isApiError, patchApplication } from '@/shared/api/funnel'
import { useScreenView } from '@/shared/analytics'
import { useFunnel } from '@/shared/lib/funnel'
import { Button, Loader, StageLayout } from '@/shared/ui'
import { validatePlate } from '@/lib/validation'
import styles from './CarNumberScreen.module.scss'

// Экран 2: ввод госномера
export function CarNumberScreen() {
  const router = useRouter()
  const { data, sessionId, utm, update, reset, track } = useFunnel()
  useScreenView('plate')
  const [plate, setPlate] = useState(data.plateNumber ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
      subtitle={
        <>
          Внесите номер, чтобы получить <b>персональное приглашение</b> на тех. открытие
          автоцентра
        </>
      }
    >
      <div className={styles.body}>
        <p className={styles.caption}>НОМЕР ВАШЕГО АВТОМОБИЛЯ</p>

        <div className={styles.stack}>
          <PlateInput
            defaultValue={data.plateNumber}
            invalid={Boolean(error)}
            onChange={(v) => {
              setPlate(v)
              if (error) setError(null)
            }}
            autoFocus
          />

          {error && <p className={styles.error}>{error}</p>}

          <Button block onClick={submit} disabled={submitting}>
            {submitting ? <Loader label="Определяем" /> : 'Определить автомобиль'}
          </Button>
        </div>
      </div>
    </StageLayout>
  )
}
