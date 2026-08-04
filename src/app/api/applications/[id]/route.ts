import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'

import type { Application } from '@/payload-types'
import { getClientIp, isHoneypotTripped, jsonError, readJsonBody } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import {
  validateCarYear,
  validateEmail,
  validateFullName,
  validatePhone,
  validatePlate,
  validateSessionId,
  validateShortText,
} from '@/lib/validation'

const STATUS_ORDER: Record<Application['status'], number> = {
  draft_plate: 0,
  draft_car: 1,
  draft_personal: 2,
  completed: 3,
}

// PATCH /api/applications/:id: дополнить черновик данными следующего шага
export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/applications/[id]'>) {
  if (!rateLimit(`applications:${getClientIp(req)}`, 10)) {
    return jsonError(429, 'Слишком много запросов, попробуйте позже')
  }

  const { id } = await ctx.params
  const body = (await readJsonBody(req)) as Record<string, unknown> | null
  if (!body) return jsonError(400, 'Некорректное тело запроса')
  if (isHoneypotTripped(body)) return NextResponse.json({ ok: true })

  const sessionId = validateSessionId(body.sessionId)
  if (!sessionId) return jsonError(400, 'Некорректный идентификатор сессии')

  const payload = await getPayload({ config })
  let app: Application
  try {
    app = await payload.findByID({ collection: 'applications', id })
  } catch {
    return jsonError(404, 'Заявка не найдена')
  }
  // заявку может менять только её сессия
  if (app.sessionId !== sessionId) return jsonError(404, 'Заявка не найдена')
  if (app.status === 'completed') return jsonError(409, 'Заявка уже завершена')

  const data: Partial<Application> = {}
  const errors: Record<string, string> = {}

  const setField = <K extends keyof Application>(
    key: K,
    value: Application[K] | null,
    message: string,
  ) => {
    if (value === null) errors[key] = message
    else data[key] = value
  }

  if (body.plateNumber !== undefined) {
    setField('plateNumber', validatePlate(body.plateNumber), 'Некорректный госномер')
  }
  if (body.carBrand !== undefined) {
    setField('carBrand', validateShortText(body.carBrand), 'Укажите марку')
  }
  if (body.carModel !== undefined) {
    setField('carModel', validateShortText(body.carModel), 'Укажите модель')
  }
  if (body.carYear !== undefined) {
    setField('carYear', validateCarYear(body.carYear), 'Некорректный год')
  }
  if (body.carDataSource === 'api' || body.carDataSource === 'manual') {
    data.carDataSource = body.carDataSource
  }
  if (body.fullName !== undefined) {
    setField('fullName', validateFullName(body.fullName), 'Укажите имя (2-100 букв)')
  }
  if (body.phone !== undefined) {
    setField('phone', validatePhone(body.phone), 'Некорректный номер телефона')
  }
  if (body.email !== undefined && body.email !== '') {
    setField('email', validateEmail(body.email), 'Некорректный email')
  }
  if (body.consentGiven !== undefined) {
    data.consentGiven = body.consentGiven === true
  }

  if (Object.keys(errors).length > 0) {
    return jsonError(422, 'Проверьте правильность полей', { fields: errors })
  }
  if (Object.keys(data).length === 0) {
    return jsonError(400, 'Нет данных для обновления')
  }

  // статус двигается только вперёд по воронке
  const hasCar = data.carBrand !== undefined || data.carModel !== undefined
  const hasPersonal = data.fullName !== undefined || data.phone !== undefined
  let nextStatus: Application['status'] = app.status
  if (hasCar && STATUS_ORDER[nextStatus] < STATUS_ORDER.draft_car) nextStatus = 'draft_car'
  if (hasPersonal && STATUS_ORDER[nextStatus] < STATUS_ORDER.draft_personal) {
    nextStatus = 'draft_personal'
  }
  data.status = nextStatus

  const updated = await payload.update({ collection: 'applications', id, data })
  return NextResponse.json({ id: updated.id, status: updated.status })
}
