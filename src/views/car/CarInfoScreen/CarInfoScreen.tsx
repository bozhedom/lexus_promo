'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

import {
  DEFAULT_PLATE_REGION,
  PlateInput,
  formatPlate,
  isPlateComplete,
  splitPlate,
} from '@/features/plate-lookup'
import { createApplication, isApiError, lookupCar, patchApplication } from '@/shared/api/funnel'
import { useScreenView } from '@/shared/analytics'
import {
  DEFAULT_CAR_CATALOG,
  OTHER_OPTION,
  carBrands,
  carModels,
  carYears,
  fetchCarCatalog,
  isFeaturedBrand,
  isPopularBrand,
} from '@/shared/config/car-data'
import { useFunnel } from '@/shared/lib/funnel'
import type { CarInfo } from '@/shared/lib/types'
import { Button, Loader, SelectField, StageLayout, TextField } from '@/shared/ui'
import {
  CertificateViewer,
  certificatePreview,
  isToyota,
  type CertificateKind,
} from '@/widgets/certificate-sheet'
import { validatePlate, validateShortText } from '@/lib/validation'
import styles from './CarInfoScreen.module.scss'

type UiState = 'loading' | 'found' | 'manual'

/**
 * Подарки на экране найденного автомобиля. Обложка каждого слайда — кадр его
 * же пригласительного, поэтому берётся из общего описания сертификата.
 */
const GIFTS = [
  { kind: 'diagnostics' as const, title: 'Профессиональная диагностика ходовой части', amount: '' },
  { kind: 'gift' as const, title: 'на первую замену масла', amount: '1 500 ₽' },
]

/** До заполнения формы имя ещё неизвестно: в превью стоит подпись из макета. */
const PREVIEW_NAME = 'Ваше имя'

interface FoundCar {
  brand: string
  model: string
  year: number | null
}

interface InitialState {
  ui: UiState
  car: FoundCar | null
  brand: string
  year: string
  notice: boolean
}

/**
 * Экран открывается уже с ответом внешнего API: запрос делает предыдущий шаг,
 * пока крутится загрузчик на кнопке «Определить автомобиль». Состояние
 * `loading` остаётся только для прямого захода на адрес (например, F5).
 */
function initialFrom(lookup: CarInfo | undefined, manual: boolean): InitialState {
  const empty = { car: null, brand: '', year: '', notice: false }
  if (manual) return { ...empty, ui: 'manual' }
  if (!lookup) return { ...empty, ui: 'loading' }
  if (!lookup.found) return { ...empty, ui: 'manual', notice: true }
  // Модель в базе есть не у всех. Подставляем известную марку и год, чтобы не
  // сбрасывать человека на пустую форму.
  if (!lookup.model) {
    return {
      ...empty,
      ui: 'manual',
      brand: lookup.brand,
      year: lookup.year ? String(lookup.year) : '',
    }
  }
  return {
    ...empty,
    ui: 'found',
    car: { brand: lookup.brand, model: lookup.model, year: lookup.year },
  }
}

// Иконки списка готовности обведены по кадру Figma. Раньше здесь стояли
// типографские символы (♧, ✉, ∞): они брались из системного шрифта, поэтому
// на разных телефонах отличались и размером, и начертанием.
function StepIcon({ kind }: { kind: 'gift' | 'letter' | 'mask' }) {
  if (kind === 'gift') {
    return (
      <svg className={styles.stepIcon} viewBox="0 0 26 28" aria-hidden>
        <path d="M13 8c-2.4 0-5.2-.4-6.3-1.8-1.2-1.5.2-3.9 2.4-3.4C11.5 3.3 12.6 5.8 13 8Z" />
        <path d="M13 8c2.4 0 5.2-.4 6.3-1.8 1.2-1.5-.2-3.9-2.4-3.4C14.5 3.3 13.4 5.8 13 8Z" />
        <rect x="0.6" y="8" width="24.8" height="5" rx="0.8" />
        <path d="M2.9 13h20.2v13.2a1.2 1.2 0 0 1-1.2 1.2H4.1a1.2 1.2 0 0 1-1.2-1.2Z" />
        <path d="M13 8v19.4" />
      </svg>
    )
  }
  if (kind === 'letter') {
    return (
      <svg className={styles.stepIcon} viewBox="0 0 28 26" aria-hidden>
        <path d="M11.2 5.4a2.8 2.8 0 0 1 5.6 0" />
        <path d="M6.2 5.4h15.6v6.4M6.2 5.4v6.4" />
        <path d="M9.6 8.4h8.8M9.6 11h8.8" />
        <path d="M2.5 10.4h23v13h-23z" />
        <path d="m2.5 10.4 11.5 8.4 11.5-8.4" />
      </svg>
    )
  }
  return (
    <svg className={styles.stepIcon} viewBox="0 0 28 20" aria-hidden>
      <path d="M1.2 5.2C1.2 3.2 3 2 4.9 2.5l7.3 2.1c1.2.3 2.4.3 3.6 0l7.3-2.1c1.9-.5 3.7.7 3.7 2.7v6.4c0 2-1.4 3.8-3.3 4.3l-7.9 2.1c-1 .3-2.2.3-3.2 0l-7.9-2.1c-1.9-.5-3.3-2.3-3.3-4.3Z" />
      <path d="M6.6 9.2c1.6-.4 3 .5 3.6 2M21.4 9.2c-1.6-.4-3 .5-3.6 2" />
    </svg>
  )
}

