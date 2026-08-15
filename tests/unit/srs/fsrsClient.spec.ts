import { describe, it, expect } from 'vitest'
import { createEmptyCard, State, type Card, type Grade, type FSRS } from 'ts-fsrs'
import {
  createFsrsScheduler,
  createNewCard,
  toFsrsCardInput,
  toAppCard,
  scheduleReview,
  getRetrievability,
  type SrsCardIdentity,
} from '@/features/srs/fsrsClient'
import type { SrsCard, FsrsState } from '@/types'

const IDENTITY: SrsCardIdentity = {
  cardId: 'word:jmdict:1::recognise',
  itemId: 'word:jmdict:1',
  itemType: 'word',
  direction: 'recognise',
  introducedAt: '2026-01-01T00:00:00.000Z',
  isLeech: false,
  isSuspended: false,
}

const AGAIN = 1 as Grade
const HARD = 2 as Grade
const GOOD = 3 as Grade
const EASY = 4 as Grade
const GRADES: Array<{ name: string; value: Grade }> = [
  { name: 'Again', value: AGAIN },
  { name: 'Hard', value: HARD },
  { name: 'Good', value: GOOD },
  { name: 'Easy', value: EASY },
]

/**
 * Drives a real ts-fsrs card through actual transitions to reach the
 * requested starting state, rather than hand-fabricating field values that
 * might not be internally consistent (e.g. a "Review" card with a
 * scheduled_days that doesn't match its stability). Returns the card
 * alongside the timestamp it was last reviewed at, so the caller can pick
 * a subsequent review time that's guaranteed to be later (ts-fsrs rejects
 * a negative elapsed time between reviews).
 */
function buildStartingCard(
  scheduler: FSRS,
  targetState: FsrsState,
  now: Date,
): { card: SrsCard; lastReviewedAt: Date } {
  let card: Card = createEmptyCard(now)
  let t = now
  if (targetState === 'New') return { card: toAppCard(card, IDENTITY), lastReviewedAt: t }

  // One Hard rating: stays in Learning.
  card = scheduler.next(card, t, HARD).card
  if (targetState === 'Learning') return { card: toAppCard(card, IDENTITY), lastReviewedAt: t }

  // Repeated Good ratings, each past the previous step's due date, until
  // the card graduates to Review.
  for (let i = 0; i < 5 && card.state !== State.Review; i++) {
    t = new Date(t.getTime() + 24 * 60 * 60 * 1000)
    card = scheduler.next(card, t, GOOD).card
  }
  if (targetState === 'Review') return { card: toAppCard(card, IDENTITY), lastReviewedAt: t }

  // From Review, an Again lapses into Relearning.
  t = new Date(t.getTime() + 24 * 60 * 60 * 1000)
  card = scheduler.next(card, t, AGAIN).card
  return { card: toAppCard(card, IDENTITY), lastReviewedAt: t }
}

const STATES: FsrsState[] = ['New', 'Learning', 'Review', 'Relearning']
const now = new Date('2026-06-01T12:00:00.000Z')

describe('fsrsClient — 4x4 rating/state matrix vs ts-fsrs reference', () => {
  // Fuzz is disabled for this test only: §8.3 enables fuzz in the real app,
  // but ts-fsrs's fuzz uses Math.random() unless a seed strategy is
  // registered, which would make an exact reference comparison flaky. The
  // goal here is verifying the wrapper's conversion doesn't corrupt the
  // computation, not testing fuzz — a swapped rating value would fail this
  // regardless of fuzz.
  describe.each(STATES)('starting state: %s', (state) => {
    it.each(GRADES)('rating $name matches a direct ts-fsrs call exactly', ({ value }) => {
      const scheduler = createFsrsScheduler({ enable_fuzz: false })
      const { card: startingCard, lastReviewedAt } = buildStartingCard(scheduler, state, now)
      const reviewAt = new Date(lastReviewedAt.getTime() + 25 * 60 * 60 * 1000)

      const reference = scheduler.next(toFsrsCardInput(startingCard), reviewAt, value)
      const actual = scheduleReview(scheduler, startingCard, reviewAt, value)

      expect(actual.card.stability).toBeCloseTo(reference.card.stability, 10)
      expect(actual.card.difficulty).toBeCloseTo(reference.card.difficulty, 10)
      expect(actual.card.due).toBe(reference.card.due.toISOString())
      expect(actual.card.scheduledDays).toBe(reference.card.scheduled_days)
      expect(actual.card.learningStep).toBe(reference.card.learning_steps)
      expect(actual.card.reps).toBe(reference.card.reps)
      expect(actual.card.lapses).toBe(reference.card.lapses)
      expect(actual.card.state).toBe(State[reference.card.state])
      expect(actual.reviewLog.rating).toBe(value)
    })
  })
})

describe('fsrsClient — createNewCard', () => {
  it('creates a card in the New state', () => {
    const card = createNewCard(now, IDENTITY)
    expect(card.state).toBe('New')
    expect(card.reps).toBe(0)
    expect(card.lapses).toBe(0)
    expect(card.cardId).toBe(IDENTITY.cardId)
  })
})

describe('fsrsClient — getRetrievability', () => {
  it('returns 1 (or very close) immediately after review', () => {
    const scheduler = createFsrsScheduler()
    const { card: startingCard, lastReviewedAt } = buildStartingCard(scheduler, 'Review', now)
    const r = getRetrievability(scheduler, startingCard, lastReviewedAt)
    expect(r).toBeGreaterThan(0.9)
    expect(r).toBeLessThanOrEqual(1)
  })

  it('decreases as elapsed time since due grows', () => {
    const scheduler = createFsrsScheduler()
    const { card: startingCard, lastReviewedAt } = buildStartingCard(scheduler, 'Review', now)
    const soon = getRetrievability(scheduler, startingCard, lastReviewedAt)
    const later = getRetrievability(
      scheduler,
      startingCard,
      new Date(lastReviewedAt.getTime() + 60 * 24 * 60 * 60 * 1000),
    )
    expect(later).toBeLessThan(soon)
  })
})
