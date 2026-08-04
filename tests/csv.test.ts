import { describe, expect, it } from 'vitest'

import { buildCsv, csvCell } from '@/lib/csv'

describe('csvCell', () => {
  it('простые значения не оборачивает', () => {
    expect(csvCell('abc')).toBe('abc')
    expect(csvCell(2022)).toBe('2022')
    expect(csvCell(true)).toBe('true')
  })

  it('пустые значения превращает в пустую строку', () => {
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
  })

  it('экранирует запятые, кавычки и переводы строк', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('a"b')).toBe('"a""b"')
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"')
    expect(csvCell('a;b')).toBe('"a;b"')
  })
})

describe('buildCsv', () => {
  it('добавляет BOM и склеивает строки через CRLF', () => {
    const csv = buildCsv(['Имя', 'Телефон'], [['Иван', '+79990000000']])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('Имя,Телефон')
    expect(csv).toContain('Иван,+79990000000')
    expect(csv.split('\r\n')).toHaveLength(2)
  })

  it('экранирует ячейки с запятыми', () => {
    const csv = buildCsv(['a'], [['x,y']])
    expect(csv).toContain('"x,y"')
  })
})
