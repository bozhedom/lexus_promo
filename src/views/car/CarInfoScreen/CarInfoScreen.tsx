'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import {
  DEFAULT_PLATE_REGION,
  PlateInput,
  formatPlate,
  isPlateComplete,
  splitPlate,
} from '@/features/plate-lookup'
import { createApplication, isApiError, lookupCar, patchApplication } from '@/shared/api/funnel'
import { useScreenView } from '@/shared/analytics'
import { CAR_BRANDS, OTHER_OPTION, carModels, carYears } from '@/shared/config/car-data'
import { useFunnel } from '@/shared/lib/funnel'
import { Button, Loader, SelectField, StageLayout, TextField } from '@/shared/ui'
import { validatePlate, validateShortText } from '@/lib/validation'
import styles from './CarInfoScreen.module.scss'

type UiState = 'loading' | 'found' | 'manual'

interface FoundCar {
  brand: string
  model: string
  year: number | null
}

// Экран 3, данные авто: найдено (3a) / марка и модель вручную (3b) / год и номер (3c)
interface CarInfoScreenProps {
  manualRequested?: boolean
}

export function CarInfoScreen({ manualRequested = false }: CarInfoScreenProps) {
  const router = useRouter()
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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const lookupGeneration = useRef(0)

  const models = carModels(brand)
  const needsCustomModel = brand === OTHER_OPTION || model === OTHER_OPTION || models.length === 0
  const finalModel = needsCustomModel ? customModel.trim() : model
  const plateValue = plate ?? data.plateNumber ?? DEFAULT_PLATE_REGION

  useEffect(() => {
    if (ready && !show) router.replace('/car-number')
  }, [ready, router, show])

  // определение авто по номеру
  useEffect(() => {
    if (!show || manualRequested || !data.plateNumber) return
    // стартовое состояние и так 'loading': лишний сброс только плодит рендеры
    const generation = ++lookupGeneration.current
    lookupCar(data.plateNumber)
      .then((info) => {
        if (lookupGeneration.current !== generation) return
        if (!info.found) {
          setManualNotice(true)
          setUi('manual')
          track('car_not_found')
          return
        }
        // Модель в базе есть не у всех. Подставляем известную марку и год,
        // чтобы не сбрасывать человека на пустую форму.
        if (!info.model) {
          setBrand(info.brand)
          if (info.year) setYear(String(info.year))
          setManualNotice(false)
          setUi('manual')
          track('car_found', { brand: info.brand, model: null })
          return
        }
        setCar({ brand: info.brand, model: info.model, year: info.year })
        setUi('found')
        track('car_found', { brand: info.brand, model: info.model })
      })
      .catch(() => {
        if (lookupGeneration.current !== generation) return
        setManualNotice(true)
        setUi('manual')
        track('car_not_found')
      })
    return () => {
      if (lookupGeneration.current === generation) lookupGeneration.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, manualRequested, data.plateNumber])

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

  // Подтверждение ручного ввода. В новом макете все поля находятся на одном
  // экране; состав данных и запрос к API остаются прежними.
  const confirmManual = async () => {
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
    if (Object.keys(next).length > 0) return
    setSubmitting(true)
    try {
      const canContinue = Boolean(data.applicationId) && data.status !== 'completed'
      let applicationId = data.applicationId

      if (!canContinue) {
        const created = await createApplication({
          plateNumber: canonical!,
          sessionId,
          ...utm,
        })
        applicationId = created.id
        reset()
        update({
          applicationId,
          plateNumber: canonical!,
          status: 'draft_plate',
        })
      }

      await patchApplication(applicationId!, {
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

  if (ui === 'found' && car) {
    return (
      <main className={styles.foundScreen}>
        <p className={styles.foundEyebrow}>Автомобиль успешно найден</p>

        <section className={styles.foundPanel}>
          <Image
            className={styles.lexusLogo}
            src="/images/redesign/lexus-logo.svg"
            alt="Lexus"
            width={154}
            height={28}
            priority
          />

          <h1 className={styles.carName}>
            <span>{car.brand} {car.model}</span>
            {car.year ? <><i /> <span>{car.year}</span></> : null}
          </h1>

          <div className={styles.staticPlate} aria-label={`Госномер ${plateShown.main} ${plateShown.region}`}>
            <span className={styles.staticMain}>{plateShown.main}</span>
            <span className={styles.staticRegion}>
              <strong>{plateShown.region}</strong>
              <Image src="/images/plate-rus-flag.svg" alt="RUS" width={48} height={12} />
            </span>
          </div>

          <p className={styles.carCharacter}>Брутальный внедорожник</p>

          <ul className={styles.progressList}>
            <li>
              <span className={styles.lineIcon} aria-hidden>♧</span>
              <span>Персональное<br />приглашение готово</span>
              <b>✓</b>
            </li>
            <li>
              <span className={styles.lineIcon} aria-hidden>✉</span>
              <span>Подарок зарезервирован<br />за вашим автомобилем</span>
              <b>✓</b>
            </li>
            <li>
              <span className={styles.lineIcon} aria-hidden>∞</span>
              <span>Осталось подтвердить<br />владельца</span>
              <b className={styles.pendingCheck} />
            </li>
          </ul>

          <p className={styles.giftLead}>
            Для Вашего автомобиля приготовлены
            <span>персональные подарки в честь знакомства</span>
          </p>

          <article className={styles.giftCard}>
            <div>
              <small>Сертификат</small>
              <strong>15 000 ₽</strong>
              <p>на оригинальные запасные части<br />и аксессуары</p>
              <span>Подробнее</span>
            </div>
          </article>

          <div className={styles.giftDots} aria-hidden><i /><i /></div>

          {errors.form && <p className={styles.error}>{errors.form}</p>}

          <Button block className={styles.confirmButton} onClick={confirmFound} disabled={submitting}>
            {submitting ? <Loader label="Сохраняем" /> : 'Это мой автомобиль'}
          </Button>
          <button
            type="button"
            className={styles.changeButton}
            onClick={() => {
              setManualNotice(false)
              setUi('manual')
              track('car_manual', { from: 'reject' })
            }}
          >
            Изменить автомобиль
          </button>
        </section>
      </main>
    )
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
      {ui === 'loading' && (
        <div className={styles.lookupPanel}>
          <div className={styles.tabs} aria-label="Способ ввода автомобиля">
            <span className={styles.tabActive}>По номеру авто</span>
            <button
              type="button"
              onClick={() => {
                lookupGeneration.current += 1
                setManualNotice(false)
                setUi('manual')
                track('car_manual', { from: 'lookup' })
              }}
            >
              Указать вручную
            </button>
          </div>
          <PlateInput
            defaultValue={data.plateNumber}
            disabled
            onChange={() => undefined}
          />
          <div className={styles.lookupButton} role="status" aria-label="Определяем автомобиль">
            <Loader />
          </div>
        </div>
      )}

      {ui === 'manual' && (
        <div className={styles.manualPanel}>
          <div className={styles.tabs} aria-label="Способ ввода автомобиля">
            <button type="button" onClick={() => router.push('/car-number')}>По номеру авто</button>
            <span className={styles.tabActive}>Указать вручную</span>
          </div>

          <PlateInput
            defaultValue={plateValue}
            invalid={Boolean(errors.plate)}
            onChange={(v) => {
              setPlate(v)
              if (errors.plate) setErrors((p) => ({ ...p, plate: '' }))
            }}
          />

          {manualNotice && (
            <p className={styles.notFound}>Автомобиль не найден<br />Введите данные вручную</p>
          )}

          <SelectField
            placeholder="Марка"
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

          {!brand ? (
            <SelectField
              placeholder="Модель"
              value=""
              disabled
              onChange={() => undefined}
              options={[]}
            />
          ) : models.length > 0 ? (
            <SelectField
              placeholder="Модель"
              value={model}
              error={errors.model}
              onChange={setModel}
              options={models.map((m) => ({ value: m, label: m }))}
            />
          ) : (
            <TextField
              placeholder="Модель"
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

          <SelectField
            placeholder="Год"
            value={year}
            error={errors.year}
            onChange={setYear}
            options={carYears().map((y) => ({ value: String(y), label: String(y) }))}
          />

          {errors.plate && <span className={styles.error}>{errors.plate}</span>}

          {errors.form && <p className={styles.error}>{errors.form}</p>}

          <Button
            block
            onClick={confirmManual}
            disabled={!brand || !finalModel || !year || submitting}
          >
            {submitting ? <Loader label="Сохраняем" /> : 'Подтвердить'}
          </Button>
        </div>
      )}
    </StageLayout>
  )
}
