import { Forum, Manrope, Marck_Script, Roboto, Roboto_Condensed } from 'next/font/google'

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
export const roboto = Roboto({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600'],
  variable: '--font-roboto',
  display: 'swap',
})

// Шрифты нового золотого макета Lexus.
export const forum = Forum({
  subsets: ['latin', 'cyrillic'],
  weight: '400',
  variable: '--font-forum',
  display: 'swap',
})

export const robotoCondensed = Roboto_Condensed({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-roboto-condensed',
  display: 'swap',
})

export const fontVariables = `${manrope.variable} ${marckScript.variable} ${roboto.variable} ${forum.variable} ${robotoCondensed.variable}`
