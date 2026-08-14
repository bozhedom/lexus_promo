import { describe, expect, it } from 'vitest'

import { maxConversationLink } from '../src/invite-test/server/channels'

/**
 * У MAX нет диплинка, который открыл бы диалог с человеком и подставил туда
 * текст: официально их три — `?start=` и `?startapp=` у бота и `:share?text=`.
 * Поэтому ссылку профиля отдаём как есть, иначе страница решит, что текст
 * подставлен, и не положит его гостю в буфер обмена.
 */
describe('MAX conversation link', () => {
  const opening = encodeURIComponent('Здравствуйте! Код: ABCD123456')

  it('uses the MAX share deeplink when only a phone number is configured', () => {
    expect(maxConversationLink('79394501979', opening)).toBe(
      `https://max.ru/:share?text=${opening}`,
    )
  })

  it('opens a full MAX profile link as is: the messenger ignores ?text=', () => {
    expect(maxConversationLink('https://max.ru/u/profile-hash', opening)).toBe(
      'https://max.ru/u/profile-hash',
    )
  })

  it('opens a public username as is', () => {
    expect(maxConversationLink('@autogarant', opening)).toBe('https://max.ru/autogarant')
  })

  it('keeps a text parameter that was configured by hand', () => {
    expect(maxConversationLink(`https://max.ru/autogarant?text=${opening}`, opening)).toBe(
      `https://max.ru/autogarant?text=${opening}`,
    )
  })
})
