import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'

import { getClientIp, isHoneypotTripped, jsonError, readJsonBody } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { validatePlate, validateSessionId, validateShortText } from '@/lib/validation'

// POST /api/applications: создать черновик заявки (экран ввода номера)
export async function POST(req: NextRequest) {
  if (!rateLimit(`applications:${getClientIp(req)}`, 10)) {
    return jsonError(429, 'Слишком много запросов, попробуйте позже')
  }

  const body = (await readJsonBody(req)) as Record<string, unknown> | null
  if (!body) return jsonError(400, 'Некорректное тело запроса')

  if (isHoneypotTripped(body)) {
    // боту отвечаем как обычно, но ничего не пишем
    return NextResponse.json({ id: crypto.randomUUID() }, { status: 201 })
  }

  const sessionId = validateSessionId(body.sessionId)
  if (!sessionId) return jsonError(400, 'Некорректный идентификатор сессии')

  const plateNumber = validatePlate(body.plateNumber)
  if (!plateNumber) return jsonError(422, 'Некорректный госномер', { field: 'plateNumber' })

  const payload = await getPayload({ config })
  const app = await payload.create({
    collection: 'applications',
    data: {
      status: 'draft_plate',
      plateNumber,
      sessionId,
      utmSource: validateShortText(body.utmSource) ?? undefined,
      utmMedium: validateShortText(body.utmMedium) ?? undefined,
      utmCampaign: validateShortText(body.utmCampaign) ?? undefined,
    },
  })

  return NextResponse.json({ id: app.id, plateNumber }, { status: 201 })
}
