import { NextRequest, NextResponse } from 'next/server'

import { inviteTestEnv } from '@/invite-test/config/env'
import { deliver } from '@/invite-test/server/delivery'

interface MaxUpdate {
  update_type?: string
  payload?: string
  user?: { user_id?: number | string }
}

// Диплинк ?start=CODE вызывает bot_started. Код приходит скрытым payload,
// поэтому клиенту не нужно копировать или отправлять его вручную.
export async function POST(req: NextRequest) {
  const secret = inviteTestEnv.max.webhookSecret
  if (secret && req.headers.get('x-max-bot-api-secret') !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const update = (await req.json().catch(() => null)) as MaxUpdate | null
  const code = update?.payload?.trim().toUpperCase()
  const userId = update?.user?.user_id

  if (update?.update_type === 'bot_started' && code && userId != null) {
    try {
      await deliver(code, { channel: 'max', via: 'bot', userId })
    } catch {
      // MAX повторит вебхук при не-200; бизнес-ошибку уже сохранили в статусе.
    }
  }

  return NextResponse.json({ ok: true })
}
