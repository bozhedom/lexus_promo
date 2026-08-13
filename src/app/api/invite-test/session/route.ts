import { NextRequest, NextResponse } from 'next/server'

import { openingText } from '@/invite-test/config/certificates'
import {
  inviteTestEnv,
  isMaxAutoReady,
  isMaxReady,
  isTelegramAutoReady,
  isTelegramBotReady,
  isWhatsappAutoReady,
  isWhatsappReady,
} from '@/invite-test/config/env'
import type { PersonalInviteDetails, SessionResponse } from '@/invite-test/model/types'
import { maxBotUsername, telegramBotUsername } from '@/invite-test/server/botIdentity'
import { storeCertificateImages } from '@/invite-test/server/certificateStore'
import { createSession, getBusinessId } from '@/invite-test/server/store'
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

  const created = createSession(fullName, stored ? { certificates: stored } : undefined, details)
  const { code } = created
  const { telegram, whatsapp } = inviteTestEnv
  const openingMessage = encodeURIComponent(openingText(code))
  // Ответ от имени менеджера возможен, только когда он подключил бизнес-бота.
  const businessDelivery =
    isTelegramAutoReady() && Boolean(telegram.manager) && Boolean(getBusinessId())

  // Username ботов спрашиваем у самих платформ по токену: в настройке от нас
  // требуется только токен.
  const [telegramBot, maxBot] = await Promise.all([
    isTelegramBotReady() && !businessDelivery ? telegramBotUsername() : Promise.resolve(''),
    isMaxReady() ? maxBotUsername() : Promise.resolve(''),
  ])

  const managerChat = telegram.manager
    ? `https://t.me/${telegram.manager}?text=${openingMessage}`
    : null

  const response: SessionResponse = {
    code,
    certificates: created.certificates,
    channels: {
      telegram: {
        enabled: Boolean(managerChat || telegramBot),
        // Пока менеджер не подключил бизнес-бота, кнопка ведёт в диалог с самим
        // ботом: там он отвечает сертификатами сразу, как в MAX. С подключением
        // всё возвращается к диалогу с менеджером — сертификаты приходят от него.
        chatLink: businessDelivery
          ? managerChat
          : telegramBot
            ? `https://t.me/${telegramBot}?start=${encodeURIComponent(code)}`
            : managerChat,
        autoDelivery: businessDelivery || Boolean(telegramBot),
      },
      whatsapp: {
        enabled: isWhatsappReady(),
        chatLink: isWhatsappReady() ? `https://wa.me/${whatsapp.phone}?text=${openingMessage}` : null,
        autoDelivery: isWhatsappAutoReady(),
      },
      max: {
        enabled: Boolean(maxBot),
        chatLink: maxBot ? `https://max.ru/${maxBot}?start=${encodeURIComponent(code)}` : null,
        autoDelivery: Boolean(maxBot) && isMaxAutoReady(),
      },
    },
  }

  return NextResponse.json(response)
}
