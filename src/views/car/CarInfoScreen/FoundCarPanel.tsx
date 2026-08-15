import Image from 'next/image'
import type { CSSProperties } from 'react'

import { formatPlate, splitPlate } from '@/features/plate-lookup'
import { brandLogo } from '@/shared/config/brand-logos'
import { BOOKING_SERVICES } from '@/shared/config/services'
import { Button, Loader } from '@/shared/ui'
import { isToyota, type CertificateKind } from '@/widgets/certificate-sheet'

import { Gap } from './Gap'
import { GIFTS } from './gifts'
import { StepCheck, StepIcon } from './icons'
import { modelSize, type FoundCar } from './model'
import styles from './CarInfoScreen.module.scss'

interface FoundCarPanelProps {
  car: FoundCar
  plateNumber: string | null
  /** Ветка записи: вместо подарков — список работ. */
  booking: boolean
  services: string[]
  onToggleService: (service: string) => void
  submitting: boolean
  errorMessage?: string
  onConfirm: () => void
  onChangeCar: () => void
  onPreview: (kind: CertificateKind) => void
}

export function FoundCarPanel({
  car,
  plateNumber,
  booking,
  services,
  onToggleService,
  submitting,
  errorMessage,
  onConfirm,
  onChangeCar,
  onPreview,
}: FoundCarPanelProps) {
  const plateShown = formatPlate(plateNumber ?? '')
  const plateMain = splitPlate(plateNumber ?? '').main
  const supportedBrand = /^(toyota|lexus)$/i.test(car.brand)
  const logo = brandLogo(car.brand)
  const redLogo = isToyota(car.brand)

  return (
    <section className={`${styles.foundPanel} ${booking ? styles.foundPanelCompact : ''}`}>
      <Gap size={24} />

      {/* Марка отдельной строкой, под ней модель с годом (39:3661, 39:3718).
          Логотип чисто декоративный: марка тут же написана словом. */}
      <h1 className={styles.carName}>
        <span className={styles.carBrand}>
          {logo &&
            (redLogo ? (
              // Toyota узнают по красному: одноцветный кадр марки уходит в
              // маску, а цвет берётся тот же, что у надписи на сертификате.
              <span
                className={`${styles.brandLogo} ${styles.brandLogoRed}`}
                style={{ '--brand-logo': `url(${logo})` } as CSSProperties}
                aria-hidden
              />
            ) : (
              <Image className={styles.brandLogo} src={logo} alt="" width={56} height={56} />
            ))}
          <span>{car.brand}</span>
        </span>
        <span className={styles.carModel} data-size={modelSize(car)}>
          <span>{car.model}</span>
          {car.year ? <><i /><span>{car.year}</span></> : null}
        </span>
      </h1>

      <Gap size={8} />

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

      <Gap size={booking ? 32 : supportedBrand ? 44 : 24} />

      {booking ? (
        <BookingServices services={services} onToggle={onToggleService} />
      ) : supportedBrand ? (
        <ReadinessSteps />
      ) : (
        <OtherBrandNotice />
      )}

      {!booking && (
        <>
          <Gap size={supportedBrand ? 32 : 20} />

          <p className={styles.giftLead}>
            Для Вашего автомобиля мы приготовили
            <span>персональные подарки в честь знакомства</span>
          </p>

          <Gap size={4} />

          <GiftRail onPreview={onPreview} />
        </>
      )}

      {errorMessage && <p className={styles.error}>{errorMessage}</p>}

      <Gap size={8} />

      <Button block className={styles.confirmButton} onClick={onConfirm} disabled={submitting}>
        {submitting ? <Loader label="Сохраняем" /> : 'Это мой автомобиль'}
      </Button>

      <Gap size={20} />

      <button type="button" className={styles.changeButton} onClick={onChangeCar}>
        Изменить автомобиль
      </button>

      <Gap size={25} />
    </section>
  )
}

function BookingServices({
  services,
  onToggle,
}: {
  services: string[]
  onToggle: (service: string) => void
}) {
  return (
    <>
      <p className={styles.giftLead}>
        Отметьте, что нужно сделать
        <span>с Вашим автомобилем</span>
      </p>

      <Gap size={16} />

      <ul className={styles.serviceList}>
        {BOOKING_SERVICES.map((service) => (
          <li key={service}>
            <label className={styles.service}>
              <input
                type="checkbox"
                className={styles.serviceInput}
                checked={services.includes(service)}
                onChange={() => onToggle(service)}
              />
              <span className={styles.serviceBox} aria-hidden>
                <StepCheck />
              </span>
              <span>{service}</span>
            </label>
          </li>
        ))}
      </ul>

      <Gap size={16} />
    </>
  )
}

function ReadinessSteps() {
  return (
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
        <StepIcon kind="owner" />
        <span>Осталось подтвердить<br />владельца</span>
        <b className={styles.pendingCheck} />
      </li>
    </ul>
  )
}

function OtherBrandNotice() {
  return (
    <article className={styles.otherBrandNotice}>
      {/* Иконка и обводка плашки синие, а не золотые: в макете чужая марка
          отделена от фирменного золота техцентра. */}
      <p className={styles.otherBrandHead}>
        <span className={styles.serviceIcon} aria-hidden>
          <Image src="/images/car-service.svg" alt="" width={36} height={36} />
        </span>
        <strong>Ваш автомобиль<br />обслуживается<br />в нашем другом техцентре</strong>
      </p>
      <p className={styles.otherBrandNote}>
        Мы специализируемся на Toyota и Lexus.
      </p>
      <p className={styles.otherBrandNote}>
        Для Вашего автомобиля у нас есть отдельный
        <br />
        специализированный техцентр
      </p>
    </article>
  )
}

function GiftRail({ onPreview }: { onPreview: (kind: CertificateKind) => void }) {
  return (
    // Подарки листаются свайпом: в кадр помещается один, второй выглядывает
    // справа. Тап открывает сам пригласительный.
    <ul className={styles.giftRail} aria-label="Подарки в честь знакомства">
      {GIFTS.map((gift) => (
        <li className={styles.giftSlide} key={gift.kind}>
          <button
            type="button"
            className={styles.giftCard}
            onClick={() => onPreview(gift.kind)}
            aria-label={`Посмотреть пригласительный: ${gift.title}`}
          >
            {/* Текст прижат к верху карточки, кнопка — к низу: между ними
                распорка `justify-content`, как в макете. */}
            <span className={styles.giftCardInner}>
              <small>Сертификат</small>
              {gift.amount && <strong>{gift.amount}</strong>}
              <span className={styles.giftTitle}>{gift.text}</span>
            </span>
            <span className={styles.giftMore}>Подробно</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
