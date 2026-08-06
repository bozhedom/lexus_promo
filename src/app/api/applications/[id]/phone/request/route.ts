import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'

import type { Application } from '@/payload-types'
import { getClientIp, jsonError, readJsonBody } from '@/lib/http'
import { createPhoneChallenge, PHONE_CHALLENGE_TTL_SECONDS } from '@/lib/phoneVerification'
import { rateLimit } from '@/lib/rateLimit'
import { sendPhoneVerificationCode } from '@/lib/sms'
import { validatePhone, validateSessionId } from '@/lib/validation'

const RESEND_AFTER_SECONDS = 60

// POST /api/applications/:id/phone/request: отправить шестизначный код
export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/applications/[id]/phone/request'>,
) {
  const ip = getClientIp(req)
  if (!rateLimit(`phone-request-ip:${ip}`, 5)) {
    return jsonError(429, 'Слишком много запросов кода, попробуйте позже')
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
  if (!rateLimit(`phone-request-app:${app.id}`, 1)) {
    return jsonError(429, 'Новый код можно запросить через минуту', {
      retryAfter: RESEND_AFTER_SECONDS,
    })
  }

  const phone = validatePhone(app.phone)
  if (!phone || !app.fullName || !app.consentGiven) {
    return jsonError(422, 'Сначала заполните личные данные')
  }

  const challenge = createPhoneChallenge(app.id, phone)
  try {
    const delivery = await sendPhoneVerificationCode(phone, challenge.code)
    return NextResponse.json({
      challengeToken: challenge.token,
      expiresIn: PHONE_CHALLENGE_TTL_SECONDS,
      retryAfter: RESEND_AFTER_SECONDS,
      ...(delivery.devCode ? { devCode: delivery.devCode } : {}),
    })
  } catch (error) {
    payload.logger.error({ err: error }, 'phone verification SMS failed')
    return jsonError(502, 'Не удалось отправить СМС. Попробуйте ещё раз')
  }
}
