import { NextRequest, NextResponse } from 'next/server'

import { extractCode } from '@/invite-test/config/certificates'
import { inviteTestEnv } from '@/invite-test/config/env'
import { isCodeAttemptBlocked, recordInvalidCode } from '@/invite-test/server/codeAttempts'
import { deliver } from '@/invite-test/server/delivery'
import {
  parseIncoming,
  type GreenWebhook,
  type IncomingMessage,
} from '@/invite-test/server/green'
import { findOpenedSession, getSession } from '@/invite-test/server/store'

/**
 * POST /api/invite-test/green/webhook — входящее сообщение из любого инстанса
 * GREEN-API. Вебхук у WhatsApp, Telegram и MAX один: канал определяется по
 * идентификатору инстанса в теле запроса.
 */
export async function POST(req: NextRequest) {
  const token = inviteTestEnv.green.webhookToken
  const authorization = req.headers.get('authorization') ?? ''
  if (token && authorization !== `Bearer ${token}` && authorization !== token) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const update = (await req.json().catch(() => null)) as GreenWebhook | null
  const incoming = parseIncoming(update)
  if (!incoming) return NextResponse.json({ ok: true })

  const key = `${incoming.channel}:${incoming.chatId}`
  const code = extractCode(incoming.text)

  if (code) {
    if (isCodeAttemptBlocked(key)) return NextResponse.json({ ok: true })

    if (!getSession(code)) {
      recordInvalidCode(key)
      console.warn(`[invite-test] ${incoming.channel} rejected an invalid invitation code`)
      return NextResponse.json({ ok: true })
    }

    return send(code, incoming)
  }

  // Кода в сообщении нет — берём гостя, который только что ушёл в этот же
  // мессенджер. Ради MAX: подставить текст в диалог с менеджером он не умеет, и
  // гость отправляет что придётся. Ждущих сразу двое — не угадываем, пусть
  // дошлют код; никто не уходил — писал не гость.
  const waiting = findOpenedSession(incoming.channel)
  return waiting ? send(waiting.code, incoming) : NextResponse.json({ ok: true })
}

async function send(code: string, incoming: IncomingMessage) {
  try {
    await deliver(code, { channel: incoming.channel, via: 'green', chatId: incoming.chatId })
  } catch {
    // Статус ошибки сохранён; всегда 200, чтобы не получать повторы webhook.
  }
  return NextResponse.json({ ok: true })
}
