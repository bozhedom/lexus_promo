import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'

import { getClientIp, jsonError, readJsonBody } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { validatePlate, validateSessionId } from '@/lib/validation'

// Проверка выполняется до создания нового черновика. В ответе намеренно нет
// имени, телефона и email прежней заявки — только сертификат и данные авто.
export async function POST(req: NextRequest) {
  if (!rateLimit(`certificate-by-plate:${getClientIp(req)}`, 10)) {
    return jsonError(429, 'Слишком много запросов, попробуйте позже')
  }

  const body = (await readJsonBody(req)) as Record<string, unknown> | null
  const sessionId = validateSessionId(body?.sessionId)
  const plateNumber = validatePlate(body?.plateNumber)
  if (!sessionId) return jsonError(400, 'Некорректный идентификатор сессии')
  if (!plateNumber) return jsonError(422, 'Некорректный госномер')

  const payload = await getPayload({ config })
  const applications = await payload.find({
    collection: 'applications',
    where: { plateNumber: { equals: plateNumber } },
    sort: '-createdAt',
    limit: 50,
    depth: 0,
  })
  if (applications.docs.length === 0) {
    return NextResponse.json({ existing: false })
  }

  const certificates = await payload.find({
    collection: 'certificates',
    where: { application: { in: applications.docs.map((app) => app.id) } },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
  })
  const certificate = certificates.docs[0]
  if (!certificate) return NextResponse.json({ existing: false })

  const applicationId = typeof certificate.application === 'string'
    ? certificate.application
    : certificate.application.id
  const application = applications.docs.find((app) => app.id === applicationId)
  if (!application) return NextResponse.json({ existing: false })

  return NextResponse.json({
    existing: true,
    certificate: {
      id: certificate.id,
      code: certificate.code,
      amount: certificate.amount,
      expiresAt: certificate.expiresAt ?? null,
    },
    vehicle: {
      plateNumber,
      brand: application.carBrand ?? null,
      model: application.carModel ?? null,
      year: application.carYear ?? null,
    },
  })
}
