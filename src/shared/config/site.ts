import type { Metadata } from 'next'

/**
 * Публичный адрес сайта. Из него строятся canonical, ссылки Open Graph и
 * sitemap, поэтому на проде он обязан совпадать с настоящим доменом: иначе
 * поиск и мессенджеры получат ссылки на localhost.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const SITE_NAME = 'Автоцентр «АвтоГарантСити»'

export const SITE_TITLE = 'Персональный пригласительный на тех. открытие автоцентра'

export const SITE_DESCRIPTION =
  'Получите персональный пригласительный и подарок в честь знакомства с новым автоцентром.'

/**
 * Шаги воронки и персональные экраны поиску не отдаём: без сессии они
 * перебрасывают на начало, а пригласительный именной — на нём имя гостя,
 * марка и госномер его автомобиля.
 */
export function privateScreen(title: string): Metadata {
  return { title, robots: { index: false, follow: false, nocache: true } }
}
