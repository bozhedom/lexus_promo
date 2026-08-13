import { NextRequest, NextResponse } from 'next/server'

import {
  inviteTestEnv,
  isMaxBotReady,
  isTelegramAutoReady,
} from '@/invite-test/config/env'
import * as green from '@/invite-test/server/green'
import { getBusinessId } from '@/invite-test/server/store'
import * as max from '@/invite-test/server/max'
import * as telegram from '@/invite-test/server/telegram'
import { jsonError } from '@/lib/http'
import type { Channel } from '@/invite-test/model/types'

const describe = async (task: () => Promise<unknown>) => {
  try {
    return { ok: true, result: await task() }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Ошибка' }
  }
}

const checkKey = (req: NextRequest): boolean =>
  Boolean(inviteTestEnv.setupKey) && req.nextUrl.searchParams.get('key') === inviteTestEnv.setupKey

const base = () => inviteTestEnv.siteUrl.replace(/\/$/, '')

/** Вебхук у всех инстансов GREEN-API один: канал виден по idInstance в теле. */
const greenWebhook = () => `${base()}/api/invite-test/green/webhook`

async function setupGreen(channel: Channel) {
  const [state, webhook] = await Promise.all([
    describe(() => green.getState(channel)),
    describe(() => green.configureWebhook(channel, greenWebhook())),
  ])
  return { state, webhook, account: await green.accountIdentity(channel) }
}

// POST /api/invite-test/setup?key=...: разово прописывает вебхуки
export async function POST(req: NextRequest) {
  if (!checkKey(req)) return jsonError(403, 'Неверный ключ настройки')

  const channels = green.greenChannels()
  if (channels.length === 0 && !isTelegramAutoReady() && !isMaxBotReady()) {
    return NextResponse.json({
      ok: false,
      error: 'Не настроен ни один инстанс GREEN-API и ни один бот',
    })
  }

  const [greenResults, telegramBot, maxBot] = await Promise.all([
    Promise.all(channels.map(async (channel) => [channel, await setupGreen(channel)] as const)),
    // Бот остаётся запасным путём: с инстансом GREEN-API он не нужен.
    isTelegramAutoReady() && !green.isGreenReady('telegram')
      ? Promise.all([
          describe(telegram.getMe),
          describe(() => telegram.setWebhook(`${base()}/api/invite-test/telegram/webhook`)),
        ])
      : null,
    isMaxBotReady() && !green.isGreenReady('max')
      ? Promise.all([
          describe(max.getMe),
          describe(() => max.subscribe(`${base()}/api/invite-test/max/webhook`)),
        ])
      : null,
  ])

  return NextResponse.json({
    green: Object.fromEntries(greenResults),
    telegramBot: telegramBot
      ? { me: telegramBot[0], webhook: telegramBot[1], businessConnection: getBusinessId() || null }
      : null,
    maxBot: maxBot ? { me: maxBot[0], webhook: maxBot[1] } : null,
  })
}

// DELETE /api/invite-test/setup?key=...: снять вебхуки перед удалением модуля
export async function DELETE(req: NextRequest) {
  if (!checkKey(req)) return jsonError(403, 'Неверный ключ настройки')

  const channels = green.greenChannels()
  const [greenResults, telegramBot, maxBot] = await Promise.all([
    Promise.all(
      channels.map(
        async (channel) => [channel, await describe(() => green.clearWebhook(channel))] as const,
      ),
    ),
    isTelegramAutoReady() ? describe(telegram.deleteWebhook) : null,
    isMaxBotReady()
      ? describe(() => max.unsubscribe(`${base()}/api/invite-test/max/webhook`))
      : null,
  ])

  return NextResponse.json({
    green: Object.fromEntries(greenResults),
    telegramBot,
    maxBot,
  })
}
