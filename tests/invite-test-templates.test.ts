import { describe, expect, it } from 'vitest'

import {
  bookingText,
  extractCode,
  fillTemplate,
  openingText,
  replyText,
} from '@/invite-test/config/certificates'

const guest = {
  fullName: 'Валерий Михайлович',
  brand: 'Lexus',
  model: 'RX',
  year: 2020,
  plate: 'А555АА125',
  amount: 1500,
}

describe('fillTemplate', () => {
  it('подставляет значения в фигурные скобки', () => {
    expect(fillTemplate('Привет, {name}!', { name: 'Иван' })).toBe('Привет, Иван!')
  })

  it('оставляет неизвестную подстановку как есть — опечатку видно менеджеру', () => {
    expect(fillTemplate('Привет, {имя}!', { name: 'Иван' })).toBe('Привет, {имя}!')
  })

  it('выбрасывает строку, где все подстановки пустые', () => {
    const text = fillTemplate('Здравствуйте!\nАвтомобиль: {car}.\nЖдём в гости', { car: '' })
    expect(text).toBe('Здравствуйте!\nЖдём в гости')
  })

  it('схлопывает отбивку, оставшуюся от выпавшей строки', () => {
    expect(fillTemplate('Привет\n\n{car}\n\nПока', { car: '' })).toBe('Привет\n\nПока')
  })
})

describe('тексты из админки', () => {
  it('текст гостя берётся из шаблона вместе с кодом', () => {
    expect(openingText('ACEF34679K', 'Код {code}, жду пригласительные')).toBe(
      'Код ACEF34679K, жду пригласительные',
    )
  })

  it('пустой шаблон возвращает формулировку по умолчанию', () => {
    expect(openingText('ACEF34679K', '   ')).toContain('Код: ACEF34679K')
  })

  it('сообщение с пригласительными знает имя, автомобиль, номер и сумму', () => {
    // Сумма набирается неразрывным пробелом — как её отдаёт Intl.
    const amount = new Intl.NumberFormat('ru-RU').format(1500)
    expect(replyText(guest.fullName, guest, '{name}: {car}, {plate}, {amount} ₽')).toBe(
      `Валерий Михайлович: Lexus RX 2020, А555АА125, ${amount} ₽`,
    )
  })

  it('текст записи на сервис тоже правится шаблоном', () => {
    expect(
      bookingText('Lexus RX 2020', 'А555АА125', [], 'Записаться: {car} ({plate})'),
    ).toBe('Записаться: Lexus RX 2020 (А555АА125)')
  })

  it('отмеченные работы встают на место {services}', () => {
    expect(
      bookingText('Lexus RX 2020', 'А555АА125', ['Ремонт ходовой части'], 'Нужно: {services}'),
    ).toBe('Нужно: Ремонт ходовой части')
  })

  it('в шаблоне без {services} работы дописываются в конец', () => {
    // Формулировку правят в админке, и старый текст подстановки не знает —
    // терять выбор гостя из-за этого нельзя.
    expect(
      bookingText('Lexus RX 2020', 'А555АА125', ['Замена масла двигателя'], 'Записаться: {car}'),
    ).toBe('Записаться: Lexus RX 2020\nНужны работы: Замена масла двигателя.')
  })

  it('без отмеченных работ строка про них выпадает', () => {
    expect(bookingText('Lexus RX 2020', 'А555АА125')).toBe(
      'Здравствуйте! Хочу записаться на сервис.\nАвтомобиль: Lexus RX 2020, номер А555АА125.',
    )
  })
})

describe('extractCode', () => {
  it('находит код по слову «Код»', () => {
    expect(extractCode('Здравствуйте! Код: ACEF34679K')).toBe('ACEF34679K')
  })

  it('находит код в диплинке бота', () => {
    expect(extractCode('/start ACEF34679K')).toBe('ACEF34679K')
  })

  it('находит код и без слова «Код» — формулировку правят в админке', () => {
    expect(extractCode('Жду пригласительные, ACEF34679K')).toBe('ACEF34679K')
  })

  it('обычные слова за код не принимает', () => {
    expect(extractCode('Здравствуйте, хочу записаться на диагностику')).toBeNull()
    // десять букв без единой цифры — на код выдачи не похоже
    expect(extractCode('ACEFHJKLMN')).toBeNull()
  })
})
