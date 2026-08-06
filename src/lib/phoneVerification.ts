import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

const CHALLENGE_TTL_MS = 5 * 60 * 1000
const VERIFIED_TTL_MS = 24 * 60 * 60 * 1000

type TokenKind = 'phone_challenge' | 'phone_verified'

interface TokenPayload {
  v: 1
  kind: TokenKind
  applicationId: string
  phone: string
  exp: number
  nonce?: string
  codeHash?: string
}

function secret(): string {
  const value = process.env.PHONE_VERIFICATION_SECRET || process.env.PAYLOAD_SECRET
  if (!value) throw new Error('PHONE_VERIFICATION_SECRET is not configured')
  return value
}

function hmac(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}

function sign(payload: TokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${hmac(encoded)}`
}

function read(token: unknown): TokenPayload | null {
  if (typeof token !== 'string' || token.length > 2_000) return null
  const [encoded, signature, extra] = token.split('.')
  if (!encoded || !signature || extra) return null

  const expected = Buffer.from(hmac(encoded))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    const value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload
    if (
      value.v !== 1 ||
      (value.kind !== 'phone_challenge' && value.kind !== 'phone_verified') ||
      typeof value.applicationId !== 'string' ||
      typeof value.phone !== 'string' ||
      typeof value.exp !== 'number'
    ) {
      return null
    }
    return value
  } catch {
    return null
  }
}

function codeHash(applicationId: string, phone: string, nonce: string, code: string): string {
  return hmac(`${applicationId}:${phone}:${nonce}:${code}`)
}

export function createPhoneChallenge(applicationId: string, phone: string, now = Date.now()) {
  const code = randomInt(100_000, 1_000_000).toString()
  const nonce = randomBytes(16).toString('base64url')
  const expiresAt = now + CHALLENGE_TTL_MS
  const token = sign({
    v: 1,
    kind: 'phone_challenge',
    applicationId,
    phone,
    exp: expiresAt,
    nonce,
    codeHash: codeHash(applicationId, phone, nonce, code),
  })
  return { code, token, expiresAt }
}

export type ChallengeCheck = 'valid' | 'invalid' | 'expired'

export function checkPhoneChallenge(
  token: unknown,
  code: unknown,
  applicationId: string,
  phone: string,
  now = Date.now(),
): ChallengeCheck {
  const value = read(token)
  if (
    !value ||
    value.kind !== 'phone_challenge' ||
    value.applicationId !== applicationId ||
    value.phone !== phone ||
    !value.nonce ||
    !value.codeHash ||
    typeof code !== 'string' ||
    !/^\d{6}$/.test(code)
  ) {
    return 'invalid'
  }
  if (value.exp < now) return 'expired'

  const expected = Buffer.from(value.codeHash)
  const actual = Buffer.from(codeHash(applicationId, phone, value.nonce, code))
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? 'valid' : 'invalid'
}

export function createPhoneVerificationToken(
  applicationId: string,
  phone: string,
  now = Date.now(),
): string {
  return sign({
    v: 1,
    kind: 'phone_verified',
    applicationId,
    phone,
    exp: now + VERIFIED_TTL_MS,
  })
}

export function isPhoneVerificationValid(
  token: unknown,
  applicationId: string,
  phone: string,
  now = Date.now(),
): boolean {
  const value = read(token)
  return Boolean(
    value &&
      value.kind === 'phone_verified' &&
      value.applicationId === applicationId &&
      value.phone === phone &&
      value.exp >= now,
  )
}

export const PHONE_CHALLENGE_TTL_SECONDS = CHALLENGE_TTL_MS / 1000
