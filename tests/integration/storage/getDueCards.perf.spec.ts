import { describe, it, expect, vi } from 'vitest'
import { IndexedDbProgressStore } from '@/storage/IndexedDbProgressStore'
import { NihongoTrailDb } from '@/storage/schema'
import { makeCard } from '../../helpers/fixtures'
import type { SrsCard } from '@/types'

// Performance issue from /plan-eng-review: §15.2 requires the review queue
// build to use the `due` index, not a full-table scan, and to complete
// under 200ms at steady-state (~2,600 cards). This catches an index-usage
// regression at the point it would be introduced (Phase 0), not three
// phases later once real content volume exists to expose it.

function syntheticCards(count: number, now: Date): SrsCard[] {
  const cards: SrsCard[] = []
  for (let i = 0; i < count; i++) {
    // Half due in the past, half due in the future, spread across states.
    const dueOffsetMs = (i % 2 === 0 ? -1 : 1) * i * 60 * 1000
    cards.push(
      makeCard({
        cardId: `card-${i}`,
        itemId: `item-${i}`,
        due: new Date(now.getTime() + dueOffsetMs).toISOString(),
        state: (['New', 'Learning', 'Review', 'Relearning'] as const)[i % 4],
      }),
    )
  }
  return cards
}

describe('IndexedDbProgressStore.getDueCards — performance and index usage', () => {
  it('uses the `due` index, not a full-collection scan', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const db = (store as unknown as { db: NihongoTrailDb }).db
    const whereSpy = vi.spyOn(db.cards, 'where')
    const toArraySpy = vi.spyOn(db.cards, 'toArray')

    await store.getDueCards(new Date(), 60)

    expect(whereSpy).toHaveBeenCalledWith('due')
    // toArray() on the whole collection (a full scan) must never be called
    // by getDueCards — only the indexed query's own .toArray() runs, which
    // is a different call chain (Collection#toArray, not Table#toArray).
    expect(toArraySpy).not.toHaveBeenCalled()
  })

  it('completes well under the 200ms budget for a ~3,000-card deck', async () => {
    const now = new Date('2026-06-01T12:00:00.000Z')
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    await store.upsertCards(syntheticCards(3000, now))

    const start = performance.now()
    const due = await store.getDueCards(now, 60)
    const elapsedMs = performance.now() - start

    expect(due.length).toBeGreaterThan(0)
    expect(due.length).toBeLessThanOrEqual(60)
    expect(elapsedMs).toBeLessThan(200)
  })

  it('excludes suspended cards even when they are due', async () => {
    const now = new Date('2026-06-01T12:00:00.000Z')
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    await store.upsertCards([
      makeCard({ cardId: 'due-active', due: '2026-01-01T00:00:00.000Z', isSuspended: false }),
      makeCard({ cardId: 'due-suspended', due: '2026-01-01T00:00:00.000Z', isSuspended: true }),
    ])

    const due = await store.getDueCards(now, 10)
    expect(due.map((c) => c.cardId)).toEqual(['due-active'])
  })
})
