import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'

import { buildCsv } from '@/lib/csv'
import { jsonError } from '@/lib/http'

const COLUMNS: Array<{ key: string; title: string }> = [
  { key: 'createdAt', title: 'Создана' },
  { key: 'status', title: 'Статус' },
  { key: 'plateNumber', title: 'Госномер' },
  { key: 'carBrand', title: 'Марка' },
  { key: 'carModel', title: 'Модель' },
  { key: 'carYear', title: 'Год' },
  { key: 'carDataSource', title: 'Источник авто' },
  { key: 'fullName', title: 'Имя' },
  { key: 'phone', title: 'Телефон' },
  { key: 'email', title: 'Email' },
  { key: 'consentGiven', title: 'Согласие ПД' },
  { key: 'utmSource', title: 'UTM source' },
  { key: 'utmMedium', title: 'UTM medium' },
  { key: 'utmCampaign', title: 'UTM campaign' },
  { key: 'id', title: 'ID' },
]

// GET /api/export/applications: выгрузка заявок в CSV. Только для авторизованных.
export async function GET(req: NextRequest) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return jsonError(401, 'Требуется авторизация')

  const { docs } = await payload.find({
    collection: 'applications',
    pagination: false,
    depth: 0,
    sort: '-createdAt',
  })

  const csv = buildCsv(
    COLUMNS.map((c) => c.title),
    docs.map((doc) =>
      COLUMNS.map((c) => (doc as unknown as Record<string, unknown>)[c.key]),
    ),
  )

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="applications-${date}.csv"`,
    },
  })
}
