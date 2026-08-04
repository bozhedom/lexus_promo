import { Manrope, Marck_Script, Open_Sans } from 'next/font/google'

// Основной шрифт интерфейса
export const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
})

// Рукописный акцент на стартовом экране
export const marckScript = Marck_Script({
  subsets: ['latin', 'cyrillic'],
  weight: '400',
  variable: '--font-marck',
  display: 'swap',
})

// Цифры госномера
export const openSans = Open_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['600', '700'],
  variable: '--font-opensans',
  display: 'swap',
})

export const fontVariables = `${manrope.variable} ${marckScript.variable} ${openSans.variable}`
