import { describe, it, expect, beforeEach } from 'vitest'
import { IndexedDbProgressStore } from '@/storage/IndexedDbProgressStore'
import { makeCard, makeReviewLogEntry, makeSession } from '../../helpers/fixtures'

describe('IndexedDbProgressStore — CRUD', () => {
  let store: IndexedDbProgressStore

  beforeEach(() => {
    store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
  })

  it('upserts a new card and can read it back', async () => {
    const card = makeCard()
    await store.upsertCards([card])
    const fetched = await store.getCard(card.cardId)
    expect(fetched).toEqual(card)
  })

  it('upserts update an existing card in place', async () => {
    const card = makeCard()
    await store.upsertCards([card])
    await store.upsertCards([{ ...card, stability: 42 }])
    const fetched = await store.getCard(card.cardId)
    expect(fetched?.stability).toBe(42)
    const all = await store.getDueCards(new Date('2030-01-01'), 10)
    expect(all).toHaveLength(1)
  })

  it('returns undefined for a card that does not exist', async () => {
    const fetched = await store.getCard('does-not-exist')
    expect(fetched).toBeUndefined()
  })

  it('appends review log entries and reads them back', async () => {
    const entry = makeReviewLogEntry()
    await store.appendReviewLog([entry])
    const log = await store.getReviewLog()
    expect(log).toEqual([entry])
  })

  it('getReviewLog(since) filters by reviewedAt', async () => {
    await store.appendReviewLog([
      makeReviewLogEntry({ id: '1', reviewedAt: '2026-01-01T00:00:00.000Z' }),
      makeReviewLogEntry({ id: '2', reviewedAt: '2026-02-01T00:00:00.000Z' }),
    ])
    const log = await store.getReviewLog(new Date('2026-01-15T00:00:00.000Z'))
    expect(log.map((e) => e.id)).toEqual(['2'])
  })

  it('saves and retrieves the active session', async () => {
    const session = makeSession()
    await store.saveSession(session)
    const fetched = await store.getActiveSession()
    expect(fetched).toEqual(session)
  })

  it('getActiveSession returns undefined when no session is active', async () => {
    await store.saveSession(makeSession({ status: 'completed' }))
    const fetched = await store.getActiveSession()
    expect(fetched).toBeUndefined()
  })

  it('getMeta seeds sensible defaults on first call', async () => {
    const meta = await store.getMeta()
    expect(meta.hearts).toBe(5)
    expect(meta.level).toBe(1)
    expect(meta.totalXp).toBe(0)
    expect(meta.dailyGoalXp).toBe(30)
    expect(meta.requestRetention).toBe(0.9)
  })

  it('getMeta is idempotent — does not reseed on every call', async () => {
    const first = await store.getMeta()
    await store.updateMeta({ totalXp: 100 })
    const second = await store.getMeta()
    expect(second.totalXp).toBe(100)
    expect(second.createdAt).toBe(first.createdAt)
  })

  it('updateMeta merges a partial patch', async () => {
    await store.updateMeta({ totalXp: 50, currentStreak: 3 })
    const meta = await store.getMeta()
    expect(meta.totalXp).toBe(50)
    expect(meta.currentStreak).toBe(3)
    expect(meta.hearts).toBe(5) // untouched fields survive
  })

  it('lesson progress round-trips', async () => {
    const progress = { lessonId: 'lesson-1', status: 'completed' as const, attempts: 1, bestAccuracy: 0.9 }
    await store.saveLessonProgress(progress)
    const fetched = await store.getLessonProgress('lesson-1')
    expect(fetched).toEqual(progress)
  })

  it('unit progress round-trips', async () => {
    const progress = {
      unitId: 'unit-1',
      status: 'in_progress' as const,
      averageRetrievability: 0.85,
    }
    await store.saveUnitProgress(progress)
    const fetched = await store.getUnitProgress('unit-1')
    expect(fetched).toEqual(progress)
  })

  it('daily stats round-trip', async () => {
    const entry = {
      date: '2026-01-01',
      xpEarned: 40,
      reviewsCompleted: 15,
      accuracy: 0.87,
      minutesStudied: 12,
    }
    await store.saveDailyStats(entry)
    const fetched = await store.getDailyStats('2026-01-01')
    expect(fetched).toEqual(entry)
  })

  it('sync stubs return empty results (Phase 5 no-ops in Phase 1)', async () => {
    const changes = await store.getChangesSince('cursor-1')
    expect(changes.changes).toEqual([])
    const conflicts = await store.applyRemoteChanges({ cursor: 'cursor-1', changes: [] })
    expect(conflicts.conflicts).toEqual([])
  })
})

describe('IndexedDbProgressStore — export/import round trip (Phase 0 acceptance criterion)', () => {
  it('produces byte-identical data after export then import into a fresh store', async () => {
    const source = new IndexedDbProgressStore(`test-src-${crypto.randomUUID()}`)

    await source.upsertCards([makeCard(), makeCard({ cardId: 'card-2', itemId: 'item-2' })])
    await source.appendReviewLog([makeReviewLogEntry()])
    await source.saveSession(makeSession())
    await source.saveLessonProgress({
      lessonId: 'lesson-1',
      status: 'completed',
      attempts: 1,
      bestAccuracy: 1,
    })
    await source.saveUnitProgress({
      unitId: 'unit-1',
      status: 'completed',
      averageRetrievability: 0.95,
    })
    await source.saveDailyStats({
      date: '2026-01-01',
      xpEarned: 30,
      reviewsCompleted: 10,
      accuracy: 0.9,
      minutesStudied: 10,
    })
    await source.updateMeta({ totalXp: 250, currentStreak: 5 })

    const exported = await source.exportAll()

    const dest = new IndexedDbProgressStore(`test-dst-${crypto.randomUUID()}`)
    const result = await dest.importAll(exported)
    expect(result.success).toBe(true)

    const reExported = await dest.exportAll()
    expect({ ...reExported, exportedAt: null }).toEqual({ ...exported, exportedAt: null })
  })
})
