import { PlateInput } from '@/features/plate-lookup'
import { OTHER_OPTION, carYears } from '@/shared/config/car-data'
import { Button, Loader, SelectField, TextField } from '@/shared/ui'

import styles from './CarInfoScreen.module.scss'

export interface BrandOption {
  value: string
  label: string
  featured: boolean
  divider: boolean
}

interface ManualCarFormProps {
  plateValue: string
  brand: string
  model: string
  customModel: string
  year: string
  brandOptions: BrandOption[]
  models: string[]
  errors: Record<string, string>
  /** Внешний API автомобиль не нашёл — предупреждаем над формой. */
  notFound: boolean
  submitting: boolean
  canSubmit: boolean
  onPlateChange: (value: string) => void
  onBrandChange: (value: string) => void
  onModelChange: (value: string) => void
  onCustomModelChange: (value: string) => void
  onYearChange: (value: string) => void
  onBackToPlate: () => void
  onSubmit: () => void
}

export function ManualCarForm({
  plateValue,
  brand,
  model,
  customModel,
  year,
  brandOptions,
  models,
  errors,
  notFound,
  submitting,
  canSubmit,
  onPlateChange,
  onBrandChange,
  onModelChange,
  onCustomModelChange,
  onYearChange,
  onBackToPlate,
  onSubmit,
}: ManualCarFormProps) {
  return (
    <div className={styles.manualPanel}>
      <div className={styles.tabs} aria-label="Способ ввода автомобиля">
        <button type="button" onClick={onBackToPlate}>По номеру авто</button>
        <span className={styles.tabActive}>Указать вручную</span>
      </div>

      <PlateInput
        defaultValue={plateValue}
        invalid={Boolean(errors.plate)}
        onChange={onPlateChange}
      />

      {notFound && (
        <p className={styles.notFound}>Автомобиль не найден<br />Введите данные вручную</p>
      )}

      <SelectField
        placeholder="Марка"
        value={brand}
        error={errors.brand}
        onChange={onBrandChange}
        options={brandOptions}
      />

      {!brand ? (
        <SelectField placeholder="Модель" value="" disabled onChange={() => undefined} options={[]} />
      ) : models.length > 0 ? (
        <SelectField
          placeholder="Модель"
          value={model}
          error={errors.model}
          onChange={onModelChange}
          options={models.map((item) => ({ value: item, label: item }))}
        />
      ) : (
        <TextField
          // Пустой <label> вокруг поля перебивает placeholder, и поле остаётся
          // без доступного имени: подписываем явно.
          aria-label="Модель"
          placeholder="Модель"
          maxLength={40}
          value={customModel}
          error={errors.model}
          onChange={(e) => onCustomModelChange(e.target.value)}
        />
      )}

      {models.length > 0 && model === OTHER_OPTION && (
        <TextField
          aria-label="Впишите модель"
          placeholder="Впишите модель"
          maxLength={40}
          value={customModel}
          error={errors.model}
          onChange={(e) => onCustomModelChange(e.target.value)}
        />
      )}

      <SelectField
        placeholder="Год"
        value={year}
        error={errors.year}
        onChange={onYearChange}
        options={carYears().map((value) => ({ value: String(value), label: String(value) }))}
      />

      {errors.plate && <span className={styles.error}>{errors.plate}</span>}
      {errors.form && <p className={styles.error}>{errors.form}</p>}

      <Button block onClick={onSubmit} disabled={!canSubmit || submitting}>
        {submitting ? <Loader label="Сохраняем" /> : 'Подтвердить'}
      </Button>
    </div>
  )
}

/** Прямой заход на адрес: номер уже есть, ответ внешнего API ещё едет. */
export function LookupPendingPanel({
  plateNumber,
  onManual,
}: {
  plateNumber?: string
  onManual: () => void
}) {
  return (
    <div className={styles.lookupPanel}>
      <div className={styles.tabs} aria-label="Способ ввода автомобиля">
        <span className={styles.tabActive}>По номеру авто</span>
        <button type="button" onClick={onManual}>Указать вручную</button>
      </div>
      <PlateInput defaultValue={plateNumber} disabled onChange={() => undefined} />
      <div className={styles.lookupButton} role="status" aria-label="Определяем автомобиль">
        <Loader />
      </div>
    </div>
  )
}