/**
 * Насколько ужать заголовок с маркой. В макете «Lexus RX 350 | 2022» — 24px и
 * одна строка; считаем по числу знаков вместе с годом и разделителем.
 */
function carNameSize(car: FoundCar): 'm' | 's' | undefined {
  const length = `${car.brand} ${car.model}`.length + (car.year ? 7 : 0)
  if (length > 26) return 's'
  if (length > 20) return 'm'
  return undefined
}

// Галочка выполненного шага: в макете тёмная на золотом круге.
function StepCheck() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden>
      <path d="m3.2 7.3 2.7 2.8 4.9-5.4" />
    </svg>
  )
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
  const [catalog, setCatalog] = useState(DEFAULT_CAR_CATALOG)
  const [appliedLookup, setAppliedLookup] = useState<CarInfo | undefined>(undefined)
  const lookupGeneration = useRef(0)
  const giftRailRef = useRef<HTMLUListElement>(null)
  const [giftIndex, setGiftIndex] = useState(0)
  const [preview, setPreview] = useState<CertificateKind | null>(null)

  const onGiftScroll = () => {
    const rail = giftRailRef.current
    if (!rail) return
    setGiftIndex(Math.round(rail.scrollLeft / Math.max(1, rail.clientWidth)))
  }

  // Три группы: марки техцентра, ходовые марки, остальной алфавит. Границы
  // групп отчёркиваются, чтобы список читался как три блока, а не сплошняк.
  const brandOptions = carBrands(catalog).map((item, index, list) => {
    const group = isFeaturedBrand(item) ? 0 : isPopularBrand(item) ? 1 : 2
    const nextItem = list[index + 1]
    const nextGroup = !nextItem ? group : isFeaturedBrand(nextItem) ? 0 : isPopularBrand(nextItem) ? 1 : 2
    return { value: item, label: item, featured: group === 0, divider: nextGroup !== group }
  })

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
    if (ready && !show) router.replace('/car-number')
  }, [ready, router, show])

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

  useEffect(() => {
    let active = true
    fetchCarCatalog()
      .then((configured) => {
        if (active) setCatalog(configured)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

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
  const plateMain = splitPlate(data.plateNumber ?? '').main
  const supportedBrand = /^(toyota|lexus)$/i.test(car?.brand ?? '')
  // Логотип марки над карточкой есть только у Lexus: в макетах Toyota идёт
  // набором, а чужие марки логотипом не подписываются вовсе.
  const brandLogo = /^lexus$/i.test(car?.brand ?? '') ? '/images/redesign/lexus-logo.svg' : null

  if (ui === 'found' && car) {
    return (
      <main className={styles.foundScreen}>
        <p className={styles.foundEyebrow}>Автомобиль успешно найден</p>

        <section className={styles.foundPanel}>
          {/* Марка над карточкой: у Lexus логотип, у Toyota — набор, как в
              макетах и на самом пригласительном. Чужие марки не подписываем. */}
          {brandLogo ? (
            <Image
              className={styles.brandLogo}
              src={brandLogo}
              alt={car.brand}
              width={154}
              height={28}
              priority
            />
          ) : isToyota(car.brand) ? (
            <p className={styles.brandWordmark}>TOYOTA</p>
          ) : null}

          {/* «Lexus RX 350 | 2022» стоит в макете одной строкой. Длинные имена
              вроде «Toyota Land Cruiser» в 24px туда не влезают и разрывают
              строку прямо на разделителе, поэтому шрифт для них мельче. */}
          <h1 className={styles.carName} data-size={carNameSize(car)}>
            <span>{car.brand} {car.model}</span>
            {car.year ? <><i /> <span>{car.year}</span></> : null}
          </h1>

          <div className={styles.staticPlate} aria-label={`Госномер ${plateShown.main} ${plateShown.region}`}>
            {/* На настоящем знаке цифры крупнее букв — в макете так же */}
            <span className={styles.staticMain}>
              <b>{plateMain.slice(0, 1)}</b>
              <i>{plateMain.slice(1, 4)}</i>
              <b>{plateMain.slice(4, 6)}</b>
            </span>
            <span className={styles.staticRegion}>
              <strong>{plateShown.region}</strong>
              <Image src="/images/plate-rus-flag.svg" alt="RUS" width={48} height={12} />
            </span>
          </div>

          {/* Список готовности — про марки техцентра. Чужой марке вместо него
              одна строка о другом техцентре, а подарки показываются в обоих
              случаях. */}
          {supportedBrand ? (
            <ul className={styles.progressList}>
                <li>
                  <StepIcon kind="gift" />
                  <span>Персональное<br />приглашение готово</span>
                  <b><StepCheck /></b>
                </li>
                <li>
                  <StepIcon kind="letter" />
                  <span>Подарок зарезервирован<br />за вашим автомобилем</span>
                  <b><StepCheck /></b>
                </li>
                <li>
                  <StepIcon kind="mask" />
                  <span>Осталось подтвердить<br />владельца</span>
                  <b className={styles.pendingCheck} />
                </li>
            </ul>
          ) : (
            <article className={styles.otherBrandNotice}>
              <span className={styles.serviceIcon} aria-hidden>
                <svg viewBox="0 0 32 32">
                  <path d="M5 14.5 16 5l11 9.5v12H5z" />
                  <path d="M12 26.5v-8h8v8M3 15.5 16 4l13 11.5" />
                </svg>
              </span>
              <div>
                <strong>Ваш автомобиль обслуживается в другом техцентре</strong>
                <p>
                  Мы специализируемся на Toyota и Lexus. Для вашего автомобиля у нас есть
                  отдельный специализированный техцентр.
                </p>
              </div>
            </article>
          )}

          <p className={styles.giftLead}>
            Для Вашего автомобиля приготовлены
            <span>персональные подарки в честь знакомства</span>
          </p>

          {/* Подарки листаются свайпом: в кадр помещается один, второй
              выглядывает справа. Тап открывает сам пригласительный. */}
          <ul
            className={styles.giftRail}
            ref={giftRailRef}
            onScroll={onGiftScroll}
            aria-label="Подарки в честь знакомства"
          >
            {GIFTS.map((gift) => (
              <li className={styles.giftSlide} key={gift.kind}>
                <button
                  type="button"
                  className={styles.giftCard}
                  data-frame={certificatePreview(gift.kind, car.brand).frame ?? undefined}
                  style={
                    {
                      '--gift-image': `url(${certificatePreview(gift.kind, car.brand).photo})`,
                    } as CSSProperties
                  }
                  onClick={() => setPreview(gift.kind)}
                  aria-label={`Посмотреть пригласительный: ${gift.title}`}
                >
                  {/* Текст прижат к верху карточки, кнопка — к низу: между ними
                      распорка `justify-content`, как в макете. */}
                  <span className={styles.giftCardInner}>
                    <small>Сертификат</small>
                    {gift.amount && <strong>{gift.amount}</strong>}
                    <span className={styles.giftTitle}>{gift.title}</span>
                  </span>
                  <span className={styles.giftMore}>Подробно</span>
                </button>
              </li>
            ))}
          </ul>

          <div className={styles.giftDots} aria-hidden>
            {GIFTS.map((gift, i) => (
              <i key={gift.kind} data-active={giftIndex === i || undefined} />
            ))}
          </div>

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

        {/* Имени гость ещё не вводил, поэтому в превью стоит «Ваше имя» —
            так он заранее видит, как будет выглядеть его пригласительный.
            Номер он уже ввёл: его печатаем на кадре автомобиля по-настоящему. */}
        {preview && (
          <CertificateViewer
            kind={preview}
            brand={car.brand}
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
            options={brandOptions}
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
              // Пустой <label> вокруг поля перебивает placeholder, и поле
              // остаётся без доступного имени: подписываем явно.
              aria-label="Модель"
              placeholder="Модель"
              maxLength={40}
              value={customModel}
              error={errors.model}
              onChange={(e) => setCustomModel(e.target.value)}
            />
          )}

          {models.length > 0 && model === OTHER_OPTION && (
            <TextField
              aria-label="Впишите модель"
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
