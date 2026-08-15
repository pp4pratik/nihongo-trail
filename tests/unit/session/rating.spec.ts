import { describe, it, expect } from 'vitest'
import { rateOutcome } from '@/features/session/rating'

const base = {
  wasCorrect: true,
  usedHint: false,
  responseTimeMs: 1000,
  rollingMedianMs: 1000,
  cardState: 'Learning' as const,
}

describe('rateOutcome (§8.4)', () => {
  it('wrong answer -> Again', () => {
    expect(rateOutcome({ ...base, wasCorrect: false })).toBe(1)
  })

  it('wrong answer overrides everything else (hint, timing)', () => {
    expect(
      rateOutcome({ ...base, wasCorrect: false, usedHint: true, responseTimeMs: 100 }),
    ).toBe(1)
  })

  it('correct after a hint -> Hard', () => {
    expect(rateOutcome({ ...base, usedHint: true })).toBe(2)
  })

  it('correct but slower than 2x rolling median -> Hard', () => {
    expect(rateOutcome({ ...base, responseTimeMs: 2001, rollingMedianMs: 1000 })).toBe(2)
  })

  it('correct, normal response time -> Good', () => {
    expect(rateOutcome({ ...base, responseTimeMs: 1000, rollingMedianMs: 1000 })).toBe(3)
  })

  it('correct, faster than 0.5x median, on a Review-state card -> Easy', () => {
    expect(
      rateOutcome({ ...base, responseTimeMs: 400, rollingMedianMs: 1000, cardState: 'Review' }),
    ).toBe(4)
  })

  it('fast response on a non-Review card does NOT get Easy — stays Good', () => {
    expect(
      rateOutcome({ ...base, responseTimeMs: 400, rollingMedianMs: 1000, cardState: 'Learning' }),
    ).toBe(3)
  })

  it('defaults to Good when fewer than 20 samples exist (rollingMedianMs undefined)', () => {
    expect(rateOutcome({ ...base, rollingMedianMs: undefined, responseTimeMs: 50000 })).toBe(3)
  })

  it('fuzzy/near-miss typed match -> Hard', () => {
    expect(rateOutcome({ ...base, isFuzzyMatch: true })).toBe(2)
  })

  it('hint takes priority over the Easy-eligible fast-response case', () => {
    expect(
      rateOutcome({
        ...base,
        usedHint: true,
        responseTimeMs: 400,
        rollingMedianMs: 1000,
        cardState: 'Review',
      }),
    ).toBe(2)
  })
})
