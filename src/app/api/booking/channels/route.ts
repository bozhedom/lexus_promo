import { NextRequest, NextResponse } from 'next/server'

import { bookingText } from '@/invite-test/config/certificates'
import { managerChannels } from '@/invite-test/server/channels'
import { getClientIp, jsonError, readJsonBody } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'

/**
 * POST /api/booking/channels — диалоги с менеджером для записи на сервис.
 *
 * Пригласительные здесь не выписываются: гость просто уходит в мессенджер с
 * готовым текстом про свой автомобиль, а менеджер договаривается о времени.
 * Поэтому ни кода выдачи, ни ожидания автодоставки на этом пути нет.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(`booking:channels:${getClientIp(req)}`, 20)) {
    return jsonError(429, 'Слишком много запросов')
  }

  const body = (await readJsonBody(req)) as Record<string, unknown> | null
  const text = (value: unknown, max: number) =>
    typeof value === 'string' ? value.trim().slice(0, max) : ''

  const car = text(body?.car, 80)
  const plate = text(body?.plate, 16).toUpperCase()

  return NextResponse.json({ channels: await managerChannels({ opening: bookingText(car, plate) }) })
}
