import { NextRequest, NextResponse } from 'next/server'

import type { StatusResponse } from '@/invite-test/model/types'
import { getSession } from '@/invite-test/server/store'
import { jsonError } from '@/lib/http'

// GET /api/invite-test/status?code=...: страница ждёт отметку об отправке
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') ?? '').toUpperCase()
  const session = getSession(code)
  if (!session) return jsonError(404, 'Сессия не найдена')

  const response: StatusResponse = { status: session.status, error: session.error }
  return NextResponse.json(response)
}
