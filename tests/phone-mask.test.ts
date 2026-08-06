import { describe, expect, it } from 'vitest'

import {
  isPhoneComplete,
  maskPhone,
  phoneCaretPosition,
} from '@/features/save-contact/lib/phone'

describe('maskPhone', () => {
  it('форматирует разные варианты ввода к единому виду', () => {
    expect(maskPhone('89996660012')).toBe('+7 (999) 666-00-12')
    expect(maskPhone('9996660012')).toBe('+7 (999) 666-00-12')
    expect(maskPhone('+7 999 666 00 12')).toBe('+7 (999) 666-00-12')
    expect(maskPhone('79996660012')).toBe('+7 (999) 666-00-12')
  })

  it('форматирует частичный ввод по мере набора', () => {
    expect(maskPhone('99')).toBe('+7 (99')
    expect(maskPhone('999')).toBe('+7 (999)')
    expect(maskPhone('9996')).toBe('+7 (999) 6')
    expect(maskPhone('')).toBe('')
  })

  it('отбрасывает лишние цифры сверх 11', () => {
    expect(maskPhone('799966600121234')).toBe('+7 (999) 666-00-12')
  })
})

describe('phoneCaretPosition', () => {
  it('ставит каретку после введённой цифры при добавлении кода страны', () => {
    expect(phoneCaretPosition('9', 1, maskPhone('9'))).toBe(5)
  })

  it('сохраняет логическую позицию при редактировании цифры в середине', () => {
    const raw = '+7 (99) 666-00-12'
    const masked = maskPhone(raw)
    expect(phoneCaretPosition(raw, 6, masked)).toBe(6)
  })

  it('оставляет каретку в конце при наборе полного номера', () => {
    const raw = '+7 (999) 666-00-12'
    expect(phoneCaretPosition(raw, raw.length, maskPhone(raw))).toBe(raw.length)
  })
})

describe('isPhoneComplete', () => {
  it('полный номер — 11 цифр', () => {
    expect(isPhoneComplete('+7 (999) 666-00-12')).toBe(true)
    expect(isPhoneComplete('+7 (999) 666-00-1')).toBe(false)
    expect(isPhoneComplete('')).toBe(false)
  })
})
