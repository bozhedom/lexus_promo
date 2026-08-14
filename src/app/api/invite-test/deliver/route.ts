import { NextRequest, NextResponse } from 'next/server'

import type { Channel, DeliverResponse } from '@/invite-test/model/types'
import { deliver } from '@/invite-test/server/delivery'
import { checkAccount, isGreenReady } from '@/invite-test/server/green'
import { getSession } from '@/invite-test/server/store'
import { getClientIp, jsonError, readJsonBody } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'

/**
 * POST /api/invite-test/deliver — гость выбрал мессенджер, и пригласительные
 * уходят ему сами, на номер из его же заявки.
 *
 * Так закрыт MAX: подставить текст в диалог с менеджером он не умеет, и просить
 * гостя вставлять сообщение из буфера — лишний шаг. Инстанс менеджера пишет
 * первым, гость открывает MAX и видит пригласительные уже в чате с человеком.
 *
 * Отправить можно только на номер, записанный в сессии при выдаче кода: он
 * приходит из подтверждённой заявки, а не из тела запроса. Не вышло — страница
 * остаётся на прежнем пути: диалог с менеджером и текст с кодом в буфере.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(`invite-test:deliver:${getClientIp(req)}`, 20)) {
    return jsonError(429, 'Слишком много запросов')
  }

  const body = (await readJsonBody(req)) as Record<string, unknown> | null
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
  const channel = body?.channel as Channel | undefined
  if (!code || !channel) return jsonError(422, 'Не передан код или канал')

  const session = getSession(code)
  if (!session) return jsonError(404, 'Сессия не найдена')

  if (!session.phone || !isGreenReady(channel)) {
    return NextResponse.json({ delivered: false } satisfies DeliverResponse)
  }

  try {
    // Идентификатор чата спрашиваем у мессенджера, а не собираем из номера:
    // заодно видно, что аккаунт у гостя вообще есть. Нет — писать некуда, и
    // гость забирает пригласительные сам, из диалога с менеджером.
    const account = await checkAccount(channel, session.phone)
    if (!account.exist || !account.chatId) {
      return NextResponse.json({ delivered: false } satisfies DeliverResponse)
    }

    await deliver(code, { channel, via: 'green', chatId: account.chatId })
  } catch {
    // Статус ошибки лежит в сессии; гость дописывает менеджеру сам.
    return NextResponse.json({ delivered: false } satisfies DeliverResponse)
  }

  return NextResponse.json({ delivered: true } satisfies DeliverResponse)
}
