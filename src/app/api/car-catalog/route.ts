import { getPayload } from 'payload'
import { NextResponse } from 'next/server'
import config from '@payload-config'

export async function GET() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'car-catalog',
    where: { active: { equals: true } },
    sort: 'order',
    limit: 100,
    depth: 0,
  })

  const brands = result.docs.map((item) => ({
    brand: item.brand,
    models: item.models.map(({ model }) => model),
  }))

  return NextResponse.json({ brands })
}
