import { describe, expect, it } from 'vitest'

import { maxConversationLink } from '../src/invite-test/server/channels'

describe('MAX conversation link', () => {
  const opening = encodeURIComponent('Здравствуйте! Код: ABCD123456')

  it('uses the MAX share deeplink when only a phone number is configured', () => {
    expect(maxConversationLink('79394501979', opening)).toBe(
      `https://max.ru/:share?text=${opening}`,
    )
  })

  it('keeps a full MAX profile link', () => {
    expect(maxConversationLink('https://max.ru/u/profile-hash', opening)).toBe(
      'https://max.ru/u/profile-hash',
    )
  })

  it('supports a public username', () => {
    expect(maxConversationLink('@autogarant', opening)).toBe('https://max.ru/autogarant')
  })
})
