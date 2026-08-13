import { NextResponse } from 'next/server'

import { loadCarPhotos } from '@/lib/carPhotos'

// GET /api/car-photos: кадры автомобилей из админки. Браузер подмешивает их к
// встроенным, чтобы превью пригласительного показывало ту же машину, что и
// картинка, которую потом пришлёт мессенджер.
export async function GET() {
  const photos = await loadCarPhotos()
  return NextResponse.json(
    { photos },
    { headers: { 'cache-control': 'public, max-age=60, stale-while-revalidate=300' } },
  )
}
