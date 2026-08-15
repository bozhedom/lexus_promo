import { useEffect, useState } from 'react'

import { fetchPromoSlides, type PromoSlideDto } from '@/shared/api/promo'

const DEFAULT_SLIDES: PromoSlideDto[] = [
  {
    id: 'service-center',
    src: '/images/redesign/service-center.webp',
    mobileSrc: '/images/redesign/service-center-mobile-test.webp',
    caption: 'Современный сервисный центр',
    address: 'Снеговая, 1 · «Таксопарк»',
  },
  { id: 'gallery-2', src: '/images/gallery-2.webp', mobileSrc: '/images/gallery-2-mobile-test.webp', caption: 'Премиальный уровень обслуживания' },
  { id: 'gallery-3', src: '/images/gallery-3.webp', mobileSrc: '/images/gallery-3-mobile-test.webp', caption: 'Комфорт для каждого гостя' },
  { id: 'gallery-1', src: '/images/gallery-1.webp', mobileSrc: '/images/gallery-1-mobile-test.webp', caption: 'Технологии и инновации' },
  { id: 'gallery-map', src: '/images/gallery-map.jpg', mobileSrc: '/images/gallery-map-mobile-test.webp', caption: 'Собственная территория и парковка' },
]

/**
 * Слайды из админки. До первого заполнения и при временной недоступности БД
 * остаются встроенные стартовые.
 */
export function usePromoSlides() {
  const [slides, setSlides] = useState<PromoSlideDto[]>(DEFAULT_SLIDES)

  useEffect(() => {
    let active = true
    fetchPromoSlides()
      .then((configured) => {
        if (active && configured.length > 0) setSlides(configured)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  return slides
}
