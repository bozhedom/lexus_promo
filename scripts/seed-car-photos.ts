/**
 * Переносит встроенные кадры пригласительного в раздел «Фото автомобилей».
 *
 * То же самое делает миграция `20260813_190000_car_photos_seed`. Скрипт нужен
 * там, где схему подняла разработка и до миграций дело не доходит: раздел
 * заполняется, не трогая историю миграций. Повторный запуск ничего не портит —
 * непустой раздел скрипт не трогает.
 *
 *   npm run seed:car-photos
 */
import { getPayload } from 'payload'
import config from '@payload-config'

import { seedCarPhotos } from '../src/lib/seedCarPhotos'

const payload = await getPayload({ config })
const result = await seedCarPhotos(payload)

if (result.skipped === 'already-filled') {
  console.log('Раздел «Фото автомобилей» уже заполнен — ничего не меняли.')
} else {
  console.log(`Перенесено кадров: ${result.created}`)
}

process.exit(0)
