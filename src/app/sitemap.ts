import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/shared/config/site'

/**
 * В карте только первый экран: остальные адреса воронки без сессии
 * перебрасывают на начало, а персональные экраны отдавать поиску нельзя.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
