import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'

import type { Certificate } from '@/payload-types'
import { jsonError } from '@/lib/http'

// POST /api/certificates/:id/redeem: погасить сертификат (проставить redeemedAt).
// Только для авторизованных. Идемпотентно: повторный вызов не меняет дату.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return jsonError(401, 'Требуется авторизация')

  const { id } = await ctx.params

  let cert: Certificate
  try {
    cert = await payload.findByID({ collection: 'certificates', id, depth: 0 })
  } catch {
    return jsonError(404, 'Сертификат не найден')
  }

  if (cert.redeemedAt) {
    return NextResponse.json({ id: cert.id, redeemedAt: cert.redeemedAt, alreadyRedeemed: true })
  }

  const updated = await payload.update({
    collection: 'certificates',
    id,
    data: { redeemedAt: new Date().toISOString() },
  })

  return NextResponse.json({ id: updated.id, redeemedAt: updated.redeemedAt, alreadyRedeemed: false })
}
