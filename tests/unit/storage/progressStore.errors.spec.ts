import { describe, it, expect, vi } from 'vitest'
import { IndexedDbProgressStore } from '@/storage/IndexedDbProgressStore'
import { NihongoTrailDb } from '@/storage/schema'
import { makeCard, makeReviewLogEntry } from '../../helpers/fixtures'

// Test gap 3 from /plan-eng-review: a failed Dexie write must propagate as
// a thrown error from ProgressStore, never swallowed. The store has no
// internal retry/buffer — that's the caller's job (see the Phase 0
// Architecture diagram in the design doc).

describe('IndexedDbProgressStore — write-failure propagation', () => {
  it('upsertCards rejects when the underlying Dexie write fails', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const db = (store as unknown as { db: NihongoTrailDb }).db
    const quotaError = new Error('QuotaExceededError: storage quota exceeded')
    vi.spyOn(db.cards, 'bulkPut').mockRejectedValueOnce(quotaError)

    await expect(store.upsertCards([makeCard()])).rejects.toThrow(quotaError)
  })

  it('appendReviewLog rejects when the underlying Dexie write fails', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const db = (store as unknown as { db: NihongoTrailDb }).db
    const quotaError = new Error('QuotaExceededError: storage quota exceeded')
    vi.spyOn(db.reviewLog, 'bulkAdd').mockRejectedValueOnce(quotaError)

    await expect(store.appendReviewLog([makeReviewLogEntry()])).rejects.toThrow(quotaError)
  })

  it('updateMeta rejects when the underlying Dexie write fails', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    await store.getMeta() // seed the default record first
    const db = (store as unknown as { db: NihongoTrailDb }).db
    vi.spyOn(db.meta, 'put').mockRejectedValueOnce(new Error('write failed'))

    await expect(store.updateMeta({ totalXp: 10 })).rejects.toThrow('write failed')
  })
})

// Test gap 3: reviewLog is append-only — the public interface exposes no
// update or delete path. This is a compile-time/shape guarantee, verified
// here by asserting the interface's method list, plus a runtime check that
// re-appending a colliding id is rejected rather than silently overwriting
// (bulkAdd, not bulkPut).
describe('IndexedDbProgressStore — append-only reviewLog', () => {
  it('exposes no update or delete method for the review log', () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const proto = Object.getPrototypeOf(store) as object
    const methodNames = Object.getOwnPropertyNames(proto)
    const reviewLogMethods = methodNames.filter((name) => /reviewlog/i.test(name))
    expect(reviewLogMethods.sort()).toEqual(['appendReviewLog', 'getReviewLog'])
  })

  it('rejects re-appending an entry with a colliding id rather than silently overwriting it', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const entry = makeReviewLogEntry({ id: 'dup-1', wasCorrect: true })
    await store.appendReviewLog([entry])

    await expect(
      store.appendReviewLog([{ ...entry, wasCorrect: false }]),
    ).rejects.toThrow()

    const log = await store.getReviewLog()
    expect(log).toHaveLength(1)
    expect(log[0].wasCorrect).toBe(true) // original entry untouched
  })
})
