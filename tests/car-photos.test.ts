import { describe, expect, it } from 'vitest'

import { FALLBACK_CAR_PHOTO, matchCarPhoto, type CarPhoto } from '@/shared/config/car-photos'
import { certificateFace } from '@/widgets/certificate-sheet/layout'

const managed = (over: Partial<CarPhoto>): CarPhoto => ({
  brand: 'Toyota',
  model: '',
  yearFrom: null,
  yearTo: null,
  photo: '/from-admin.webp',
  photoRaster: 'media/car-photos/from-admin.jpg',
  plate: { x: 0.4, y: 0.6, w: 0.17 },
  ...over,
})

describe('matchCarPhoto', () => {
  it('берёт кадр модели, а не общий кадр марки', () => {
    expect(matchCarPhoto([], { brand: 'Lexus', model: 'RX 350' }).photo).toBe(
      '/images/cert/cars/lexus-rx-350.webp',
    )
    expect(matchCarPhoto([], { brand: 'Lexus', model: 'GS' }).photo).toBe(
      '/images/cert/bg-diagnostics-lexus.webp',
    )
  })

  it('не путает поколения Land Cruiser между собой', () => {
    const photo = (model: string) => matchCarPhoto([], { brand: 'Toyota', model }).photo
    expect(photo('Land Cruiser 300')).toBe('/images/cert/cars/toyota-land-cruiser-300.webp')
    expect(photo('Land Cruiser 200')).toBe('/images/cert/cars/toyota-land-cruiser-200.webp')
    expect(photo('Land Cruiser 100')).toBe('/images/cert/cars/toyota-land-cruiser-100.webp')
    expect(photo('Land Cruiser Prado 150')).toBe(
      '/images/cert/cars/toyota-land-cruiser-prado-150.webp',
    )
  })

  it('«Land Cruiser» без поколения не превращается в Prado', () => {
    // В каталоге модель называется без поколения, и кадр Prado выигрывал
    // только потому, что его название длиннее.
    expect(matchCarPhoto([], { brand: 'Toyota', model: 'Land Cruiser' }).photo).not.toContain(
      'prado',
    )
  })

  it('поколение выбирается годом выпуска', () => {
    const photo = (model: string, year: number | null) =>
      matchCarPhoto([], { brand: 'Toyota', model, year }).photo
    expect(photo('RAV4', 2015)).toBe('/images/cert/cars/toyota-rav4-2013.webp')
    expect(photo('RAV4', 2023)).toBe('/images/cert/cars/toyota-rav4.webp')
    // Год неизвестен — берётся кадр нового поколения, он же кадр без годов.
    expect(photo('RAV4', null)).toBe('/images/cert/cars/toyota-rav4.webp')
    expect(photo('Land Cruiser Prado', 2006)).toBe(
      '/images/cert/cars/toyota-land-cruiser-prado-120.webp',
    )
    expect(photo('Harrier', 2018)).toBe('/images/cert/cars/toyota-harrier-2016.webp')

    const lexus = (year: number | null) =>
      matchCarPhoto([], { brand: 'Lexus', model: 'LX', year }).photo
    expect(lexus(2015)).toBe('/images/cert/cars/lexus-lx-570.webp')
    expect(lexus(2024)).toBe('/images/cert/cars/lexus-lx-600.webp')
  })

  it('у ходовых марок Приморья свой кадр, а не кадр без марки', () => {
    const photo = (brand: string, model: string) => matchCarPhoto([], { brand, model }).photo
    expect(photo('Subaru', 'Forester')).toBe('/images/cert/cars/subaru-forester.webp')
    expect(photo('Mitsubishi', 'ASX')).toBe('/images/cert/cars/mitsubishi-rvr.webp')
    expect(photo('Honda', 'Vezel')).toBe('/images/cert/cars/honda-vezel.webp')
  })

  it('марке без кадров отдаёт кадр без марки', () => {
    expect(matchCarPhoto([], { brand: 'Nissan', model: 'X-Trail' })).toBe(FALLBACK_CAR_PHOTO)
  })

  it('кадр из админки перекрывает встроенный при том же совпадении', () => {
    const photos = [managed({ model: 'RAV4' })]
    expect(matchCarPhoto(photos, { brand: 'Toyota', model: 'RAV4' }).photo).toBe('/from-admin.webp')
  })

  it('кадр с годами выигрывает у кадра без годов', () => {
    const photos = [
      managed({ model: 'Camry', photo: '/any-year.webp', yearFrom: null, yearTo: null }),
      managed({ model: 'Camry', photo: '/2018.webp', yearFrom: 2018, yearTo: 2023 }),
    ]
    expect(matchCarPhoto(photos, { brand: 'Toyota', model: 'Camry', year: 2020 }).photo).toBe(
      '/2018.webp',
    )
    expect(matchCarPhoto(photos, { brand: 'Toyota', model: 'Camry', year: 2010 }).photo).toBe(
      '/any-year.webp',
    )
    // Год неизвестен — правило с диапазоном не подходит, берётся общий кадр.
    expect(matchCarPhoto(photos, { brand: 'Toyota', model: 'Camry' }).photo).toBe('/any-year.webp')
  })

  it('кадр чужой марки не подставляется другой марке', () => {
    const photos = [managed({ brand: 'Subaru', model: 'Forester', photo: '/subaru.webp' })]
    expect(matchCarPhoto(photos, { brand: 'Toyota', model: 'Forester' }).photo).not.toBe(
      '/subaru.webp',
    )
  })
})

describe('certificateFace', () => {
  it('подарочному пригласительному марка автомобиля не важна', () => {
    const gift = certificateFace('gift', { brand: 'Toyota', model: 'RAV4' })
    expect(gift.photo).toBe('/images/cert/bg-gift.webp')
    expect(gift.plate).toBeNull()
  })

  it('диагностика печатает номер на кадре автомобиля', () => {
    const face = certificateFace('diagnostics', { brand: 'Toyota', model: 'Alphard' })
    expect(face.photo).toBe('/images/cert/cars/toyota-alphard.webp')
    expect(face.photoRaster).toBe('public/images/cert/cars/toyota-alphard.jpg')
    expect(face.plate).not.toBeNull()
  })
})
