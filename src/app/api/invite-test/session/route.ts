import { NextRequest, NextResponse } from 'next/server'

import { openingText } from '@/invite-test/config/certificates'
import {
  inviteTestEnv,
  isMaxAutoReady,
  isMaxReady,
  isTelegramAutoReady,
  isTelegramReady,
  isWhatsappAutoReady,
  isWhatsappReady,
} from '@/invite-test/config/env'
import type { PersonalInviteDetails, SessionResponse } from '@/invite-test/model/types'
import { createSession, getBusinessId } from '@/invite-test/server/store'
import { getClientIp, jsonError, readJsonBody } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'

// POST /api/invite-test/session: выдаёт код и ссылки на диалоги с менеджером
export async function POST(req: NextRequest) {
  if (!rateLimit(`invite-test:session:${getClientIp(req)}`, 20)) {
    return jsonError(429, 'Слишком много запросов')
  }

  const body = (await readJsonBody(req)) as Partial<Record<keyof PersonalInviteDetails, unknown>> | null
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

  // Позже здесь получаем поля сертификатов по заявке/CMS и передаём вторым
  // аргументом в createSession. undefined включает безопасный fallback.
  const created = createSession(fullName, undefined, details)
  const { code } = created
  const { telegram, max, whatsapp } = inviteTestEnv
  const openingMessage = encodeURIComponent(openingText(code))

  const response: SessionResponse = {
    code,
    certificates: created.certificates,
    channels: {
      telegram: {
        enabled: isTelegramReady(),
        chatLink: isTelegramReady() ? `https://t.me/${telegram.manager}?text=${openingMessage}` : null,
        // автоответ работает, только когда менеджер подключил бота к аккаунту
        autoDelivery: isTelegramAutoReady() && Boolean(getBusinessId()),
      },
      whatsapp: {
        enabled: isWhatsappReady(),
        chatLink: isWhatsappReady() ? `https://wa.me/${whatsapp.phone}?text=${openingMessage}` : null,
        autoDelivery: isWhatsappAutoReady(),
      },
      max: {
        enabled: isMaxReady(),
        chatLink: isMaxReady()
          ? `https://max.ru/${max.botUsername}?start=${encodeURIComponent(code)}`
          : null,
        autoDelivery: isMaxAutoReady(),
      },
    },
  }

  return NextResponse.json(response)
}
