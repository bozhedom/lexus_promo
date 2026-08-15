'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { DEFAULT_PLATE_REGION, isPlateComplete, splitPlate } from '@/features/plate-lookup'
import { createApplication, isApiError, lookupCar, patchApplication } from '@/shared/api/funnel'
import { useScreenView } from '@/shared/analytics'
import { OTHER_OPTION, carBrands, carModels, isFeaturedBrand, isPopularBrand } from '@/shared/config/car-data'
import { flowRoutes, type FunnelFlow } from '@/shared/lib/flow'
import { useFunnel } from '@/shared/lib/funnel'
import type { CarInfo } from '@/shared/lib/types'
import { StageLayout } from '@/shared/ui'
import { CertificateViewer, type CertificateKind } from '@/widgets/certificate-sheet'
import { validatePlate, validateShortText } from '@/lib/validation'

import { FoundCarPanel } from './FoundCarPanel'
import { LookupPendingPanel, ManualCarForm, type BrandOption } from './ManualCarForm'
import { PREVIEW_NAME } from './gifts'
import { initialFrom, type FoundCar, type UiState } from './model'
import { useCarCatalog } from './useCarCatalog'
import styles from './CarInfoScreen.module.scss'

// Экран 3, данные авто: найдено (3a) / марка и модель вручную (3b) / год и номер (3c)
interface CarInfoScreenProps {
  manualRequested?: boolean
  /** Ветка воронки: от неё зависит только то, куда экран ведёт дальше. */
  flow?: FunnelFlow
}

