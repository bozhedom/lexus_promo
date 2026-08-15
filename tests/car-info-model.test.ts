import { describe, expect, it } from 'vitest'

import { initialFrom, modelSize } from '@/views/car/CarInfoScreen/model'

describe('initialFrom', () => {
  it('по прямому запросу ручного ввода открывает форму без предупреждения', () => {
    expect(initialFrom({ found: true, brand: 'Lexus', model: 'RX', year: 2020 }, true)).toEqual({
      ui: 'manual',
      car: null,
      brand: '',
      year: '',
      notice: false,
    })
  })

  it('без ответа API остаётся на загрузчике', () => {
    expect(initialFrom(undefined, false).ui).toBe('loading')
  })

  it('ненайденный автомобиль ведёт на форму с предупреждением', () => {
    const state = initialFrom({ found: false }, false)
    expect(state.ui).toBe('manual')
    expect(state.notice).toBe(true)
    expect(state.car).toBeNull()
  })

  it('найденный без модели подставляет марку и год в форму', () => {
    expect(initialFrom({ found: true, brand: 'Toyota', model: '', year: 2018 }, false)).toEqual({
      ui: 'manual',
      car: null,
      brand: 'Toyota',
      year: '2018',
      notice: false,
    })
  })

  it('найденный без модели и без года оставляет год пустым', () => {
    expect(initialFrom({ found: true, brand: 'Toyota', model: '', year: null }, false).year).toBe('')
  })

  it('полный ответ раскладывает в карточку автомобиля', () => {
    expect(initialFrom({ found: true, brand: 'Lexus', model: 'RX 350', year: 2021 }, false)).toEqual({
      ui: 'found',
      car: { brand: 'Lexus', model: 'RX 350', year: 2021 },
      brand: '',
      year: '',
      notice: false,
    })
  })
})

describe('modelSize', () => {
  const car = (model: string, year: number | null) => ({ brand: 'Lexus', model, year })

  it('короткую строку не ужимает', () => {
    expect(modelSize(car('RX', 2021))).toBeUndefined()
  })

  it('год добавляет к длине разделитель', () => {
    expect(modelSize(car('LAND CRUISER 200', null))).toBeUndefined()
    expect(modelSize(car('LAND CRUISER 200', 2021))).toBe('m')
  })

  it('самую длинную строку ужимает до s', () => {
    expect(modelSize(car('LAND CRUISER PRADO 150', 2021))).toBe('s')
  })
})
