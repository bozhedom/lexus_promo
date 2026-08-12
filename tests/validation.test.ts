import { describe, expect, it } from 'vitest'

import {
  normalizePlate,
  validateCarYear,
  validateEmail,
  validateFullName,
  validateShortText,
  validatePhone,
  validatePlate,
} from '@/lib/validation'

describe('validatePlate', () => {
  it('принимает корректный номер с регионом из 2 и 3 цифр', () => {
    expect(validatePlate('А555АА125')).toBe('А555АА125')
    expect(validatePlate('В123ВВ77')).toBe('В123ВВ77')
  })

  it('нормализует латиницу, регистр и пробелы', () => {
    expect(validatePlate('a 555 aa 125')).toBe('А555АА125')
    expect(validatePlate('B123BB77')).toBe('В123ВВ77')
  })

  it('отклоняет мусор', () => {
    expect(validatePlate('')).toBeNull()
    expect(validatePlate('Ж555АА125')).toBeNull() // Ж не бывает в номерах
    expect(validatePlate('А55АА125')).toBeNull()
    expect(validatePlate('А555АА1')).toBeNull()
    expect(validatePlate(12345 as unknown as string)).toBeNull()
    expect(validatePlate('А555АА1255')).toBeNull()
  })
})

describe('normalizePlate', () => {
  it('не трогает уже канонический номер', () => {
    expect(normalizePlate('А555АА125')).toBe('А555АА125')
  })
})

describe('validatePhone', () => {
  it('нормализует форматы РФ к +7', () => {
    expect(validatePhone('+7 (999) 666-00-12')).toBe('+79996660012')
    expect(validatePhone('89996660012')).toBe('+79996660012')
    expect(validatePhone('9996660012')).toBe('+79996660012')
  })

  it('отклоняет неполные и чужие номера', () => {
    expect(validatePhone('123')).toBeNull()
    expect(validatePhone('+1 555 123 4567')).toBeNull()
    expect(validatePhone('999666001')).toBeNull()
    expect(validatePhone(null)).toBeNull()
  })
})

describe('validateFullName', () => {
  it('принимает имя и отчество, схлопывает пробелы', () => {
    expect(validateFullName('  Иван   Александрович ')).toBe('Иван Александрович')
    expect(validateFullName('Анна-Мария Петровна')).toBe('Анна-Мария Петровна')
    expect(validateFullName('Иван Александрович Петров')).toBe('Иван Александрович Петров')
  })

  it('принимает имя без отчества', () => {
    expect(validateFullName('Иван')).toBe('Иван')
    expect(validateFullName('  Анна-Мария  ')).toBe('Анна-Мария')
  })

  it('требует хотя бы две буквы', () => {
    expect(validateFullName('И')).toBeNull()
    expect(validateFullName('')).toBeNull()
  })

  it('отклоняет цифры, разметку и мусор', () => {
    expect(validateFullName('Иван123 Петрович')).toBeNull()
    expect(validateFullName('<script>alert(1)</script>')).toBeNull()
    expect(validateFullName('Иван <b>Петрович</b>')).toBeNull()
    expect(validateFullName('аааааа Петрович')).toBeNull()
    expect(validateFullName('И'.repeat(70) + ' Петрович')).toBeNull()
  })
})

describe('validateShortText', () => {
  it('принимает названия моделей', () => {
    expect(validateShortText('Land Cruiser 300')).toBe('Land Cruiser 300')
    expect(validateShortText('X5 M-sport')).toBe('X5 M-sport')
    expect(validateShortText('3 серия (F30)')).toBe('3 серия (F30)')
  })

  it('отклоняет разметку и слишком длинное', () => {
    expect(validateShortText('<img src=x onerror=alert(1)>')).toBeNull()
    expect(validateShortText('RX"; drop table')).toBeNull()
    expect(validateShortText('R'.repeat(41))).toBeNull()
    expect(validateShortText('   ')).toBeNull()
  })
})

describe('validateCarYear', () => {
  it('принимает разумный год числом и строкой', () => {
    expect(validateCarYear(2022)).toBe(2022)
    expect(validateCarYear('2022')).toBe(2022)
  })

  it('отклоняет будущее и древность', () => {
    expect(validateCarYear(1900)).toBeNull()
    expect(validateCarYear(2999)).toBeNull()
    expect(validateCarYear('abc')).toBeNull()
  })
})

describe('validateEmail', () => {
  it('принимает и нормализует email', () => {
    expect(validateEmail(' Test@Example.COM ')).toBe('test@example.com')
  })

  it('отклоняет некорректный', () => {
    expect(validateEmail('not-an-email')).toBeNull()
    expect(validateEmail('a@b')).toBeNull()
  })
})
