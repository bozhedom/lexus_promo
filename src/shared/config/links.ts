// Внешние ссылки итогового экрана. Боевые адреса подставляются через env
// (NEXT_PUBLIC_LINK_*). Пока их нет: используются рабочие демо-цели, чтобы на
// экране не было мёртвых кнопок: телефон/мессенджер на демо-номер и карта по
// реальному адресу автоцентра. Перед запуском заменить на настоящие.

export interface OutboundLink {
  id: string
  icon: string
  label: string
  href: string
  accent?: boolean
  external?: boolean
}

/** Демо-контакты автоцентра: заменить перед публикацией. */
export const DEMO_PHONE = '+74232055050'
const DEMO_SITE = 'https://avtogarantsiti.ru'
const ADDRESS = 'Владивосток, Снеговая 1 стр 7'
const MAP_URL = `https://yandex.ru/maps/?text=${encodeURIComponent(ADDRESS)}`

const env = (key: string, fallback: string): string => process.env[key] || fallback

export const OUTBOUND_LINKS: OutboundLink[] = [
  {
    id: 'calc',
    icon: '/images/icon-calculator.svg',
    label: 'заказать расчет',
    href: env('NEXT_PUBLIC_LINK_CALC', `tel:${DEMO_PHONE}`),
  },
  {
    id: 'booking',
    icon: '/images/icon-calendar.svg',
    label: 'записаться на диагностику',
    href: env('NEXT_PUBLIC_LINK_BOOKING', `tel:${DEMO_PHONE}`),
  },
  {
    id: 'book',
    icon: '/images/icon-mobile.svg',
    label: 'Скачать электронную сервисную книжку «Ортус»',
    href: env('NEXT_PUBLIC_LINK_BOOK', DEMO_SITE),
    external: true,
  },
  {
    id: 'messenger',
    icon: '/images/icon-messenger.svg',
    label: 'написать в мессенджер',
    href: env('NEXT_PUBLIC_LINK_MESSENGER', `https://wa.me/${DEMO_PHONE.replace('+', '')}`),
    external: true,
  },
  {
    id: 'map',
    icon: '/images/icon-pin-red.svg',
    label: 'Адрес: Снеговая 1, стр 7',
    href: env('NEXT_PUBLIC_LINK_MAP', MAP_URL),
    external: true,
  },
  {
    id: 'site',
    icon: '/images/icon-site.svg',
    label: 'зайти на сайт',
    href: env('NEXT_PUBLIC_LINK_SITE', DEMO_SITE),
    accent: true,
    external: true,
  },
]
