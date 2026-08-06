import { getPayload } from 'payload'
import { NextResponse } from 'next/server'
import config from '@payload-config'

import type { Media } from '@/payload-types'

function mediaUrl(value: string | Media | null | undefined): string | null {
  if (!value || typeof value === 'string') return null
  return value.url ?? null
}

// Публично отдаём только контент активных слайдов. Служебные поля Payload и
// данные пользователей/заявок через этот endpoint недоступны.
export async function GET() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'promo-slides',
    where: { active: { equals: true } },
    sort: 'order',
    limit: 100,
    depth: 1,
  })

  const slides = result.docs.flatMap((slide) => {
    const src = mediaUrl(slide.desktopImage) ?? slide.desktopPath
    if (!src) return []
    return [{
      id: slide.id,
      src,
      mobileSrc: mediaUrl(slide.mobileImage) ?? slide.mobilePath ?? src,
      caption: slide.caption,
      address: slide.address ?? undefined,
    }]
  })

  return NextResponse.json({ slides })
}
