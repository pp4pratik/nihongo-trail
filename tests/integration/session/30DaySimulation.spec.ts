import { describe, it, expect } from 'vitest'
import { IndexedDbProgressStore } from '@/storage/IndexedDbProgressStore'
import { createFsrsScheduler, createNewCard, scheduleReview } from '@/features/srs/fsrsClient'
import { rateOutcome } from '@/features/session/rating'
import { makeKanaPool } from '../../helpers/fixtures'
import type { Grade } from 'ts-fsrs'

// §16 Phase 1 acceptance criterion: "Due-card queue is correct after
// simulating 30 days of reviews with a fake clock."

describe('30-day due-queue simulation (§16 Phase 1 acceptance criterion)', () => {
  it('the due-card queue stays correct across 30 simulated days — no lost cards, no premature/late surfacing', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const scheduler = createFsrsScheduler()
    const pool = makeKanaPool()

    let fakeNow = new Date('2026-01-01T04:00:00.000Z') // §15.6: study-day boundary at local 04:00

    // Seed one card per pool item, all New, introduced on day 0.
    const allCardIds = pool.map((item) => `${item.id}::recognise`)
    for (const item of pool) {
      const card = createNewCard(fakeNow, {
        cardId: `${item.id}::recognise`,
        itemId: item.id,
        itemType: 'kana',
        direction: 'recognise',
        introducedAt: fakeNow.toISOString(),
        isLeech: false,
        isSuspended: false,
      })
      await store.upsertCards([card])
    }

    let totalReviews = 0
    const seenCardIds = new Set<string>()

    for (let day = 0; day < 30; day++) {
      // §15.2: queue building must use the due index — getDueCards already
      // does (verified separately in getDueCards.perf.spec.ts). Here we
      // check the *contents* are correct, not just the query mechanics.
      const due = await store.getDueCards(fakeNow, 100)

      // Every returned card must actually be due (not surfaced early).
      for (const card of due) {
        expect(new Date(card.due).getTime()).toBeLessThanOrEqual(fakeNow.getTime())
      }

      for (const card of due) {
        seenCardIds.add(card.cardId)
        // Alternate correct/incorrect deterministically so both scheduling
        // branches (stability growth vs. lapse-and-relearn) get exercised
        // over the 30 days, rather than only ever testing the happy path.
        const wasCorrect = totalReviews % 3 !== 0 // ~2/3 correct, 1/3 wrong
        const rating = rateOutcome({
          wasCorrect,
          usedHint: false,
          responseTimeMs: 1000,
          rollingMedianMs: undefined, // <20 samples for most of this run — defaults to Good
          cardState: card.state,
        })

        const { card: updatedCard, reviewLog } = scheduleReview(
          scheduler,
          card,
          fakeNow,
          rating as Grade,
        )

        await store.persistAnswer({
          card: updatedCard,
          reviewLogEntry: {
            id: crypto.randomUUID(),
            cardId: card.cardId,
            reviewedAt: fakeNow.toISOString(),
            rating: rating as 1 | 2 | 3 | 4,
            state: card.state,
            elapsedDays: reviewLog.elapsed_days,
            scheduledDays: reviewLog.scheduled_days,
            exerciseType: '7.1',
            responseTimeMs: 1000,
            wasCorrect,
            usedHint: false,
            sessionId: `day-${day}`,
          },
          session: {
            id: `sim-session-${day}`,
            schemaVersion: 1,
            kind: 'review',
            startedAt: fakeNow.toISOString(),
            lastActiveAt: fakeNow.toISOString(),
            status: 'completed',
            completedAt: fakeNow.toISOString(),
            exercises: [],
            currentIndex: 0,
            answers: [],
            xpEarned: 0,
            heartsLost: 0,
            correctCount: wasCorrect ? 1 : 0,
            incorrectCount: wasCorrect ? 0 : 1,
          },
        })
        totalReviews += 1
      }

      fakeNow = new Date(fakeNow.getTime() + 24 * 60 * 60 * 1000)
    }

    // No card was lost across 30 days of scheduling churn.
    for (const cardId of allCardIds) {
      expect(await store.getCard(cardId)).toBeDefined()
    }

    // Every card was reviewed at least once over 30 days (all started due
    // immediately and none has a 30-day interval this early in its life).
    expect(seenCardIds.size).toBe(allCardIds.length)

    // The review log has exactly one entry per review actually performed —
    // no duplicate or dropped log rows.
    const log = await store.getReviewLog()
    expect(log).toHaveLength(totalReviews)

    // Some cards should have graduated out of New by day 30 given ~2/3
    // correct answers — the queue isn't stuck re-surfacing the same New
    // cards forever.
    const finalCards = await Promise.all(allCardIds.map((id) => store.getCard(id)))
    const stillNew = finalCards.filter((c) => c?.state === 'New').length
    expect(stillNew).toBeLessThan(allCardIds.length)
  })

  it('due-card queue never exceeds a sane size and respects the requested limit', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const now = new Date('2026-01-01T04:00:00.000Z')

    // 200 cards all due immediately, far beyond a normal day's load.
    const cards = Array.from({ length: 200 }, (_, i) =>
      createNewCard(now, {
        cardId: `card-${i}`,
        itemId: `item-${i}`,
        itemType: 'kana',
        direction: 'recognise',
        introducedAt: now.toISOString(),
        isLeech: false,
        isSuspended: false,
      }),
    )
    await store.upsertCards(cards)

    const due = await store.getDueCards(now, 60) // §4.2: queue cap at steady state
    expect(due).toHaveLength(60)
    expect(new Set(due.map((c) => c.cardId)).size).toBe(60) // no duplicates
  })
})
