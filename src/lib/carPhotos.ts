import path from 'node:path'

import { getPayload } from 'payload'
import config from '@payload-config'

import { CAR_PHOTOS_DIR, CAR_PHOTO_RASTER } from '@/collections/CarPhotos'
import type { CarPhoto } from '@/shared/config/car-photos'
import type { CarPhoto as CarPhotoDoc } from '@/payload-types'

/**
 * Кадры автомобилей из админки. Читаются на каждый пригласительный, поэтому
 * держим короткий кэш: правка в админке подхватывается через минуту, а сотня
 * гостей подряд не устраивает сотню запросов в базу.
 */
const TTL_MS = 60_000

const store = globalThis as typeof globalThis & {
  __carPhotosCache?: { at: number; photos: CarPhoto[] }
}

/** Путь от корня проекта: его же ждёт отрисовка серверной картинки. */
const diskPath = (filename: string) =>
  path.relative(process.cwd(), path.join(CAR_PHOTOS_DIR, filename))

function toCarPhoto(doc: CarPhotoDoc): CarPhoto | null {
  const raster = doc.sizes?.[CAR_PHOTO_RASTER]?.filename ?? doc.filename
  if (!doc.url || !raster) return null

  const plate = doc.plate
  return {
    brand: doc.brand ?? '',
    model: doc.model ?? '',
    yearFrom: doc.yearFrom ?? null,
    yearTo: doc.yearTo ?? null,
    photo: doc.url,
    photoRaster: diskPath(raster),
    plate:
      plate?.hidden || plate?.x == null || plate?.y == null || plate?.width == null
        ? null
        : { x: plate.x / 100, y: plate.y / 100, w: plate.width / 100 },
    managed: true,
  }
}

export async function loadCarPhotos(): Promise<CarPhoto[]> {
  const cached = store.__carPhotosCache
  if (cached && Date.now() - cached.at < TTL_MS) return cached.photos

  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'car-photos',
      where: { active: { equals: true } },
      limit: 500,
      depth: 0,
    })
    const photos = result.docs.map(toCarPhoto).filter((item): item is CarPhoto => item !== null)
    store.__carPhotosCache = { at: Date.now(), photos }
    return photos
  } catch {
    // База может быть недоступна: пригласительный всё равно должен нарисоваться
    // на встроенном кадре, а не упасть.
    return cached?.photos ?? []
  }
}
