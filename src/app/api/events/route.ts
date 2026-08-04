import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'

import { parseEventsBatch } from '@/lib/events'
import { getClientIp, jsonError, readJsonBody } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'

// POST /api/events: батч событий аналитики (в том числе через sendBeacon)
export async function POST(req: NextRequest) {
  // лимит чуть шире, чем у заявок: события шлются на каждом экране
  if (!rateLimit(`events:${getClientIp(req)}`, 30)) {
    return jsonError(429, 'Слишком много запросов')
  }

  const body = await readJsonBody(req)
  const batch = parseEventsBatch(body)
  if (!batch) return jsonError(400, 'Некорректный батч событий')

  const payload = await getPayload({ config })
  await Promise.all(
    batch.events.map(async (e) => {
      try {
        await payload.create({
          collection: 'events',
          data: {
            sessionId: batch.sessionId,
            eventName: e.name,
            application: e.applicationId,
            payload: e.payload,
          },
        })
      } catch (err) {
        // событие с несуществующим applicationId не должно ронять весь батч
        payload.logger.warn({ err }, 'event insert failed')
      }
    }),
  )

  return NextResponse.json({ ok: true }, { status: 202 })
}
