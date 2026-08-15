import type { CarInfo } from '@/shared/lib/types'

export type UiState = 'loading' | 'found' | 'manual'

export interface FoundCar {
  brand: string
  model: string
  year: number | null
}

export interface InitialState {
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
export function initialFrom(lookup: CarInfo | undefined, manual: boolean): InitialState {
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

/**
 * Насколько ужать строку модели. В макете «RANGE ROVER | 2022» — 16px и одна
 * строка; считаем по числу знаков вместе с годом и разделителем.
 */
export function modelSize(car: FoundCar): 'm' | 's' | undefined {
  const length = car.model.length + (car.year ? 7 : 0)
  if (length > 26) return 's'
  if (length > 20) return 'm'
  return undefined
}
