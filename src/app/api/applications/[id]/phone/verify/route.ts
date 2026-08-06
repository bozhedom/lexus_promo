import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'

import type { Application } from '@/payload-types'
import { getClientIp, jsonError, readJsonBody } from '@/lib/http'
import {
  checkPhoneChallenge,
  createPhoneVerificationToken,
} from '@/lib/phoneVerification'
import { rateLimit } from '@/lib/rateLimit'
import { validatePhone, validateSessionId } from '@/lib/validation'

// POST /api/applications/:id/phone/verify: проверить код и выдать подписанное подтверждение
export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/applications/[id]/phone/verify'>,
) {
  const ip = getClientIp(req)
  if (!rateLimit(`phone-verify-ip:${ip}`, 20)) {
    return jsonError(429, 'Слишком много попыток, попробуйте позже')
  }

  const { id } = await ctx.params
  const body = (await readJsonBody(req)) as Record<string, unknown> | null
  const sessionId = validateSessionId(body?.sessionId)
  if (!sessionId) return jsonError(400, 'Некорректный идентификатор сессии')
  if (!rateLimit(`phone-verify-app:${id}`, 6)) {
    return jsonError(429, 'Слишком много неверных попыток. Запросите новый код')
  }

  const payload = await getPayload({ config })
  let app: Application
  try {
    app = await payload.findByID({ collection: 'applications', id })
  } catch {
    return jsonError(404, 'Заявка не найдена')
  }
  if (app.sessionId !== sessionId) return jsonError(404, 'Заявка не найдена')

  const phone = validatePhone(app.phone)
  if (!phone) return jsonError(422, 'В заявке нет корректного номера телефона')

  const result = checkPhoneChallenge(body?.challengeToken, body?.code, app.id, phone)
  if (result === 'expired') return jsonError(410, 'Срок действия кода истёк. Запросите новый')
  if (result !== 'valid') return jsonError(422, 'Неверный код из СМС')

  return NextResponse.json({
    verificationToken: createPhoneVerificationToken(app.id, phone),
  })
}
