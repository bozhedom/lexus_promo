// Экранирование значения для CSV (RFC 4180): оборачиваем в кавычки, если внутри
// есть запятая, кавычка, перевод строки или точка с запятой; кавычки удваиваем.
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

// Собирает CSV с BOM (чтобы кириллица открывалась в Excel).
export function buildCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))]
  return '﻿' + lines.join('\r\n')
}
