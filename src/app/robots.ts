import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/shared/config/site'

/**
 * Индексируется только первый экран. Служебные адреса и персональные экраны
 * закрыты: на пригласительном напечатаны имя гостя и госномер его автомобиля.
 *
 * Поисковик не обязан слушаться, поэтому настоящая защита админки лежит в
 * `src/middleware.ts`, а на самих страницах стоит `noindex` (см. `privateScreen`);
 * здесь мы просто не отдаём эти адреса поиску сами.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/payload-api',
          '/api',
          '/personal',
          '/certificate',
          '/existing-certificate',
          '/links',
          '/car-info',
          '/car-number',
          '/booking',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
