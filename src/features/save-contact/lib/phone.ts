// Клиентская маска телефона РФ. Нормализацию-источник истины делает сервер
// (@/lib/validation → validatePhone).

// Форматирует ввод в вид +7 (999) 123-45-67
export function maskPhone(input: string): string {
  let d = input.replace(/\D/g, '')
  if (d === '') return ''
  if (d[0] === '8') d = '7' + d.slice(1)
  else if (d[0] === '9') d = '7' + d
  else if (d[0] !== '7') d = '7' + d
  d = d.slice(0, 11)

  const rest = d.slice(1) // 10 цифр после кода страны
  let out = '+7'
  if (rest.length > 0) out += ' (' + rest.slice(0, 3)
  if (rest.length >= 3) out += ')'
  if (rest.length > 3) out += ' ' + rest.slice(3, 6)
  if (rest.length > 6) out += '-' + rest.slice(6, 8)
  if (rest.length > 8) out += '-' + rest.slice(8, 10)
  return out
}

// Полный номер: код страны + 10 цифр
export function isPhoneComplete(value: string): boolean {
  return value.replace(/\D/g, '').length === 11
}

/**
 * Возвращает позицию каретки после повторного применения маски. Ориентируемся
 * на количество цифр слева от каретки, поэтому вставка и удаление в середине
 * номера не отправляют курсор в начало или конец поля.
 */
export function phoneCaretPosition(raw: string, rawCaret: number, masked: string): number {
  const rawDigits = raw.replace(/\D/g, '')
  let digitsBeforeCaret = raw.slice(0, rawCaret).replace(/\D/g, '').length

  // Для номера, введённого с 9 (или другой цифры кроме 7/8), maskPhone
  // автоматически добавляет код страны. Учитываем эту дополнительную цифру.
  if (rawDigits && rawDigits[0] !== '7' && rawDigits[0] !== '8') {
    digitsBeforeCaret += 1
  }

  if (digitsBeforeCaret === 0) return 0

  let seen = 0
  for (let i = 0; i < masked.length; i += 1) {
    if (/\d/.test(masked[i])) seen += 1
    if (seen === digitsBeforeCaret) return i + 1
  }
  return masked.length
}
