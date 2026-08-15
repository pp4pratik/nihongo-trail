import { describe, it, expect, vi } from 'vitest'
import { IndexedDbProgressStore } from '@/storage/IndexedDbProgressStore'
import { NihongoTrailDb } from '@/storage/schema'
import { makeCard, makeReviewLogEntry, makeSession } from '../../helpers/fixtures'

describe('IndexedDbProgressStore.persistAnswer (§10.3 single-transaction write)', () => {
  it('writes card, review log, session, and meta patch atomically', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    await store.getMeta() // seed defaults

    const card = makeCard({ stability: 3 })
    const entry = makeReviewLogEntry()
    const session = makeSession({ currentIndex: 1 })

    await store.persistAnswer({
      card,
      reviewLogEntry: entry,
      session,
      metaPatch: { totalXp: 10 },
    })

    expect(await store.getCard(card.cardId)).toEqual(card)
    expect(await store.getReviewLog()).toEqual([entry])
    expect(await store.getActiveSession()).toEqual(session)
    expect((await store.getMeta()).totalXp).toBe(10)
  })

  it('omits card and reviewLogEntry for a teaching card (only session advances)', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const session = makeSession({ currentIndex: 1 })

    await store.persistAnswer({ session })

    expect(await store.getActiveSession()).toEqual(session)
    expect(await store.getReviewLog()).toEqual([])
  })

  it('rejects and writes nothing when any part of the transaction fails', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const db = (store as unknown as { db: NihongoTrailDb }).db
    vi.spyOn(db.sessions, 'put').mockRejectedValueOnce(new Error('write failed'))

    const card = makeCard()
    await expect(
      store.persistAnswer({ card, session: makeSession() }),
    ).rejects.toThrow('write failed')

    // The card write must not have survived either — same transaction.
    expect(await store.getCard(card.cardId)).toBeUndefined()
  })
})
