import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'

import type { Application, Certificate } from '@/payload-types'
import { computeCertificateAmount, generateCertificateCode } from '@/lib/certificate'
import { getClientIp, jsonError, readJsonBody } from '@/lib/http'
import { isPhoneVerificationValid } from '@/lib/phoneVerification'
import { rateLimit } from '@/lib/rateLimit'
import { validatePhone, validateSessionId } from '@/lib/validation'

function certResponse(cert: Certificate, app: Application, created: boolean) {
  return NextResponse.json(
    {
      certificate: {
        id: cert.id,
        code: cert.code,
        amount: cert.amount,
        expiresAt: cert.expiresAt ?? null,
      },
      application: {
        id: app.id,
        status: 'completed',
        plateNumber: app.plateNumber,
        carBrand: app.carBrand,
        carModel: app.carModel,
        carYear: app.carYear,
        fullName: app.fullName,
      },
    },
    { status: created ? 201 : 200 },
  )
}

// POST /api/applications/:id/complete: идемпотентно создаёт сертификат
export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/applications/[id]/complete'>,
) {
  if (!rateLimit(`complete:${getClientIp(req)}`, 10)) {
    return jsonError(429, 'Слишком много запросов, попробуйте позже')
  }

  const { id } = await ctx.params
  const body = (await readJsonBody(req)) as Record<string, unknown> | null
  const sessionId = validateSessionId(body?.sessionId)
  if (!sessionId) return jsonError(400, 'Некорректный идентификатор сессии')

  const payload = await getPayload({ config })
  let app: Application
  try {
    app = await payload.findByID({ collection: 'applications', id })
  } catch {
    return jsonError(404, 'Заявка не найдена')
  }
  if (app.sessionId !== sessionId) return jsonError(404, 'Заявка не найдена')

  // сертификат уже есть, возвращаем его
  const existing = await payload.find({
    collection: 'certificates',
    where: { application: { equals: app.id } },
    limit: 1,
    depth: 0,
  })
  if (existing.docs.length > 0) {
    return certResponse(existing.docs[0]!, app, false)
  }

  // заявка должна быть заполнена
  if (!app.plateNumber || !app.carBrand || !app.fullName || !app.phone) {
    return jsonError(422, 'Заявка заполнена не полностью')
  }
  if (!app.consentGiven) {
    return jsonError(422, 'Нет согласия на обработку персональных данных')
  }
  const phone = validatePhone(app.phone)
  if (!phone || !isPhoneVerificationValid(body?.phoneVerificationToken, app.id, phone)) {
    return jsonError(403, 'Подтвердите номер телефона кодом из СМС')
  }

  const configuredRules = await payload.find({
    collection: 'certificate-rules',
    where: { active: { equals: true } },
    sort: '-priority',
    limit: 100,
    depth: 0,
  })
  const amount = computeCertificateAmount(app, configuredRules.docs)

  // транзакция: сертификат + статус заявки создаются атомарно
  const transactionID = await payload.db.beginTransaction()
  const txReq = transactionID != null ? { transactionID } : undefined
  try {
    let cert: Certificate | null = null
    // код уникальный; на случай коллизии: несколько попыток
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        cert = await payload.create({
          collection: 'certificates',
          data: { application: app.id, code: generateCertificateCode(), amount },
          req: txReq,
        })
        break
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        // уникальный индекс по application сработал: параллельный запрос успел раньше
        if (msg.includes('application')) {
          if (transactionID != null) await payload.db.rollbackTransaction(transactionID)
          const race = await payload.find({
            collection: 'certificates',
            where: { application: { equals: app.id } },
            limit: 1,
            depth: 0,
          })
          if (race.docs.length > 0) return certResponse(race.docs[0]!, app, false)
          return jsonError(500, 'Не удалось создать сертификат')
        }
        if (attempt === 4) throw err
      }
    }
    if (!cert) throw new Error('certificate creation failed')

    await payload.update({
      collection: 'applications',
      id: app.id,
      data: { status: 'completed' },
      req: txReq,
    })
    if (transactionID != null) await payload.db.commitTransaction(transactionID)
    return certResponse(cert, app, true)
  } catch (err) {
    if (transactionID != null) await payload.db.rollbackTransaction(transactionID)
    payload.logger.error({ err }, 'complete failed')
    return jsonError(500, 'Не удалось создать сертификат')
  }
}
