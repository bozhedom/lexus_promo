import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Пути каталога кадров считаются от корня проекта: кадр из админки лежит не
 * в `public`, а рядом с остальными загрузками Payload.
 */
const asset = (relative: string) => path.join(process.cwd(), relative)

const dataUrl = async (relative: string, mime: string) => {
  const file = await readFile(asset(relative))
  return `data:${mime};base64,${file.toString('base64')}`
}

export interface CertificateAssets {
  photo: string
  crown: string
  gift: string
  marker: string
  phone: string
  lexusLogo: string
  forum: Buffer
  condensed: Buffer
  condensedBold: Buffer
}

/** Satori не умеет ходить по сети: и кадры, и шрифты уезжают в кадр целиком. */
export async function loadCertificateAssets(photoRaster: string): Promise<CertificateAssets> {
  const [photo, crown, gift, marker, phone, lexusLogo, forum, condensed, condensedBold] =
    await Promise.all([
      dataUrl(photoRaster, 'image/jpeg'),
      dataUrl('public/images/cert/crown.svg', 'image/svg+xml'),
      dataUrl('public/images/cert/gift.svg', 'image/svg+xml'),
      dataUrl('public/images/cert/marker.svg', 'image/svg+xml'),
      dataUrl('public/images/cert/phone.svg', 'image/svg+xml'),
      dataUrl('public/images/cert/lexus.svg', 'image/svg+xml'),
      readFile(asset('public/fonts/forum.ttf')),
      readFile(asset('public/fonts/roboto-condensed-400.ttf')),
      readFile(asset('public/fonts/roboto-condensed-700.ttf')),
    ])

  return { photo, crown, gift, marker, phone, lexusLogo, forum, condensed, condensedBold }
}
