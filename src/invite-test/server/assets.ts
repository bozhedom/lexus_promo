import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { Certificate } from '../model/types'
import { inviteTestEnv } from '../config/env'

export interface CertificateFile {
  name: string
  blob: Blob
  url: string
}

// Файлы читаем с диска и заливаем как multipart: так отправка работает и с
// локальной машины, где public/ ещё не доступен мессенджеру по HTTPS.
export async function readCertificateFiles(certificates: Certificate[]): Promise<CertificateFile[]> {
  const base = inviteTestEnv.siteUrl.replace(/\/$/, '')
  return Promise.all(
    certificates.map(async (cert) => {
      const isRemote = /^https?:\/\//i.test(cert.image)
      const url = isRemote ? cert.image : `${base}/${cert.image.replace(/^\//, '')}`
      const localFile = isRemote
        ? null
        : path.join(process.cwd(), 'public', cert.image.replace(/^\//, ''))
      let blob: Blob
      if (localFile) {
        const bytes = await readFile(localFile).catch(() => null)
        if (bytes) blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' })
        else {
          const response = await fetch(url)
          if (!response.ok) throw new Error(`Не удалось загрузить сертификат: ${response.status}`)
          blob = await response.blob()
        }
      } else {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Не удалось загрузить сертификат: ${response.status}`)
        blob = await response.blob()
      }
      return {
        name: path.basename(new URL(url).pathname) || `${cert.id}.png`,
        blob,
        url,
      }
    }),
  )
}
