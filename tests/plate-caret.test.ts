import { describe, expect, it } from 'vitest'

import {
  caretAt,
  clampCaret,
  eraseTarget,
  filledLimit,
  flatIndex,
  shiftCaret,
} from '@/features/plate-lookup/lib/caret'

const empty = ['', '', '', '', '', '']

describe('flatIndex / caretAt', () => {
  it('разворачивает обе части в одну дорожку и обратно', () => {
    expect(flatIndex({ part: 'main', index: 0 })).toBe(0)
    expect(flatIndex({ part: 'main', index: 5 })).toBe(5)
    expect(flatIndex({ part: 'region', index: 0 })).toBe(6)
    expect(caretAt(5)).toEqual({ part: 'main', index: 5 })
    expect(caretAt(6)).toEqual({ part: 'region', index: 0 })
  })
})

describe('shiftCaret', () => {
  it('переходит через границу частей', () => {
    expect(shiftCaret({ part: 'main', index: 5 }, 1)).toEqual({ part: 'region', index: 0 })
    expect(shiftCaret({ part: 'region', index: 0 }, -1)).toEqual({ part: 'main', index: 5 })
  })

  it('упирается в края номера', () => {
    expect(shiftCaret({ part: 'main', index: 0 }, -1)).toEqual({ part: 'main', index: 0 })
    expect(shiftCaret({ part: 'region', index: 2 }, 1)).toEqual({ part: 'region', index: 2 })
  })
})

describe('filledLimit', () => {
  it('считает по последней заполненной ячейке, а не по первой пустой', () => {
    expect(filledLimit(empty)).toBe(0)
    expect(filledLimit(['А', '5', '', '5', '', ''])).toBe(4)
  })
})

describe('clampCaret', () => {
  it('по пустому знаку каретка встаёт только в начало', () => {
    expect(clampCaret('main', 4, empty)).toEqual({ part: 'main', index: 0 })
  })

  it('внутри набранного встаёт куда угодно', () => {
    const slots = ['А', '5', '5', '5', 'А', 'А']
    expect(clampCaret('main', 2, slots)).toEqual({ part: 'main', index: 2 })
  })

  it('не выходит за последнюю ячейку части', () => {
    const slots = ['А', '5', '5', '5', 'А', 'А']
    expect(clampCaret('main', 9, slots)).toEqual({ part: 'main', index: 5 })
  })

  it('дырка в середине не запирает каретку слева от неё', () => {
    const slots = ['А', '5', '', '5', 'А', 'А']
    expect(clampCaret('main', 5, slots)).toEqual({ part: 'main', index: 5 })
  })
})

describe('eraseTarget', () => {
  it('гасит ячейку под кареткой, если она заполнена', () => {
    const caret = { part: 'main' as const, index: 3 }
    expect(eraseTarget(caret, ['А', '5', '5', '5', '', ''])).toBe(caret)
  })

  it('с пустой ячейки шагает влево', () => {
    expect(eraseTarget({ part: 'main', index: 4 }, ['А', '5', '5', '5', '', ''])).toEqual({
      part: 'main',
      index: 3,
    })
  })

  it('шагает через границу частей', () => {
    expect(eraseTarget({ part: 'region', index: 0 }, ['', '', ''])).toEqual({
      part: 'main',
      index: 5,
    })
  })

  it('в самом начале стирать нечего', () => {
    expect(eraseTarget({ part: 'main', index: 0 }, empty)).toBeNull()
  })
})
