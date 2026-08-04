'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { PlateInput, formatPlate, isPlateComplete, splitPlate } from '@/features/plate-lookup'
import { isApiError, lookupCar, patchApplication } from '@/shared/api/funnel'
import { useScreenView } from '@/shared/analytics'
import { CAR_BRANDS, OTHER_OPTION, carModels, carYears } from '@/shared/config/car-data'
import { useFunnel, useFunnelGuard } from '@/shared/lib/funnel'
import { Button, Loader, SelectField, StageLayout, TextField } from '@/shared/ui'
import { validatePlate, validateShortText } from '@/lib/validation'
import styles from './CarInfoScreen.module.scss'

type UiState = 'loading' | 'found' | 'manual-brand' | 'manual-year'

interface FoundCar {
  brand: string
  model: string
  year: number | null
}

// Экран 3, данные авто: найдено (3a) / марка и модель вручную (3b) / год и номер (3c)
export function CarInfoScreen() {
  const router = useRouter()
  const show = useFunnelGuard((d) => Boolean(d.applicationId && d.plateNumber), '/car-number')
  const { data, sessionId, update, track } = useFunnel()
  useScreenView('car_info')

  const [ui, setUi] = useState<UiState>('loading')
  const [car, setCar] = useState<FoundCar | null>(null)
  const [brand, setBrand] = useState(data.carBrand ?? '')
  const [model, setModel] = useState(data.carModel ?? '')
  const [customModel, setCustomModel] = useState('')
  const [year, setYear] = useState(data.carYear ? String(data.carYear) : '')
  const [plate, setPlate] = useState(data.plateNumber ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const models = carModels(brand)
  const needsCustomModel = brand === OTHER_OPTION || model === OTHER_OPTION || models.length === 0
  const finalModel = needsCustomModel ? customModel.trim() : model

  // определение авто по номеру
  useEffect(() => {
    if (!show || !data.plateNumber) return
    // стартовое состояние и так 'loading': лишний сброс только плодит рендеры
    let active = true
    lookupCar(data.plateNumber)
      .then((info) => {
        if (!active) return
        if (!info.found) {
          setUi('manual-brand')
          track('car_not_found')
          return
        }
        // Модель в базе есть не у всех. Подставляем известную марку и год,
        // чтобы не сбрасывать человека на пустую форму.
        if (!info.model) {
          setBrand(info.brand)
          if (info.year) setYear(String(info.year))
          setUi('manual-brand')
          track('car_found', { brand: info.brand, model: null })
          return
        }
        setCar({ brand: info.brand, model: info.model, year: info.year })
        setUi('found')
        track('car_found', { brand: info.brand, model: info.model })
      })
      .catch(() => {
        if (!active) return
        setUi('manual-brand')
        track('car_not_found')
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, data.plateNumber])

  if (!show) return null

  const goPersonal = () => router.push('/personal')

  // 3a: подтверждение найденного авто
  const confirmFound = async () => {
    if (!car || !data.applicationId) return
    setSubmitting(true)
    try {
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
      })
      goPersonal()
    } catch (e) {
      setErrors({ form: isApiError(e) ? e.message : 'Не удалось сохранить' })
      setSubmitting(false)
    }
  }

  // 3b -> 3c
  const nextManual = () => {
    const next: Record<string, string> = {}
    if (!brand) next.brand = 'Выберите марку'
    if (!finalModel) next.model = 'Укажите модель'
    else if (needsCustomModel && !validateShortText(finalModel, 40)) {
      next.model = 'Только буквы, цифры и дефис'
    }
    setErrors(next)
    if (Object.keys(next).length === 0) setUi('manual-year')
  }

  // 3c: подтверждение ручного ввода
  const confirmManual = async () => {
    const next: Record<string, string> = {}
    if (!year) next.year = 'Выберите год'
    const { main, region } = splitPlate(plate)
    const canonical = validatePlate(main + region)
    if (!isPlateComplete(main, region) || !canonical) next.plate = 'Введите номер полностью'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    if (!data.applicationId) return

    setSubmitting(true)
    try {
      await patchApplication(data.applicationId, {
        sessionId,
        plateNumber: canonical!,
        carBrand: brand,
        carModel: finalModel,
        carYear: Number(year),
        carDataSource: 'manual',
      })
      update({
        plateNumber: canonical!,
        carBrand: brand,
        carModel: finalModel,
        carYear: Number(year),
        carDataSource: 'manual',
        status: 'draft_car',
      })
      track('car_manual', { brand, model: finalModel })
      goPersonal()
    } catch (e) {
      setErrors({ form: isApiError(e) ? e.message : 'Не удалось сохранить' })
      setSubmitting(false)
    }
  }

  const plateShown = formatPlate(data.plateNumber ?? '')

  return (
    <StageLayout
      subtitle={
        <>
          Заполните, чтобы получить <b>персональное приглашение</b> на тех. открытие автоцентра
        </>
      }
    >
      {ui === 'loading' && (
        <div className={styles.center}>
          <Loader variant="stage" label="Определяем автомобиль" className={styles.lookup} />
        </div>
      )}

      {ui === 'found' && car && (
        <div className={styles.center}>
          <p className={styles.caption}>Автомобиль успешно определен</p>
          <div className={styles.foundCard}>
            <span className={styles.foundCar}>
              {car.brand.toUpperCase()} {car.model.toUpperCase()}
              {car.year ? (
                <>
                  <i className={styles.sep}>|</i>
                  {car.year}
                </>
              ) : null}
            </span>
            <span className={styles.foundPlate}>
              {plateShown.main} | {plateShown.region}
            </span>
          </div>
          {errors.form && <p className={styles.error}>{errors.form}</p>}
          <Button block onClick={confirmFound} disabled={submitting}>
            {submitting ? <Loader label="Сохраняем" /> : 'Это мой автомобиль'}
          </Button>
          <button
            type="button"
            className={styles.link}
            onClick={() => {
              setUi('manual-brand')
              track('car_manual', { from: 'reject' })
            }}
          >
            Это не мой автомобиль
          </button>
        </div>
      )}

      {ui === 'manual-brand' && (
        <div className={styles.form}>
          <SelectField
            label="Марка"
            placeholder="Выбрать"
            value={brand}
            error={errors.brand}
            onChange={(v) => {
              setBrand(v)
              setModel('')
              setCustomModel('')
              setErrors({})
            }}
            options={CAR_BRANDS.map((b) => ({ value: b, label: b }))}
          />

          {models.length > 0 ? (
            <SelectField
              label="Модель"
              placeholder="Выбрать"
              value={model}
              error={errors.model}
              onChange={setModel}
              options={models.map((m) => ({ value: m, label: m }))}
            />
          ) : (
            <TextField
              label="Модель"
              placeholder="Например, RX"
              maxLength={40}
              value={customModel}
              error={errors.model}
              onChange={(e) => setCustomModel(e.target.value)}
            />
          )}

          {models.length > 0 && model === OTHER_OPTION && (
            <TextField
              placeholder="Впишите модель"
              maxLength={40}
              value={customModel}
              error={errors.model}
              onChange={(e) => setCustomModel(e.target.value)}
            />
          )}

          <Button block onClick={nextManual}>
            Далее
          </Button>
        </div>
      )}

      {ui === 'manual-year' && (
        <div className={styles.form}>
          <SelectField
            label="Год"
            placeholder="Выбрать"
            value={year}
            error={errors.year}
            onChange={setYear}
            options={carYears().map((y) => ({ value: String(y), label: String(y) }))}
          />

          <div className={styles.plateField}>
            <span className={styles.plateLabel}>Гос номер</span>
            <PlateInput
              size="compact"
              defaultValue={data.plateNumber}
              invalid={Boolean(errors.plate)}
              onChange={(v) => {
                setPlate(v)
                if (errors.plate) setErrors((p) => ({ ...p, plate: '' }))
              }}
            />
            {errors.plate && <span className={styles.error}>{errors.plate}</span>}
          </div>

          {errors.form && <p className={styles.error}>{errors.form}</p>}

          <Button block onClick={confirmManual} disabled={submitting}>
            {submitting ? <Loader label="Сохраняем" /> : 'Подтвердить'}
          </Button>
        </div>
      )}
    </StageLayout>
  )
}
