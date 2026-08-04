import { NextRequest, NextResponse } from 'next/server'

import {
  inviteTestEnv,
  isMaxAutoReady,
  isTelegramAutoReady,
  isWhatsappAutoReady,
} from '@/invite-test/config/env'
import { getBusinessId } from '@/invite-test/server/store'
import * as max from '@/invite-test/server/max'
import * as telegram from '@/invite-test/server/telegram'
import * as whatsapp from '@/invite-test/server/whatsapp'
import { jsonError } from '@/lib/http'

const describe = async (task: () => Promise<unknown>) => {
  try {
    return { ok: true, result: await task() }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Ошибка' }
  }
}

const checkKey = (req: NextRequest): boolean =>
  Boolean(inviteTestEnv.setupKey) && req.nextUrl.searchParams.get('key') === inviteTestEnv.setupKey

// POST /api/invite-test/setup?key=...: разово прописывает вебхук бота
export async function POST(req: NextRequest) {
  if (!checkKey(req)) return jsonError(403, 'Неверный ключ настройки')

  if (!isTelegramAutoReady() && !isMaxAutoReady() && !isWhatsappAutoReady()) {
    return NextResponse.json({
      ok: false,
      error: 'Не настроены Telegram, MAX и WhatsApp',
    })
  }

  const base = inviteTestEnv.siteUrl.replace(/\/$/, '')

  const [telegramSetup, maxSetup, whatsappSetup] = await Promise.all([
    isTelegramAutoReady()
      ? Promise.all([
          describe(telegram.getMe),
          describe(() => telegram.setWebhook(`${base}/api/invite-test/telegram/webhook`)),
        ])
      : null,
    isMaxAutoReady()
      ? Promise.all([
          describe(max.getMe),
          describe(() => max.subscribe(`${base}/api/invite-test/max/webhook`)),
        ])
      : null,
    isWhatsappAutoReady()
      ? Promise.all([
          describe(whatsapp.getState),
          describe(() =>
            whatsapp.configureWebhook(`${base}/api/invite-test/whatsapp/webhook`),
          ),
        ])
      : null,
  ])

  return NextResponse.json({
    telegram: telegramSetup
      ? { me: telegramSetup[0], webhook: telegramSetup[1], businessConnection: getBusinessId() || null }
      : null,
    max: maxSetup ? { me: maxSetup[0], webhook: maxSetup[1] } : null,
    whatsapp: whatsappSetup ? { state: whatsappSetup[0], webhook: whatsappSetup[1] } : null,
  })
}

// DELETE /api/invite-test/setup?key=...: снять вебхук перед удалением модуля
export async function DELETE(req: NextRequest) {
  if (!checkKey(req)) return jsonError(403, 'Неверный ключ настройки')

  const base = inviteTestEnv.siteUrl.replace(/\/$/, '')
  const [telegramResult, maxResult, whatsappResult] = await Promise.all([
    isTelegramAutoReady() ? describe(telegram.deleteWebhook) : null,
    isMaxAutoReady()
      ? describe(() => max.unsubscribe(`${base}/api/invite-test/max/webhook`))
      : null,
    isWhatsappAutoReady() ? describe(whatsapp.clearWebhook) : null,
  ])
  return NextResponse.json({
    telegram: telegramResult,
    max: maxResult,
    whatsapp: whatsappResult,
  })
}
