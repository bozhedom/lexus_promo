// Демонстрационные данные экрана: в боевом сценарии придут из воронки.
export const GUEST_NAME = 'Валерий Михайлович'

export interface Benefit {
  id: string
  icon: string
  title: string
  text: string
}

export const BENEFITS: Benefit[] = [
  {
    id: 'trust',
    icon: '/invite-test/icon-shield.svg',
    title: 'Доверие',
    text: 'Работаем честно и открыто',
  },
  {
    id: 'quality',
    icon: '/invite-test/icon-star.svg',
    title: 'Качество',
    text: 'Профессионализм в каждой детали',
  },
  {
    id: 'care',
    icon: '/invite-test/icon-heart.svg',
    title: 'Забота',
    text: 'Ваш комфорт – наш приоритет',
  },
]

export interface InviteLink {
  id: string
  icon: string
  label: string
  href: string
}

const site = process.env.NEXT_PUBLIC_LINK_SITE || 'https://avtogarantsiti.ru'

export const INVITE_LINKS: InviteLink[] = [
  {
    id: 'site',
    icon: '/invite-test/icon-globe.svg',
    label: 'Наш сайт',
    href: site,
  },
  {
    id: 'team',
    icon: '/invite-test/icon-people.svg',
    label: 'Ваша персональная команда автомобиля',
    href: `${site}/team`,
  },
]
