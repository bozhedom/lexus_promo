import { describe, expect, it } from 'vitest'

import {
  formatPlate,
  isPlateComplete,
  maskPlateMain,
  maskRegion,
  splitPlate,
} from '@/features/plate-lookup/lib/mask'

describe('maskPlateMain', () => {
  it('латиницу приводит к кириллице и держит формат буква-3цифры-2буквы', () => {
    expect(maskPlateMain('a555aa')).toBe('А555АА')
    expect(maskPlateMain('B123BB')).toBe('В123ВВ')
  })

  it('обрезает до 6 символов и не пускает мусор в позиции', () => {
    expect(maskPlateMain('А555АА125')).toBe('А555АА')
    expect(maskPlateMain('5А5')).toBe('А5') // первая цифра игнорируется
    expect(maskPlateMain('ЖЖЖ')).toBe('') // недопустимые буквы
  })
})

describe('maskRegion', () => {
  it('оставляет только цифры, максимум 3', () => {
    expect(maskRegion('125abc')).toBe('125')
    expect(maskRegion('7')).toBe('7')
    expect(maskRegion('1259')).toBe('125')
  })
})

describe('splitPlate / isPlateComplete', () => {
  it('разбивает канонический номер', () => {
    expect(splitPlate('А555АА125')).toEqual({ main: 'А555АА', region: '125' })
  })

  it('полнота номера', () => {
    expect(isPlateComplete('А555АА', '125')).toBe(true)
    expect(isPlateComplete('А555АА', '77')).toBe(true)
    expect(isPlateComplete('А55АА', '125')).toBe(false)
    expect(isPlateComplete('А555АА', '1')).toBe(false)
  })
})

describe('formatPlate', () => {
  it('красиво разбивает для показа', () => {
    expect(formatPlate('А555АА125')).toEqual({ main: 'А 555 АА', region: '125' })
  })
})
