import { NextRequest, NextResponse } from 'next/server'

import { extractCode } from '@/invite-test/config/certificates'
import { inviteTestEnv } from '@/invite-test/config/env'
import { deliver } from '@/invite-test/server/delivery'
import { isCodeAttemptBlocked, recordInvalidCode } from '@/invite-test/server/codeAttempts'
import { getSession } from '@/invite-test/server/store'
import { GreenWebhook, parseIncomingText } from '@/invite-test/server/whatsapp'

// GREEN-API присылает сообщение, полученное QR-подключённым WhatsApp Business.
export async function POST(req: NextRequest) {
  const token = inviteTestEnv.whatsapp.webhookToken
  const authorization = req.headers.get('authorization') ?? ''
  if (token && authorization !== `Bearer ${token}` && authorization !== token) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const update = (await req.json().catch(() => null)) as GreenWebhook | null
  const incoming = parseIncomingText(update)
  const code = extractCode(incoming?.text ?? '')

  if (incoming && code) {
    if (isCodeAttemptBlocked(incoming.chatId)) {
      return NextResponse.json({ ok: true })
    }

    if (!getSession(code)) {
      recordInvalidCode(incoming.chatId)
      console.warn('[invite-test] WhatsApp rejected an invalid invitation code')
      return NextResponse.json({ ok: true })
    }

    try {
      await deliver(code, { channel: 'whatsapp', phone: incoming.chatId })
    } catch {
      // Статус ошибки сохранён; всегда 200, чтобы не получать повторы webhook.
    }
  }

  return NextResponse.json({ ok: true })
}
