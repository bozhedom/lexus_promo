import { NextRequest, NextResponse } from 'next/server'

import { openingText } from '@/invite-test/config/certificates'
import type { PersonalInviteDetails, SessionResponse } from '@/invite-test/model/types'
import {
  certificateSerialsByCode,
  storeCertificateImages,
} from '@/invite-test/server/certificateStore'
import { resolveChannels } from '@/invite-test/server/channels'
import { loadMessageTemplates } from '@/invite-test/server/messageTemplates'
import { createSession } from '@/invite-test/server/store'
import { getClientIp, jsonError, readJsonBody } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { validateSessionId } from '@/lib/validation'

// POST /api/invite-test/session: выдаёт код и ссылки на диалоги с менеджером
export async function POST(req: NextRequest) {
  if (!rateLimit(`invite-test:session:${getClientIp(req)}`, 20)) {
    return jsonError(429, 'Слишком много запросов')
  }

  const body = (await readJsonBody(req)) as Record<string, unknown> | null
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim().slice(0, 80) : ''
  if (!fullName) return jsonError(422, 'Не передано имя')

  const text = (value: unknown, max: number) =>
    typeof value === 'string' ? value.trim().slice(0, max) : ''
  const rawYear = typeof body?.year === 'number' ? Math.trunc(body.year) : null
  const rawAmount = typeof body?.amount === 'number' ? Math.trunc(body.amount) : 1500
  const details: PersonalInviteDetails = {
    fullName,
    brand: text(body?.brand, 40) || 'Lexus',
    model: text(body?.model, 60),
    year: rawYear && rawYear >= 1900 && rawYear <= new Date().getFullYear() + 1 ? rawYear : null,
    plate: text(body?.plate, 16).toUpperCase(),
    amount: Math.max(0, Math.min(rawAmount, 1_000_000)),
  }

  // Пригласительные сохраняются в админку и оттуда же уходят в мессенджеры:
  // менеджер видит ровно ту картинку, что пришла гостю. Если заявки нет или
  // сохранить не вышло, остаётся отрисовка по запросу.
  const applicationId = text(body?.applicationId, 64)
  const ownerSession = validateSessionId(body?.sessionId)
  const stored =
    applicationId && ownerSession
      ? await storeCertificateImages(applicationId, ownerSession, details)
      : null

  // Номера выдачи печатаются на кадре, поэтому берутся только из базы. Хозяину
  // заявки они приезжают вместе с картинками, вернувшемуся гостю — по коду
  // выданного пригласительного: своей заявкой он уже не владеет.
  const certificateCode = text(body?.certificateCode, 32)
  const serials =
    stored?.serials ?? (certificateCode ? await certificateSerialsByCode(certificateCode) : null)

  // Формулировки менеджер правит в админке: и то, что гость отправляет, и то,
  // что придёт ему вместе с пригласительными.
  const templates = await loadMessageTemplates()

  const created = createSession(
    fullName,
    { certificates: stored?.certificates ?? null, deliveryTemplate: templates.delivery },
    serials ? { ...details, serials } : details,
  )

  const opening = openingText(created.code, templates.opening)
  const response: SessionResponse = {
    code: created.code,
    certificates: created.certificates,
    channels: await resolveChannels(created.code, templates.opening),
    // Тот же текст отдельным полем: в MAX его подставить в ссылку нельзя, и
    // страница кладёт его гостю в буфер обмена.
    message: opening,
  }

  return NextResponse.json(response)
}
