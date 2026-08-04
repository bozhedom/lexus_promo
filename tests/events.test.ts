import { describe, expect, it } from 'vitest'

import { parseEventsBatch } from '@/lib/events'

const sessionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const appId = '0b59185c-ae42-4943-9538-a3f4475cc80d'

describe('parseEventsBatch', () => {
  it('пропускает валидный батч', () => {
    const batch = parseEventsBatch({
      sessionId,
      events: [
        { name: 'screen_view', payload: { screen: 'start' } },
        { name: 'cta_click' },
      ],
    })
    expect(batch).not.toBeNull()
    expect(batch!.events).toHaveLength(2)
    expect(batch!.sessionId).toBe(sessionId)
  })

  it('дедуплицирует одинаковые события (двойной клик)', () => {
    const batch = parseEventsBatch({
      sessionId,
      events: [
        { name: 'certificate_saved', applicationId: appId },
        { name: 'certificate_saved', applicationId: appId },
        { name: 'certificate_saved' },
      ],
    })
    expect(batch!.events).toHaveLength(2)
  })

  it('различает события с разным payload', () => {
    const batch = parseEventsBatch({
      sessionId,
      events: [
        { name: 'screen_view', payload: { screen: 'start' } },
        { name: 'screen_view', payload: { screen: 'personal' } },
      ],
    })
    expect(batch!.events).toHaveLength(2)
  })

  it('фильтрует неизвестные события и кривые applicationId', () => {
    const batch = parseEventsBatch({
      sessionId,
      events: [
        { name: 'hack_attempt' },
        { name: 'cta_click', applicationId: 'DROP TABLE' },
      ],
    })
    expect(batch!.events).toHaveLength(1)
    expect(batch!.events[0]!.applicationId).toBeUndefined()
  })

  it('режет батч до 20 событий', () => {
    const events = Array.from({ length: 50 }, (_, i) => ({
      name: 'screen_view' as const,
      payload: { screen: String(i) },
    }))
    const batch = parseEventsBatch({ sessionId, events })
    expect(batch!.events).toHaveLength(20)
  })

  it('отклоняет мусор', () => {
    expect(parseEventsBatch(null)).toBeNull()
    expect(parseEventsBatch({})).toBeNull()
    expect(parseEventsBatch({ sessionId: 'x', events: [{ name: 'cta_click' }] })).toBeNull()
    expect(parseEventsBatch({ sessionId, events: [] })).toBeNull()
    expect(parseEventsBatch({ sessionId, events: [{ name: 'nope' }] })).toBeNull()
  })
})
