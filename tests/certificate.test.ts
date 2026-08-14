import { afterEach, describe, expect, it } from 'vitest'

import { computeCertificateAmount, generateCertificateCode } from '@/lib/certificate'
import type { Application } from '@/payload-types'
import { certificateSerial } from '@/widgets/certificate-sheet/layout'

const app = { carBrand: 'Toyota', carModel: 'Camry' } as Application

describe('certificateSerial', () => {
  it('нумерует диагностику буквой A, а замену масла — B', () => {
    expect(certificateSerial('diagnostics', 1)).toEqual({ letter: 'A', number: '000001' })
    expect(certificateSerial('gift', 1)).toEqual({ letter: 'B', number: '000001' })
  })

  it('дополняет номер нулями до шести знаков', () => {
    expect(certificateSerial('diagnostics', 42)?.number).toBe('000042')
    expect(certificateSerial('gift', 1234567)?.number).toBe('1234567')
  })

  it('не печатает номер, пока пригласительное не выписано', () => {
    expect(certificateSerial('diagnostics', null)).toBeNull()
    expect(certificateSerial('diagnostics', undefined)).toBeNull()
    expect(certificateSerial('gift', 0)).toBeNull()
  })
})

describe('generateCertificateCode', () => {
  it('генерирует код формата GIFT-XXXXX без неоднозначных символов', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCertificateCode()
      expect(code).toMatch(/^GIFT-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/)
    }
  })

  it('коды почти не повторяются', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateCertificateCode()))
    expect(codes.size).toBeGreaterThan(490)
  })
})

describe('computeCertificateAmount', () => {
  afterEach(() => {
    delete process.env.CERT_AMOUNT
  })

  it('по умолчанию 1500 как в макете', () => {
    expect(computeCertificateAmount(app)).toBe(1500)
  })

  it('уважает CERT_AMOUNT из env', () => {
    process.env.CERT_AMOUNT = '2000'
    expect(computeCertificateAmount(app)).toBe(2000)
  })

  it('игнорирует некорректный CERT_AMOUNT', () => {
    process.env.CERT_AMOUNT = '-5'
    expect(computeCertificateAmount(app)).toBe(1500)
  })

  it('берёт сумму первого подходящего правила из админки', () => {
    expect(computeCertificateAmount(app, [
      { brand: 'Lexus', models: [{ model: 'RX' }], amount: 1500 },
      { brand: ' toyota ', models: [{ model: 'CAMRY' }], amount: 1000 },
    ])).toBe(1000)
  })

  it('не применяет правило другой модели', () => {
    process.env.CERT_AMOUNT = '1750'
    expect(computeCertificateAmount(app, [
      { brand: 'Toyota', models: [{ model: 'RAV4' }], amount: 1000 },
    ])).toBe(1750)
  })
})
