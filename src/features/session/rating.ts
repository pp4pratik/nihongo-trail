// §8.4 rating mapping: FSRS ratings are always derived from exercise
// outcomes, never self-rated by the learner.

import type { FsrsState } from '@/types'

export interface RateOutcomeParams {
  wasCorrect: boolean
  usedHint: boolean
  responseTimeMs: number
  /** undefined until 20 samples exist for this exercise type (§8.4). */
  rollingMedianMs: number | undefined
  cardState: FsrsState
  /** §7.5-style fuzzy/near-miss typed match — not produced by any Phase 1
   * exercise type, included for forward compatibility. */
  isFuzzyMatch?: boolean
}

export type SrsRating = 1 | 2 | 3 | 4 // Again, Hard, Good, Easy

export function rateOutcome(params: RateOutcomeParams): SrsRating {
  if (!params.wasCorrect) return 1 // Again

  if (params.isFuzzyMatch) return 2 // Hard
  if (params.usedHint) return 2 // Hard

  if (params.rollingMedianMs === undefined) return 3 // Good — insufficient samples

  if (params.responseTimeMs > params.rollingMedianMs * 2) return 2 // Hard

  if (params.responseTimeMs < params.rollingMedianMs * 0.5 && params.cardState === 'Review') {
    return 4 // Easy
  }

  return 3 // Good
}