export function CarInfoScreen({ manualRequested = false, flow = 'invite' }: CarInfoScreenProps) {
  const router = useRouter()
  const routes = flowRoutes(flow)
  // Ветка записи: подарков и пригласительных на карточке нет, вместо них — что
  // сделать с автомобилем, и до карточки доходит любой автомобиль, хоть
  // определённый, хоть вписанный руками.
  const booking = flow === 'booking'
  const { data, ready, sessionId, utm, update, reset, track } = useFunnel()
  const show = ready && (manualRequested || Boolean(data.applicationId && data.plateNumber))
  useScreenView('car_info')

  const [ui, setUi] = useState<UiState>(manualRequested ? 'manual' : 'loading')
  const [car, setCar] = useState<FoundCar | null>(null)
  const [brand, setBrand] = useState(data.carBrand ?? '')
  const [model, setModel] = useState(data.carModel ?? '')
  const [customModel, setCustomModel] = useState('')
  const [year, setYear] = useState(data.carYear ? String(data.carYear) : '')
  // До гидратации FunnelProvider данные ещё пустые. `null` означает «пользователь
  // пока не редактировал поле», поэтому после восстановления берём номер из сессии.
  const [plate, setPlate] = useState<string | null>(null)
  const [manualNotice, setManualNotice] = useState(false)
  // Автомобиль на карточке уже сохранён: в ветке записи сюда попадают и после
  // ручного ввода, и второй раз патчить заявку нечем.
  const [carSaved, setCarSaved] = useState(false)
  const [services, setServices] = useState<string[]>(data.services ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [appliedLookup, setAppliedLookup] = useState<CarInfo | undefined>(undefined)
  const [preview, setPreview] = useState<CertificateKind | null>(null)
  const lookupGeneration = useRef(0)
  const catalog = useCarCatalog()

  const models = carModels(catalog, brand)
  const needsCustomModel = model === OTHER_OPTION || models.length === 0
  const finalModel = needsCustomModel ? customModel.trim() : model
  const plateValue = plate ?? data.plateNumber ?? DEFAULT_PLATE_REGION

  // Результат из сессии раскладываем прямо в рендере, а не в эффекте: иначе
  // между гидратацией и эффектом успевает мелькнуть кадр с загрузчиком, хотя
  // ответ уже есть. React в этом случае перерисует до отрисовки на экране.
  if (!manualRequested && data.carLookup && data.carLookup !== appliedLookup) {
    const next = initialFrom(data.carLookup, false)
    setAppliedLookup(data.carLookup)
    setUi(next.ui)
    setCar(next.car)
    setManualNotice(next.notice)
    if (next.brand) setBrand(next.brand)
    if (next.year) setYear(next.year)
  }

  useEffect(() => {
    if (ready && !show) router.replace(routes.plate)
  }, [ready, router, routes.plate, show])

  // Событие определения шлём один раз на пришедший ответ.
  useEffect(() => {
    if (!appliedLookup) return
    if (!appliedLookup.found) track('car_not_found')
    else track('car_found', { brand: appliedLookup.brand, model: appliedLookup.model })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedLookup])

  // Запасной путь: прямой заход на адрес (перезагрузка страницы), когда ответа
  // в сессии нет. Обычный проход по воронке сюда не попадает.
  useEffect(() => {
    if (!show || manualRequested || !data.plateNumber || data.carLookup) return
    const generation = ++lookupGeneration.current
    lookupCar(data.plateNumber)
      .catch<CarInfo>(() => ({ found: false }))
      .then((info) => {
        if (lookupGeneration.current !== generation) return
        update({ carLookup: info })
      })
    return () => {
      if (lookupGeneration.current === generation) lookupGeneration.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, manualRequested, data.plateNumber, data.carLookup])

  if (!show) return null

  // Ветка приглашения ведёт на личные данные, ветка записи — на свой экран.
  const goNext = () => router.push(routes.next)

  const toggleService = (service: string) =>
    setServices((prev) =>
      prev.includes(service) ? prev.filter((item) => item !== service) : [...prev, service],
    )

  const switchToManual = (from: 'lookup' | 'reject') => {
    if (from === 'lookup') lookupGeneration.current += 1
    setManualNotice(false)
    setUi('manual')
    track('car_manual', { from })
  }

  // 3a: подтверждение автомобиля на карточке. Вписанный руками автомобиль
  // сохранён ещё формой, поэтому повторно заявку не трогаем — остаётся только
  // отметить выбранные работы и уйти дальше.
  const confirmFound = async () => {
    if (!car || !data.applicationId) return
    setSubmitting(true)
    try {
      if (!carSaved) {
        await patchApplication(data.applicationId, {
          sessionId,
          carBrand: car.brand,
          carModel: car.model,
          carYear: car.year ?? undefined,
          carDataSource: 'api',
        })
        update({
          carBrand: car.brand,
          carModel: car.model,
          carYear: car.year,
          carDataSource: 'api',
          status: 'draft_car',
          ...(booking ? { services } : {}),
        })
      } else if (booking) {
        update({ services })
      }
      goNext()
    } catch (e) {
      setErrors({ form: isApiError(e) ? e.message : 'Не удалось сохранить' })
      setSubmitting(false)
    }
  }

  const validateManual = () => {
    const next: Record<string, string> = {}
    if (!brand) next.brand = 'Выберите марку'
    if (!finalModel) next.model = 'Укажите модель'
    else if (needsCustomModel && !validateShortText(finalModel, 40)) {
      next.model = 'Только буквы, цифры и дефис'
    }
    if (!year) next.year = 'Выберите год'
    const { main, region } = splitPlate(plateValue)
    const canonical = validatePlate(main + region)
    if (!isPlateComplete(main, region) || !canonical) next.plate = 'Введите номер полностью'
    setErrors(next)
    return Object.keys(next).length === 0 ? canonical : null
  }

  // Подтверждение ручного ввода. В новом макете все поля находятся на одном
  // экране; состав данных и запрос к API остаются прежними.
  const confirmManual = async () => {
    const canonical = validateManual()
    if (!canonical) return
    setSubmitting(true)
    try {
      const canContinue = Boolean(data.applicationId) && data.status !== 'completed'
      let applicationId = data.applicationId

      if (!canContinue) {
        const created = await createApplication({ plateNumber: canonical, sessionId, ...utm })
        applicationId = created.id
        reset()
        update({ applicationId, plateNumber: canonical, status: 'draft_plate' })
      }

      await patchApplication(applicationId!, {
        sessionId,
        plateNumber: canonical,
        carBrand: brand,
        carModel: finalModel,
        carYear: Number(year),
        carDataSource: 'manual',
      })
      update({
        plateNumber: canonical,
        carBrand: brand,
        carModel: finalModel,
        carYear: Number(year),
        carDataSource: 'manual',
        status: 'draft_car',
      })
      track('car_manual', { brand, model: finalModel })
      // В ветке записи карточка автомобиля показывается всегда: с неё гость
      // отмечает работы, поэтому вручную вписанный автомобиль уходит не дальше,
      // а на ту же карточку.
      if (booking) {
        setCar({ brand, model: finalModel, year: Number(year) })
        setCarSaved(true)
        setUi('found')
        setSubmitting(false)
        return
      }
      goNext()
    } catch (e) {
      setErrors({ form: isApiError(e) ? e.message : 'Не удалось сохранить' })
      setSubmitting(false)
    }
  }

  if (ui === 'found' && car) {
    return (
      <main className={styles.foundScreen}>
        {/* Вписанный руками автомобиль никто не «находил»: подпись честная. */}
        <p className={styles.foundEyebrow}>
          {carSaved ? 'Ваш автомобиль' : 'Автомобиль успешно найден'}
        </p>

        <FoundCarPanel
          car={car}
          plateNumber={data.plateNumber ?? null}
          booking={booking}
          services={services}
          onToggleService={toggleService}
          submitting={submitting}
          errorMessage={errors.form}
          onConfirm={confirmFound}
          onChangeCar={() => switchToManual('reject')}
          onPreview={setPreview}
        />

        {/* Имени гость ещё не вводил, поэтому в превью стоит «Ваше имя» —
            так он заранее видит, как будет выглядеть его пригласительный.
            Номер он уже ввёл: его печатаем на кадре автомобиля по-настоящему. */}
        {preview && (
          <CertificateViewer
            kind={preview}
            brand={car.brand}
            model={car.model}
            year={car.year}
            name={PREVIEW_NAME}
            plate={data.plateNumber ?? null}
            onClose={() => setPreview(null)}
          />
        )}
      </main>
    )
  }

  return (
    <StageLayout
      cardClassName={styles.lookupCard}
      secureInside
      subtitle={
        <>
          Внесите номер, чтобы получить <br /><b>персональное приглашение</b>
        </>
      }
    >
      {ui === 'loading' && (
        <LookupPendingPanel
          plateNumber={data.plateNumber}
          onManual={() => switchToManual('lookup')}
        />
      )}

      {ui === 'manual' && (
        <ManualCarForm
          plateValue={plateValue}
          brand={brand}
          model={model}
          customModel={customModel}
          year={year}
          brandOptions={brandOptions(catalog)}
          models={models}
          errors={errors}
          notFound={manualNotice}
          submitting={submitting}
          canSubmit={Boolean(brand && finalModel && year)}
          onPlateChange={(value) => {
            setPlate(value)
            if (errors.plate) setErrors((prev) => ({ ...prev, plate: '' }))
          }}
          onBrandChange={(value) => {
            setBrand(value)
            setModel('')
            setCustomModel('')
            setErrors({})
          }}
          onModelChange={setModel}
          onCustomModelChange={setCustomModel}
          onYearChange={setYear}
          onBackToPlate={() => router.push(routes.plate)}
          onSubmit={confirmManual}
        />
      )}
    </StageLayout>
  )
}

/**
 * Три группы: марки техцентра, ходовые марки, остальной алфавит. Границы групп
 * отчёркиваются, чтобы список читался как три блока, а не сплошняк.
 */
function brandOptions(catalog: Parameters<typeof carBrands>[0]): BrandOption[] {
  const groupOf = (item: string) => (isFeaturedBrand(item) ? 0 : isPopularBrand(item) ? 1 : 2)
  return carBrands(catalog).map((item, index, list) => {
    const group = groupOf(item)
    const nextItem = list[index + 1]
    return {
      value: item,
      label: item,
      featured: group === 0,
      divider: nextItem ? groupOf(nextItem) !== group : false,
    }
  })
}
