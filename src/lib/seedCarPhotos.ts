import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { Payload, PayloadRequest } from 'payload'

import { BUILTIN_CAR_PHOTOS, type CarPhoto } from '../shared/config/car-photos'

/**
 * Перенос встроенных кадров пригласительного в раздел «Фото автомобилей».
 *
 * Каталог кадров жил в коде, и поменять машине фотографию или завести новую
 * модель можно было только правкой `shared/config/car-photos`. Тот же список
 * переезжает в админку: кадр меняется загрузкой файла, рамка знака —
 * процентами, новая модель заводится кнопкой.
 *
 * Вызывается из миграции `20260813_190000_car_photos_seed` и из
 * `npm run seed:car-photos` — второй нужен там, где база уже поднята схемой
 * разработки и до миграций дело не доходит.
 */

const asPercent = (value: number) => Math.round(value * 1000) / 10

function yearsLabel(photo: CarPhoto): string {
  if (photo.yearFrom != null && photo.yearTo != null) return `${photo.yearFrom}–${photo.yearTo}`
  if (photo.yearFrom != null) return `с ${photo.yearFrom}`
  if (photo.yearTo != null) return `до ${photo.yearTo}`
  return ''
}

/** Подпись в списке админки: марка, модель и годы, если они заданы. */
function titleOf(photo: CarPhoto): string {
  const years = yearsLabel(photo)
  if (!photo.model) return [photo.brand, '— любая модель', years].filter(Boolean).join(' ')
  return [photo.brand, photo.model, years].filter(Boolean).join(' ')
}

export interface SeedResult {
  created: number
  skipped: 'already-filled' | null
}

export async function seedCarPhotos(payload: Payload, req?: PayloadRequest): Promise<SeedResult> {
  // Раздел уже ведут руками — не подменяем чужой список своим.
  const existing = await payload.count({ collection: 'car-photos', req })
  if (existing.totalDocs > 0) {
    payload.logger.info('car-photos: раздел не пуст, встроенные кадры не переносим')
    return { created: 0, skipped: 'already-filled' }
  }

  let created = 0
  for (const photo of BUILTIN_CAR_PHOTOS) {
    // `photo.photo` — адрес для браузера («/images/cert/…»), файл лежит в public.
    const file = path.join(process.cwd(), 'public', photo.photo)
    const data = await readFile(file).catch(() => null)
    if (!data) {
      payload.logger.warn(`car-photos: кадр ${photo.photo} не найден, пропускаем`)
      continue
    }

    const plate = photo.plate
    await payload.create({
      collection: 'car-photos',
      req,
      data: {
        title: titleOf(photo),
        brand: photo.brand,
        model: photo.model,
        yearFrom: photo.yearFrom,
        yearTo: photo.yearTo,
        plate: plate
          ? {
              hidden: false,
              x: asPercent(plate.x),
              y: asPercent(plate.y),
              width: asPercent(plate.w),
            }
          : { hidden: true },
        active: true,
      },
      file: {
        data,
        name: path.basename(photo.photo),
        mimetype: 'image/webp',
        size: data.byteLength,
      },
    })
    created += 1
  }

  payload.logger.info(`car-photos: перенесено кадров — ${created}`)
  return { created, skipped: null }
}

/** Откат переноса: раздел возвращается в пустое состояние. */
export async function unseedCarPhotos(payload: Payload, req?: PayloadRequest): Promise<void> {
  for (const photo of BUILTIN_CAR_PHOTOS) {
    await payload.delete({
      collection: 'car-photos',
      req,
      where: {
        and: [
          { brand: { equals: photo.brand } },
          { filename: { equals: path.basename(photo.photo) } },
        ],
      },
    })
  }
}
