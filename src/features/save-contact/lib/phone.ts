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
