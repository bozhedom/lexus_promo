import path from 'node:path'

import { getPayload } from 'payload'
import config from '@payload-config'

import { loadCarPhotos } from '@/lib/carPhotos'
import type { Media } from '@/payload-types'
import type { CertificateKind } from '@/widgets/certificate-sheet/layout'

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

async function renderPng(
  kind: CertificateKind,
  details: PersonalInviteDetails,
  code: string,
): Promise<Buffer> {
  const image = await renderCertificate(
    kind,
    details,
    `${kind}-${code}.png`,
    await loadCarPhotos(),
  )
  return Buffer.from(await image.arrayBuffer())
}

/**
 * Дорисовывает недостающие картинки пригласительных заявки и возвращает пару
 * ссылок на них. `null` — заявка не найдена или сохранить не удалось: вызывающий
 * откатывается на картинки, которые рисуются по запросу.
 */
export async function storeCertificateImages(
  applicationId: string,
  sessionId: string,
  details: PersonalInviteDetails,
): Promise<Certificate[] | null> {
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

    const result: Certificate[] = []
    for (const kind of KINDS) {
      const row = issued.docs.find((doc) => doc.kind === kind)
      if (!row) continue

      const existing = typeof row.image === 'object' && row.image ? row.image : null
      const ready = existing ? asCertificate(kind, existing) : null
      if (ready) {
        result.push(ready)
        continue
      }

      const png = await renderPng(kind, details, row.code)
      const media = await payload.create({
        collection: 'media',
        data: { alt: `Пригласительный ${row.code}` },
        file: {
          data: png,
          name: `certificate-${row.code}.png`,
          mimetype: 'image/png',
          size: png.byteLength,
        },
      })
      await payload.update({
        collection: 'certificates',
        id: row.id,
        data: { image: media.id },
      })

      const saved = asCertificate(kind, media)
      if (saved) result.push(saved)
    }

    return result.length === KINDS.length ? result : null
  } catch {
    // Пригласительные важнее записи в админке: молча уходим на отрисовку по
    // запросу, ошибку видно в логах Payload.
    return null
  }
}
