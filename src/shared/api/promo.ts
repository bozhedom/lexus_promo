export interface PromoSlideDto {
  id: string
  src: string
  mobileSrc: string
  caption: string
  address?: string
}

export async function fetchPromoSlides(): Promise<PromoSlideDto[]> {
  const response = await fetch('/api/promo-slides')
  if (!response.ok) throw new Error('promo slides unavailable')
  const body = await response.json() as { slides?: PromoSlideDto[] }
  return Array.isArray(body.slides) ? body.slides : []
}
