import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'

import type { Application, Certificate } from '@/payload-types'
import { computeCertificateAmount, generateCertificateCode } from '@/lib/certificate'
import { getClientIp, jsonError, readJsonBody } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { validateSessionId } from '@/lib/validation'

/** Пара пригласительных выписывается целиком: по одному каждого вида. */
const KINDS = ['diagnostics', 'gift'] as const
type Kind = (typeof KINDS)[number]

const brief = (cert: Certificate) => ({
  id: cert.id,
  kind: cert.kind,
  code: cert.code,
  amount: cert.amount,
  // Номер выдачи напечатан на пригласительном: экран показывает тот же.
  serial: cert.serial ?? null,
  expiresAt: cert.expiresAt ?? null,
})

function respond(certificates: Certificate[], app: Application, created: boolean) {
  const order = (kind: Certificate['kind']) => KINDS.indexOf(kind as Kind)
  return NextResponse.json(
    {
      certificates: [...certificates].sort((a, b) => order(a.kind) - order(b.kind)).map(brief),
      application: { id: app.id, status: 'completed' },
    },
    { status: created ? 201 : 200 },
  )
}

/**
 * POST /api/applications/:id/certificates — гость нажал «Оформить приглашение».
 *
 * В этот момент на него заводятся оба пригласительных и заявка закрывается:
 * дальше по воронке возврата нет, поэтому запрос идемпотентен — повторный
 * вызов отдаёт уже выписанную пару, а не создаёт третий сертификат.
 */
export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/applications/[id]/certificates'>,
) {
  if (!rateLimit(`issue-certificates:${getClientIp(req)}`, 10)) {
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

  const findIssued = async () =>
    (
      await payload.find({
        collection: 'certificates',
        where: { application: { equals: app.id } },
        limit: KINDS.length,
        depth: 0,
      })
    ).docs

  const already = await findIssued()
  if (already.length >= KINDS.length) return respond(already, app, false)

  if (!app.plateNumber || !app.carBrand || !app.fullName) {
    return jsonError(422, 'Заявка заполнена не полностью')
  }
  if (!app.consentGiven) {
    return jsonError(422, 'Нет согласия на обработку персональных данных')
  }

  const rules = await payload.find({
    collection: 'certificate-rules',
    where: { active: { equals: true } },
    sort: '-priority',
    limit: 100,
    depth: 0,
  })
  const amount = computeCertificateAmount(app, rules.docs)

  // Пара и статус заявки записываются одной транзакцией: половина выданных
  // пригласительных хуже, чем честная ошибка с повтором.
  const transactionID = await payload.db.beginTransaction()
  const txReq = transactionID != null ? { transactionID } : undefined
  try {
    const issued: Certificate[] = [...already]
    const missing = KINDS.filter((kind) => !already.some((cert) => cert.kind === kind))

    for (const kind of missing) {
      let cert: Certificate | null = null
      // код уникальный; на случай коллизии несколько попыток
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          cert = await payload.create({
            collection: 'certificates',
            data: { application: app.id, kind, code: generateCertificateCode(), amount },
            req: txReq,
          })
          break
        } catch (err) {
          // параллельный запрос успел выписать эту же пару: отдаём её
          if (err instanceof Error && /application|kind/i.test(err.message)) {
            if (transactionID != null) await payload.db.rollbackTransaction(transactionID)
            const race = await findIssued()
            if (race.length >= KINDS.length) return respond(race, app, false)
            return jsonError(500, 'Не удалось выписать пригласительные')
          }
          if (attempt === 4) throw err
        }
      }
      if (!cert) throw new Error('certificate creation failed')
      issued.push(cert)
    }

    await payload.update({
      collection: 'applications',
      id: app.id,
      data: { status: 'completed' },
      req: txReq,
    })
    if (transactionID != null) await payload.db.commitTransaction(transactionID)
    return respond(issued, app, true)
  } catch (err) {
    if (transactionID != null) await payload.db.rollbackTransaction(transactionID)
    payload.logger.error({ err }, 'issue certificates failed')
    return jsonError(500, 'Не удалось выписать пригласительные')
  }
}
