import { createHash } from 'node:crypto'
import path from 'node:path'

import { getPayload } from 'payload'
import config from '@payload-config'

import { loadCarPhotos } from '@/lib/carPhotos'
import { validatePhone } from '@/lib/validation'
import type { Media } from '@/payload-types'
import type { CarPhoto } from '@/shared/config/car-photos'
import { certificateFace, type CertificateKind } from '@/widgets/certificate-sheet/layout'

import type { Certificate, PersonalInviteDetails } from '../model/types'
import { renderCertificate } from './certificateImage'

/**
 * Пригласительные гостя, сохранённые в админке. Ровно эти картинки уходят в
 * мессенджеры: менеджер в карточке заявки видит то же, что пришло в чат.
 *
 * Картинка рисуется один раз — при выдаче кода — и остаётся в базе. Раньше её
 * клал браузер после кнопки «Скачать»; кнопки больше нет, и в админке
 * пригласительные перестали появляться вовсе.
 */

const KINDS: CertificateKind[] = ['diagnostics', 'gift']

const ALT: Record<CertificateKind, string> = {
  diagnostics: 'Персональный сертификат на диагностику ходовой части',
  gift: 'Персональный подарочный сертификат в честь знакомства',
}

/** Загрузки Payload лежат рядом с проектом, а не в public. */
const MEDIA_DIR = 'media'

const asCertificate = (kind: CertificateKind, media: Media): Certificate | null => {
  if (!media.url || !media.filename) return null
  return {
    id: kind,
    image: media.url,
    alt: ALT[kind],
    file: path.join(MEDIA_DIR, media.filename),
  }
}

/**
 * Отпечаток данных, из которых нарисована картинка: имя, автомобиль, номер,
 * сумма, номер выдачи и подобранный под них кадр. Он же стоит в имени файла —
 * иначе картинка рисуется один раз и навсегда, и загруженный менеджером кадр
 * не доезжает до гостя, которому пригласительные уже выписали.
 */
function fingerprint(
  kind: CertificateKind,
  details: PersonalInviteDetails,
  photos: CarPhoto[],
): string {
  const face = certificateFace(
    kind,
    { brand: details.brand, model: details.model, year: details.year },
    photos,
  )
  return createHash('sha1')
    .update(JSON.stringify([kind, details, face.photoRaster, face.plate]))
    .digest('hex')
    .slice(0, 10)
}

async function renderPng(
  kind: CertificateKind,
  details: PersonalInviteDetails,
  code: string,
  photos: CarPhoto[],
): Promise<Buffer> {
  const image = await renderCertificate(kind, details, `${kind}-${code}.png`, photos)
  return Buffer.from(await image.arrayBuffer())
}

/** Номера выдачи строк заявки: по ним подписывается кадр пригласительного. */
const serialsOf = (docs: { kind: string; serial?: number | null }[]) => {
  const serials: Partial<Record<CertificateKind, number>> = {}
  for (const doc of docs) {
    if (typeof doc.serial === 'number') serials[doc.kind as CertificateKind] = doc.serial
  }
  return serials
}

/**
 * Номера выдачи по коду пригласительного. Вернувшийся гость своей заявкой уже
 * не владеет — сессия браузера у него новая, — но код у него на руках, и по
 * нему находится вся выписанная пара.
 */
export async function certificateSerialsByCode(
  code: string,
): Promise<Partial<Record<CertificateKind, number>>> {
  try {
    const payload = await getPayload({ config })
    const found = await payload.find({
      collection: 'certificates',
      where: { code: { equals: code } },
      limit: 1,
      depth: 0,
    })
    const owner = found.docs[0]?.application
    if (!owner) return {}

    const pair = await payload.find({
      collection: 'certificates',
      where: { application: { equals: typeof owner === 'string' ? owner : owner.id } },
      limit: 10,
      depth: 0,
    })
    return serialsOf(pair.docs)
  } catch {
    // Без базы кадр рисуется без номера — это лучше, чем упавшая выдача.
    return {}
  }
}

