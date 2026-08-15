import { describe, expect, it } from 'vitest'

import { CERT_HEIGHT, CERT_WIDTH, renderCertificate } from '@/invite-test/server/certificateImage'
import type { PersonalInviteDetails } from '@/invite-test/model/types'

const details = {
  fullName: 'Иванов Иван Иванович',
  brand: 'Lexus',
  model: 'RX 350',
  year: 2021,
  plate: 'А555АА125',
  amount: 1500,
  serials: { gift: 12, diagnostics: 34 },
} as unknown as PersonalInviteDetails

/** Размеры кадра лежат в IHDR — первом чанке PNG. */
function pngSize(buffer: Buffer) {
  const signature = buffer.subarray(0, 8).toString('hex')
  return {
    signature,
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

describe.each(['gift', 'diagnostics'] as const)('renderCertificate %s', (kind) => {
  it('отдаёт PNG в размер макета и не кэшируется', async () => {
    const response = await renderCertificate(kind, details, `${kind}-A1.png`)
    const buffer = Buffer.from(await response.arrayBuffer())
    const { signature, width, height } = pngSize(buffer)

    expect(signature).toBe('89504e470d0a1a0a')
    expect({ width, height }).toEqual({ width: CERT_WIDTH, height: CERT_HEIGHT })
    // Пригласительное именное: в общий кэш оно попасть не должно.
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0')
    expect(response.headers.get('content-disposition')).toContain(`${kind}-A1.png`)
  }, 60_000)
})
