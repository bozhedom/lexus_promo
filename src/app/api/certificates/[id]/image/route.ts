import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'

import { getClientIp, jsonError } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'

// POST /api/certificates/:id/image: гость сохранил пригласительный, кладём
// ту же картинку рядом с заявкой, чтобы менеджер видел её в админке.

const MAX_BYTES = 6 * 1024 * 1024

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!rateLimit(`cert-image:${getClientIp(req)}`, 5)) {
    return jsonError(429, 'Слишком много запросов')
  }

  const { id } = await ctx.params
  const payload = await getPayload({ config })

  const certificate = await payload
    .findByID({ collection: 'certificates', id, depth: 0 })
    .catch(() => null)
  if (!certificate) return jsonError(404, 'Пригласительный не найден')
  // перезаписывать не даём: картинка у одного пригласительного одна
  if (certificate.image) return NextResponse.json({ ok: true })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return jsonError(422, 'Файл не передан')
  if (file.type !== 'image/png') return jsonError(422, 'Ожидается PNG')
  if (file.size > MAX_BYTES) return jsonError(413, 'Файл слишком большой')

  try {
    const media = await payload.create({
      collection: 'media',
      data: { alt: `Пригласительный ${certificate.code}` },
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        name: `certificate-${certificate.code}.png`,
        mimetype: 'image/png',
        size: file.size,
      },
    })
    await payload.update({
      collection: 'certificates',
      id,
      data: { image: media.id },
    })
  } catch (err) {
    payload.logger.error({ err }, 'certificate image upload failed')
    return jsonError(500, 'Не удалось сохранить картинку')
  }

  return NextResponse.json({ ok: true })
}
