import { sql, type SQL } from 'drizzle-orm'
import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'

import { jsonError } from '@/lib/http'

// GET /api/funnel?period=7d: сводка для дашборда админки. Только для авторизованных.

const PERIODS = { today: 0, '7d': 7, '30d': 30, all: null } as const
export type Period = keyof typeof PERIODS

// Шаги воронки. Каждый считается по уникальным сессиям, дошедшим до экрана.
const STEPS = [
  { key: 'welcome', label: 'Зашли на сайт' },
  { key: 'plate', label: 'Дошли до ввода номера' },
  { key: 'car_info', label: 'Дошли до данных авто' },
  { key: 'personal', label: 'Дошли до контактов' },
  { key: 'certificate', label: 'Получили пригласительный' },
  { key: 'final', label: 'Дошли до итогового экрана' },
] as const

export interface FunnelStep {
  key: string
  label: string
  sessions: number
  ofFirst: number
  ofPrev: number
  dropped: number
}

function since(period: Period): Date | null {
  const days = PERIODS[period]
  if (days === null) return null
  const d = new Date()
  if (days === 0) d.setHours(0, 0, 0, 0)
  else d.setDate(d.getDate() - days)
  return d
}

export async function GET(req: NextRequest) {
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return jsonError(401, 'Требуется авторизация')

  const raw = req.nextUrl.searchParams.get('period') as Period | null
  const period: Period = raw && raw in PERIODS ? raw : '30d'
  const from = since(period)

  const evFrom: SQL = from ? sql`AND created_at >= ${from.toISOString()}` : sql``
  const apFrom: SQL = from ? sql`WHERE created_at >= ${from.toISOString()}` : sql``

  const query = async <T>(statement: SQL): Promise<T[]> => {
    try {
      const res = await payload.db.drizzle.execute(statement)
      return (((res as { rows?: unknown[] }).rows ?? []) as T[]) ?? []
    } catch (err) {
      payload.logger.error({ err }, 'funnel query failed')
      return []
    }
  }

  // сколько уникальных сессий дошло до каждого экрана
  const screenRows = await query<{ screen: string; sessions: number }>(sql`
    SELECT payload->>'screen' AS screen, COUNT(DISTINCT session_id)::int AS sessions
    FROM events
    WHERE event_name = 'screen_view' ${evFrom}
    GROUP BY 1
  `)
  const bySession = new Map(screenRows.map((r) => [r.screen, r.sessions]))

  const first = bySession.get('welcome') ?? 0
  let prev = 0
  const steps: FunnelStep[] = STEPS.map((step, i) => {
    const sessions = bySession.get(step.key) ?? 0
    const result: FunnelStep = {
      key: step.key,
      label: step.label,
      sessions,
      ofFirst: first ? Math.round((sessions / first) * 100) : 0,
      ofPrev: i === 0 || !prev ? 100 : Math.round((sessions / prev) * 100),
      dropped: i === 0 ? 0 : Math.max(0, prev - sessions),
    }
    prev = sessions
    return result
  })

  // заявки: всего, доведённых до конца, и как определяли машину
  const [totals] = await query<{
    total: number
    completed: number
    api: number
    manual: number
  }>(sql`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (WHERE car_data_source = 'api')::int AS api,
           COUNT(*) FILTER (WHERE car_data_source = 'manual')::int AS manual
    FROM applications ${apFrom}
  `)

  const brands = await query<{ brand: string; count: number }>(sql`
    SELECT car_brand AS brand, COUNT(*)::int AS count
    FROM applications
    ${from ? sql`WHERE created_at >= ${from.toISOString()} AND` : sql`WHERE`} car_brand IS NOT NULL
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 5
  `)

  // действия, которые интересно видеть отдельно от шагов
  const actionRows = await query<{ event_name: string; sessions: number }>(sql`
    SELECT event_name, COUNT(DISTINCT session_id)::int AS sessions
    FROM events
    WHERE event_name IN ('plate_error', 'car_not_found', 'certificate_saved', 'outbound_click')
      ${evFrom}
    GROUP BY 1
  `)
  const actions = Object.fromEntries(actionRows.map((r) => [r.event_name, r.sessions]))

  return NextResponse.json({
    period,
    steps,
    applications: {
      total: totals?.total ?? 0,
      completed: totals?.completed ?? 0,
      api: totals?.api ?? 0,
      manual: totals?.manual ?? 0,
    },
    brands,
    actions,
  })
}
