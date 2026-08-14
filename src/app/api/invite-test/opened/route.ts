import { NextRequest, NextResponse } from 'next/server'

import type { Channel, OpenedResponse } from '@/invite-test/model/types'
import { markOpened } from '@/invite-test/server/store'
import { getClientIp, jsonError, readJsonBody } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'

const CHANNELS: Channel[] = ['whatsapp', 'telegram', 'max']

/**
 * POST /api/invite-test/opened — гость нажал кнопку мессенджера и ушёл в диалог
 * с менеджером.
 *
 * Отметка нужна ради MAX: подставить текст в чужой диалог он не умеет, гость
 * отправляет что придётся, и связать входящее сообщение с выдачей больше нечем.
 * Телефона в воронке нет — гость оставляет только имя, — поэтому вебхук берёт
 * того, кто минуту назад ушёл в этот же мессенджер.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(`invite-test:opened:${getClientIp(req)}`, 30)) {
    return jsonError(429, 'Слишком много запросов')
  }

  const body = (await readJsonBody(req)) as Record<string, unknown> | null
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
  const channel = CHANNELS.find((item) => item === body?.channel)
  if (!code || !channel) return jsonError(422, 'Не передан код или канал')

  markOpened(code, channel)
  return NextResponse.json({ ok: true } satisfies OpenedResponse)
}
