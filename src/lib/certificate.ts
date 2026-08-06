import crypto from 'crypto'
import type { Application } from '@/payload-types'

// Без похожих символов (0/O, 1/I, ...) чтобы код легко диктовался по телефону
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 5

export function generateCertificateCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH)
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length]
  }
  return `GIFT-${code}`
}

export interface CertificateAmountRuleLike {
  brand?: string | null
  models?: { model: string }[] | null
  amount: number
}

const normalizeCarName = (value: string | null | undefined) =>
  (value ?? '').trim().toLocaleLowerCase('ru-RU').replace(/\s+/g, ' ')

/**
 * Сумму подарка считает только сервер. Сначала проверяются правила из админки,
 * затем CERT_AMOUNT и, наконец, безопасное значение по умолчанию.
 */
export function computeCertificateAmount(
  app: Application,
  rules: CertificateAmountRuleLike[] = [],
): number {
  const brand = normalizeCarName(app.carBrand)
  const model = normalizeCarName(app.carModel)
  const matched = rules.find((rule) => {
    if (!Number.isFinite(rule.amount) || rule.amount <= 0) return false
    const ruleBrand = normalizeCarName(rule.brand)
    if (ruleBrand && ruleBrand !== brand) return false
    return (rule.models ?? []).some((item) => normalizeCarName(item.model) === model)
  })
  if (matched) return matched.amount

  const fromEnv = Number(process.env.CERT_AMOUNT)
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 1500
}