/**
 * Телефон гостя в каноническом виде `+7XXXXXXXXXX`. По нему вебхук узнаёт
 * отправителя, когда кода в сообщении нет: в MAX текст в диалог с менеджером не
 * подставляется, и гость шлёт что придётся.
 *
 * Хозяин заявки находится по её идентификатору с проверкой сессии, вернувшийся
 * гость — по коду выданного пригласительного: заявкой он уже не владеет, но код
 * у него на руках. Пусто — заявки нет или базы нет, и остаётся только код.
 */
export async function guestPhone(owner: {
  applicationId?: string
  sessionId?: string
  certificateCode?: string
}): Promise<string> {
  try {
    const payload = await getPayload({ config })

    let applicationId = ''
    if (owner.applicationId && owner.sessionId) {
      applicationId = owner.applicationId
    } else if (owner.certificateCode) {
      const found = await payload.find({
        collection: 'certificates',
        where: { code: { equals: owner.certificateCode } },
        limit: 1,
        depth: 0,
      })
      const application = found.docs[0]?.application
      applicationId = typeof application === 'string' ? application : (application?.id ?? '')
    }
    if (!applicationId) return ''

    const application = await payload
      .findByID({ collection: 'applications', id: applicationId, depth: 0 })
      .catch(() => null)
    // Чужой идентификатор заявки не должен выдавать телефон её хозяина.
    if (!application) return ''
    if (owner.sessionId && application.sessionId !== owner.sessionId) return ''

    return validatePhone(application.phone) ?? ''
  } catch {
    return ''
  }
}

export interface StoredCertificates {
  certificates: Certificate[]
  /** Номера выдачи из базы: они напечатаны на кадре и нужны экрану гостя. */
  serials: Partial<Record<CertificateKind, number>>
}

/**
 * Дорисовывает недостающие картинки пригласительных заявки и возвращает пару
 * ссылок на них вместе с номерами выдачи. `null` — заявка не найдена или
 * сохранить не удалось: вызывающий откатывается на картинки, которые рисуются
 * по запросу.
 */
export async function storeCertificateImages(
  applicationId: string,
  sessionId: string,
  details: PersonalInviteDetails,
): Promise<StoredCertificates | null> {
  try {
    const payload = await getPayload({ config })

    const application = await payload
      .findByID({ collection: 'applications', id: applicationId, depth: 0 })
      .catch(() => null)
    // Чужой идентификатор заявки не должен давать доступ к её пригласительным.
    if (!application || application.sessionId !== sessionId) return null

    const issued = await payload.find({
      collection: 'certificates',
      where: { application: { equals: applicationId } },
      limit: 10,
      depth: 1,
    })

    const photos = await loadCarPhotos()
    // Номер выдачи печатается на кадре, поэтому он часть данных отрисовки:
    // берём его из базы, а не из тела запроса.
    const serials = serialsOf(issued.docs)
    const printed: PersonalInviteDetails = { ...details, serials }

    const result: Certificate[] = []
    for (const kind of KINDS) {
      const row = issued.docs.find((doc) => doc.kind === kind)
      if (!row) continue

      const stamp = fingerprint(kind, printed, photos)
      const existing = typeof row.image === 'object' && row.image ? row.image : null
      // Картинка сохранена и нарисована по тем же данным — берём её.
      const ready = existing?.filename?.includes(`-${stamp}.`) ? asCertificate(kind, existing) : null
      if (ready) {
        result.push(ready)
        continue
      }

      const png = await renderPng(kind, printed, row.code, photos)
      const media = await payload.create({
        collection: 'media',
        data: { alt: `Пригласительный ${row.code}` },
        file: {
          data: png,
          name: `certificate-${row.code}-${stamp}.png`,
          mimetype: 'image/png',
          size: png.byteLength,
        },
      })
      await payload.update({
        collection: 'certificates',
        id: row.id,
        data: { image: media.id },
      })
      // Прежняя картинка больше ни на что не ссылается: в админке от неё
      // осталась бы только строка в списке загрузок.
      if (existing?.id) {
        await payload
          .delete({ collection: 'media', id: existing.id })
          .catch(() => undefined)
      }

      const saved = asCertificate(kind, media)
      if (saved) result.push(saved)
    }

    return result.length === KINDS.length ? { certificates: result, serials } : null
  } catch {
    // Пригласительные важнее записи в админке: молча уходим на отрисовку по
    // запросу, ошибку видно в логах Payload.
    return null
  }
}
