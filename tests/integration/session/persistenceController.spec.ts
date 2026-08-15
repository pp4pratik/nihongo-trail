import { describe, it, expect, vi } from 'vitest'
import { IndexedDbProgressStore } from '@/storage/IndexedDbProgressStore'
import { NihongoTrailDb } from '@/storage/schema'
import { SessionPersistenceController } from '@/features/session/persistenceController'
import { buildLessonSession } from '@/features/session/sessionEngine'
import { SeededRng } from '@/lib/seededRng'
import { makeKanaPool, makeIntroLesson } from '../../helpers/fixtures'

const NOW = new Date('2026-06-01T12:00:00.000Z')

describe('SessionPersistenceController — §10.3 non-blocking failure + retry', () => {
  it('startSession persists immediately, before any answer', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const controller = new SessionPersistenceController({ store, clock: () => NOW })
    const session = buildLessonSession('s1', makeIntroLesson(), makeKanaPool(), new SeededRng(1), NOW)

    await controller.startSession(session)

    const active = await store.getActiveSession()
    expect(active?.id).toBe(session.id)
    expect(active?.currentIndex).toBe(0)
  })

  it('a failed write does not block the UI — the advanced session is still returned', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const db = (store as unknown as { db: NihongoTrailDb }).db
    const controller = new SessionPersistenceController({ store, clock: () => NOW })
    const session = buildLessonSession('s1', makeIntroLesson(), makeKanaPool(), new SeededRng(1), NOW)
    await controller.startSession(session)

    vi.spyOn(db.sessions, 'put').mockRejectedValueOnce(new Error('quota exceeded'))

    const result = await controller.submitAndPersist({
      session,
      rawInput: 'ack',
      responseTimeMs: 500,
      usedHint: false,
      script: 'hiragana',
    })

    expect(result.session.currentIndex).toBe(1) // advanced despite the failure
    expect(result.warning).toBeDefined()
    expect(controller.pendingCount).toBe(1)
  })

  it('the buffered write retries and succeeds on the next answer', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const db = (store as unknown as { db: NihongoTrailDb }).db
    const controller = new SessionPersistenceController({ store, clock: () => NOW })
    let session = buildLessonSession('s1', makeIntroLesson(), makeKanaPool(), new SeededRng(1), NOW)
    await controller.startSession(session)

    vi.spyOn(db.sessions, 'put').mockRejectedValueOnce(new Error('quota exceeded'))
    const first = await controller.submitAndPersist({
      session,
      rawInput: 'ack',
      responseTimeMs: 500,
      usedHint: false,
      script: 'hiragana',
    })
    session = first.session
    expect(controller.pendingCount).toBe(1)

    // Next answer: no injected failure this time — the buffered write
    // from the previous answer flushes first, then the new one persists.
    const second = await controller.submitAndPersist({
      session,
      rawInput: 'ack',
      responseTimeMs: 500,
      usedHint: false,
      script: 'hiragana',
    })

    expect(second.warning).toBeUndefined()
    expect(controller.pendingCount).toBe(0)

    const persisted = await store.getActiveSession()
    expect(persisted?.currentIndex).toBe(2) // both answers landed
  })

  it('keeps retrying in order — an older buffered write is not skipped for a newer one', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const db = (store as unknown as { db: NihongoTrailDb }).db
    const controller = new SessionPersistenceController({ store, clock: () => NOW })
    let session = buildLessonSession('s1', makeIntroLesson(), makeKanaPool(), new SeededRng(1), NOW)
    await controller.startSession(session)

    // 3 rejections: r1's own write, r2's flush-attempt of r1's buffered
    // write, and r2's own write — so both r1 and r2 end up buffered.
    const putSpy = vi.spyOn(db.sessions, 'put')
    putSpy.mockRejectedValueOnce(new Error('fail 1'))
    putSpy.mockRejectedValueOnce(new Error('fail 2'))
    putSpy.mockRejectedValueOnce(new Error('fail 3'))

    const r1 = await controller.submitAndPersist({
      session,
      rawInput: 'ack',
      responseTimeMs: 500,
      usedHint: false,
      script: 'hiragana',
    })
    session = r1.session
    const r2 = await controller.submitAndPersist({
      session,
      rawInput: 'ack',
      responseTimeMs: 500,
      usedHint: false,
      script: 'hiragana',
    })
    session = r2.session

    expect(controller.pendingCount).toBe(2)

    // Nothing rejects from here — r3's call flushes both buffered writes
    // (oldest first) before attempting its own.
    const r3 = await controller.submitAndPersist({
      session,
      rawInput: 'ack',
      responseTimeMs: 500,
      usedHint: false,
      script: 'hiragana',
    })

    expect(r3.warning).toBeUndefined()
    expect(controller.pendingCount).toBe(0)
    const persisted = await store.getActiveSession()
    expect(persisted?.currentIndex).toBe(3) // 3 answers submitted, all landed
  })
})
