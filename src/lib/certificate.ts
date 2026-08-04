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

/**
 * Сумму подарка считает только сервер. Сейчас фиксированная (в макете 1500₽),
 * env CERT_AMOUNT позволяет поменять без деплоя кода.
 */
export function computeCertificateAmount(_app: Application): number {
  const fromEnv = Number(process.env.CERT_AMOUNT)
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 1500
}
