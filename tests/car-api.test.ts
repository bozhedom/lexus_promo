import { afterEach, describe, expect, it } from 'vitest'

import { lookupCar, parseCarInfo } from '@/lib/carApi'

afterEach(() => {
  delete process.env.CAR_API_URL
  delete process.env.CAR_API_KEY
})

// Форма ответа Ortus: справочники объектами, часть полей может быть null
const ORTUS_RESPONSE = {
  drive: null,
  engine: { id: 1, label: 'diesel', title: 'Дизельный' },
  engine_capacity: 4461,
  engine_id: '1VD0347956',
  license_plate: 'А123АА',
  mark: { id: 57, drom_id: 23, label: 'lexus', title: 'Lexus', sort: 0, is_disabled: 0 },
  mark_id: 57,
  model: null,
  model_id: null,
  power: 272,
  region_id: '77',
  transmission: null,
  vin: 'JTJCV00W104004129',
  year: 2016,
}

describe('parseCarInfo', () => {
  it('берёт марку из справочника', () => {
    expect(parseCarInfo(ORTUS_RESPONSE)).toEqual({
      found: true,
      brand: 'Lexus',
      model: null,
      year: 2016,
    })
  })

  it('берёт модель, когда она есть', () => {
    const r = parseCarInfo({ ...ORTUS_RESPONSE, model: { id: 9, label: 'lx', title: 'LX' } })
    expect(r).toEqual({ found: true, brand: 'Lexus', model: 'LX', year: 2016 })
  })

  it('машины нет в базе — приходит пустой объект', () => {
    expect(parseCarInfo({})).toEqual({ found: false })
  })

  it('без марки считаем, что не определили', () => {
    expect(parseCarInfo({ ...ORTUS_RESPONSE, mark: null })).toEqual({ found: false })
  })

  it('мусорный год отбрасываем, машину оставляем', () => {
    const r = parseCarInfo({ ...ORTUS_RESPONSE, year: 0 })
    expect(r).toEqual({ found: true, brand: 'Lexus', model: null, year: null })
  })

  it('не падает на не-объекте', () => {
    expect(parseCarInfo(null)).toEqual({ found: false })
    expect(parseCarInfo('нет')).toEqual({ found: false })
  })
})

describe('lookupCar', () => {
  it('без CAR_API_URL возвращает { found: false }', async () => {
    const r = await lookupCar('Х987ХХ198') // уникальный номер, мимо кэша
    expect(r).toEqual({ found: false })
  })
})
