import { NextRequest, NextResponse } from 'next/server'

import { extractCode } from '@/invite-test/config/certificates'
import { inviteTestEnv } from '@/invite-test/config/env'
import { isCodeAttemptBlocked, recordInvalidCode } from '@/invite-test/server/codeAttempts'
import { deliver } from '@/invite-test/server/delivery'
import { getSession, setBusinessId } from '@/invite-test/server/store'

interface TelegramMessage {
  business_connection_id?: string
  chat?: { id?: number }
  from?: { id?: number }
  text?: string
}

interface TelegramUpdate {
  business_connection?: {
    id?: string
    is_enabled?: boolean
  }
  /** Диалог клиента с менеджером: отвечаем туда от имени менеджера. */
  business_message?: TelegramMessage
  /** Собственный диалог бота: сюда приходит диплинк `?start=КОД`. */
  message?: TelegramMessage
}

// POST /api/invite-test/telegram/webhook: менеджер подключил бота к аккаунту
// либо клиент прислал код — менеджеру напрямую или боту по диплинку
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

  const business = Boolean(update?.business_message)
  const message = update?.business_message ?? update?.message
  const chatId = message?.chat?.id
  const code = extractCode(message?.text ?? '')

  // Сообщения самого менеджера тоже приходят сюда, на них не реагируем:
  // у входящего от клиента отправитель и чат совпадают
  const fromManager = business && Boolean(message?.from?.id) && chatId !== message?.from?.id

  if (chatId && code && !fromManager) {
    const key = `tg:${chatId}`
    if (isCodeAttemptBlocked(key)) return NextResponse.json({ ok: true })

    if (!getSession(code)) {
      recordInvalidCode(key)
      console.warn('[invite-test] Telegram rejected an invalid invitation code')
      return NextResponse.json({ ok: true })
    }

    try {
      await deliver(code, { channel: 'telegram', chatId, business })
    } catch {
      // клиенту ничего не пишем: он в диалоге с живым менеджером, тот ответит
    }
  }

  // Телеграм повторяет доставку на любой не-200, поэтому всегда отвечаем ok
  return NextResponse.json({ ok: true })
}
