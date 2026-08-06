import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  checkPhoneChallenge,
  createPhoneChallenge,
  createPhoneVerificationToken,
  isPhoneVerificationValid,
} from '@/lib/phoneVerification'
import { isSmsRuAccepted } from '@/lib/sms'

const previousSecret = process.env.PHONE_VERIFICATION_SECRET

beforeAll(() => {
  process.env.PHONE_VERIFICATION_SECRET = 'test-secret-that-is-not-used-in-production'
})

afterAll(() => {
  if (previousSecret) process.env.PHONE_VERIFICATION_SECRET = previousSecret
  else delete process.env.PHONE_VERIFICATION_SECRET
})

describe('phone verification tokens', () => {
  it('принимает правильный код и отклоняет неправильный или просроченный', () => {
    const now = 1_700_000_000_000
    const challenge = createPhoneChallenge('app-1', '+79996660012', now)
    expect(checkPhoneChallenge(challenge.token, challenge.code, 'app-1', '+79996660012', now)).toBe(
      'valid',
    )
    expect(checkPhoneChallenge(challenge.token, '000000', 'app-1', '+79996660012', now)).toBe(
      'invalid',
    )
    expect(
      checkPhoneChallenge(challenge.token, challenge.code, 'app-1', '+79996660012', challenge.expiresAt + 1),
    ).toBe('expired')
  })

  it('привязывает подтверждение к заявке и телефону', () => {
    const token = createPhoneVerificationToken('app-1', '+79996660012', 1000)
    expect(isPhoneVerificationValid(token, 'app-1', '+79996660012', 2000)).toBe(true)
    expect(isPhoneVerificationValid(token, 'app-2', '+79996660012', 2000)).toBe(false)
    expect(isPhoneVerificationValid(token, 'app-1', '+79990000000', 2000)).toBe(false)
  })
})

describe('SMS.ru response', () => {
  it('принимает только успешный ответ по нужному получателю', () => {
    const response = {
      status: 'OK',
      status_code: 100,
      sms: { '79996660012': { status: 'OK', status_code: 100 } },
    }
    expect(isSmsRuAccepted(response, '79996660012')).toBe(true)
    expect(isSmsRuAccepted(response, '79990000000')).toBe(false)
  })
})
