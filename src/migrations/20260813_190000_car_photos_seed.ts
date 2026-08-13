import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

// Путь относительный, а не по алиасу: миграции запускает не сборка Next.
import { seedCarPhotos, unseedCarPhotos } from '../lib/seedCarPhotos'

/**
 * Кадры пригласительных переезжают из кода в раздел «Фото автомобилей»: после
 * этой миграции менеджер меняет машине фотографию и рамку знака прямо в
 * админке, а новую модель заводит кнопкой. Сам перенос — в `lib/seedCarPhotos`,
 * оттуда же его дёргает `npm run seed:car-photos`.
 */
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  await seedCarPhotos(payload, req)
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await unseedCarPhotos(payload, req)
}
