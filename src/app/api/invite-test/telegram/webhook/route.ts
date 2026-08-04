import { NextRequest, NextResponse } from 'next/server'

import { extractCode } from '@/invite-test/config/certificates'
import { inviteTestEnv } from '@/invite-test/config/env'
import { deliver } from '@/invite-test/server/delivery'
import { setBusinessId } from '@/invite-test/server/store'

interface TelegramUpdate {
  business_connection?: {
    id?: string
    is_enabled?: boolean
  }
  business_message?: {
    business_connection_id?: string
    chat?: { id?: number }
    from?: { id?: number }
    text?: string
  }
}

// POST /api/invite-test/telegram/webhook: менеджер подключил бота к аккаунту
// либо клиент написал ему первым и в тексте приехал код
export async function POST(req: NextRequest) {
  const secret = inviteTestEnv.telegram.webhookSecret
  if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null

  const connection = update?.business_connection
  if (connection?.id) {
    setBusinessId(connection.is_enabled ? connection.id : '')
    return NextResponse.json({ ok: true })
  }

  const message = update?.business_message
  const chatId = message?.chat?.id
  const code = extractCode(message?.text ?? '')

  // Сообщения самого менеджера тоже приходят сюда, на них не реагируем:
  // у входящего от клиента отправитель и чат совпадают
  const fromManager = Boolean(message?.from?.id) && chatId !== message?.from?.id

  if (chatId && code && !fromManager) {
    try {
      await deliver(code, { channel: 'telegram', chatId })
    } catch {
      // клиенту ничего не пишем: он в диалоге с живым менеджером, тот ответит
    }
  }

  // Телеграм повторяет доставку на любой не-200, поэтому всегда отвечаем ok
  return NextResponse.json({ ok: true })
}
