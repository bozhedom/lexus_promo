import type { MetadataRoute } from 'next'

/**
 * Воронка индексируется, служебные адреса — нет. Поисковик не обязан слушаться,
 * поэтому настоящая защита админки лежит в `src/middleware.ts`; здесь мы просто
 * не отдаём её адрес поиску сами.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/payload-api', '/api'] }],
  }
}
