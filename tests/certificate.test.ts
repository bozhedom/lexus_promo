import { afterEach, describe, expect, it } from 'vitest'

import { computeCertificateAmount, generateCertificateCode } from '@/lib/certificate'
import type { Application } from '@/payload-types'

const app = { carBrand: 'Toyota', carModel: 'Camry' } as Application

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
