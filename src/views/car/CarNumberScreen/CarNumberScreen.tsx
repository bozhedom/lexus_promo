'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  DEFAULT_PLATE_REGION,
  PlateInput,
  isPlateComplete,
  splitPlate,
} from '@/features/plate-lookup'
import {
  certificateSerialsOf,
  createApplication,
  findExistingCertificate,
  isApiError,
  lookupCar,
  patchApplication,
} from '@/shared/api/funnel'
import { useScreenView } from '@/shared/analytics'
import { flowRoutes, type FunnelFlow } from '@/shared/lib/flow'
import { useFunnel } from '@/shared/lib/funnel'
import type { CarInfo } from '@/shared/lib/types'
import { Button, Loader, StageLayout } from '@/shared/ui'
import { validatePlate } from '@/lib/validation'
import styles from './CarNumberScreen.module.scss'

// Экран 2: ввод госномера
export function CarNumberScreen({ flow = 'invite' }: { flow?: FunnelFlow }) {
  const { ready } = useFunnel()
  useScreenView('plate')
  if (!ready) return null
  return <ReadyCarNumberScreen flow={flow} />
}

function ReadyCarNumberScreen({ flow }: { flow: FunnelFlow }) {
  const router = useRouter()
  const routes = flowRoutes(flow)
  const { data, sessionId, utm, update, reset, track } = useFunnel()
  const [plate, setPlate] = useState(data.plateNumber ?? DEFAULT_PLATE_REGION)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const openManual = () => {
    // Ручная форма живёт на следующем экране, но номер (даже частично
    // заполненный) не должен пропадать при переключении вкладки.
    update({ plateNumber: plate, carLookup: undefined })
    router.push(`${routes.car}?manual=1`)
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
      // Выданные пригласительные перехватывают только ветку приглашения: гость,
      // который пришёл записываться, идёт дальше независимо от того, выписаны
      // они ему или нет.
      const previous =
        flow === 'invite'
          ? await findExistingCertificate(canonical, sessionId)
          : ({ existing: false } as const)
      if (previous.existing) {
        reset()
        update({
          plateNumber: previous.vehicle.plateNumber,
          carBrand: previous.vehicle.brand ?? undefined,
          carModel: previous.vehicle.model ?? undefined,
          carYear: previous.vehicle.year,
          fullName: previous.guest.fullName ?? undefined,
          status: 'completed',
          certificateId: previous.certificate.id,
          certificateCode: previous.certificate.code,
          certificateAmount: previous.certificate.amount,
          certificateExpiresAt: previous.certificate.expiresAt,
          certificateSerials: certificateSerialsOf(previous.certificates),
        })
        track('plate_submitted', { plate: canonical, existingCertificate: true })
        router.push('/existing-certificate')
        return
      }

      // Определение авто идёт здесь же, параллельно сохранению номера: экран
      // не перерисовывается, человек видит один загрузчик на месте кнопки, а
      // следующий шаг открывается уже с ответом — найдено или нет.
      const lookup = lookupCar(canonical).catch<CarInfo>(() => ({ found: false }))

      if (canContinue) {
        await patchApplication(data.applicationId!, { sessionId, plateNumber: canonical })
        update({ plateNumber: canonical, status: 'draft_plate' })
      } else {
        const res = await createApplication({ plateNumber: canonical, sessionId, ...utm })
        reset()
        update({ applicationId: res.id, plateNumber: canonical, status: 'draft_plate' })
      }

      update({ carLookup: await lookup })
      track('plate_submitted', { plate: canonical, flow })
      router.push(routes.car)
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
      compactViewport
      hideSliderCaption
      subtitle={
        <>
          Внесите номер, чтобы получить <br /><b>персональное приглашение</b>
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
          {/* На время определения знак гаснет, как в макете: экран тот же,
              меняется только состояние поля и кнопки. */}
          <PlateInput
            defaultValue={data.plateNumber ?? DEFAULT_PLATE_REGION}
            invalid={Boolean(error)}
            disabled={submitting}
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
