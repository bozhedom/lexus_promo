import { NextRequest, NextResponse } from 'next/server'

import { lookupCar } from '@/lib/carApi'
import { getClientIp, jsonError } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { validatePlate } from '@/lib/validation'

// GET /api/car-info?plate=А555АА125: прокси к внешнему API с кэшем и fallback
export async function GET(req: NextRequest) {
  if (!rateLimit(`car-info:${getClientIp(req)}`, 10)) {
    return jsonError(429, 'Слишком много запросов, попробуйте позже')
  }

  const plate = validatePlate(req.nextUrl.searchParams.get('plate'))
  if (!plate) return jsonError(422, 'Некорректный госномер')

  const info = await lookupCar(plate)
  return NextResponse.json(info)
}
