import { describe, it, expect, vi } from 'vitest'
import { IndexedDbProgressStore } from '@/storage/IndexedDbProgressStore'
import { NihongoTrailDb } from '@/storage/schema'
import { SessionPersistenceController } from '@/features/session/persistenceController'
import { buildLessonSession } from '@/features/session/sessionEngine'
import { SeededRng } from '@/lib/seededRng'
import { makeKanaPool, makeIntroLesson } from '../../helpers/fixtures'
import type { Session } from '@/types'

const NOW = new Date('2026-06-01T12:00:00.000Z')

function answerFor(session: Session): string {
  const exercise = session.exercises[session.currentIndex]
  if (exercise.type === '7.15') return 'ack'
  return exercise.options?.find((o) => o.isCorrect)?.id ?? 'a'
}

/** Simulates a browser reload: a fresh Dexie connection to the same
 * underlying database name, with no in-memory state carried over. */
function reopenApp(dbName: string): { store: IndexedDbProgressStore; controller: SessionPersistenceController } {
  const store = new IndexedDbProgressStore(dbName)
  const controller = new SessionPersistenceController({ store, clock: () => NOW })
  return { store, controller }
}

describe('Resume contract (§10.4, §10.3) — §17 highest-value test #1', () => {
  it('kills the tab at 5 different points; every reopen resumes at the correct exercise with identical options and zero lost answers', async () => {
    const dbName = `test-resume-${crypto.randomUUID()}`
    const pool = makeKanaPool()
    const lesson = makeIntroLesson()

    let { controller } = reopenApp(dbName)
    let session = buildLessonSession('resume-session', lesson, pool, new SeededRng(123), NOW)
    // Deep snapshot of the originally-resolved exercises — proves resume
    // never regenerates the sequence (§10.4), which would produce
    // different shuffled options and break the "same session" guarantee.
    const originalExercises = structuredClone(session.exercises)
    await controller.startSession(session)

    const total = session.exercises.length
    expect(total).toBeGreaterThanOrEqual(5) // otherwise this test isn't exercising 5 distinct kill points

    const killPoints = [...new Set([1, 2, Math.floor(total / 2), total - 2, total - 1])]
      .filter((n) => n > 0 && n <= total)
      .sort((a, b) => a - b)

    let answeredSoFar = 0

    for (const killAt of killPoints) {
      // Answer up to this kill point, persisting each answer as we go.
      while (answeredSoFar < killAt) {
        const result = await controller.submitAndPersist({
          session,
          rawInput: answerFor(session),
          responseTimeMs: 500,
          usedHint: false,
          script: 'hiragana',
        })
        session = result.session
        answeredSoFar += 1
      }

      const inMemoryBeforeKill = structuredClone(session)

      // "Kill the tab": drop the in-memory store/controller/session,
      // reopen a fresh connection to the same underlying database.
      const reopened = reopenApp(dbName)
      controller = reopened.controller
      const resumed = await reopened.store.getActiveSession()

      expect(resumed).toBeDefined()
      expect(resumed!.id).toBe('resume-session')
      expect(resumed!.status).toBe('active')
      expect(resumed!.currentIndex).toBe(inMemoryBeforeKill.currentIndex)
      expect(resumed!.exercises).toEqual(originalExercises) // never regenerated
      expect(resumed!.answers).toHaveLength(answeredSoFar)
      expect(resumed!.answers).toEqual(inMemoryBeforeKill.answers)

      session = resumed!
    }

    // Finish the lesson from the final resumed state.
    while (session.status === 'active') {
      const result = await controller.submitAndPersist({
        session,
        rawInput: answerFor(session),
        responseTimeMs: 500,
        usedHint: false,
        script: 'hiragana',
      })
      session = result.session
    }

    expect(session.status).toBe('completed')
    expect(session.currentIndex).toBe(total)
    expect(session.answers).toHaveLength(total)

    // One more reopen after completion: getActiveSession must not return
    // a completed session (§10.4's "cards already answered are not
    // re-shown" — a completed session is no longer "active").
    const { store: finalStore } = reopenApp(dbName)
    expect(await finalStore.getActiveSession()).toBeUndefined()
  })

  it('resuming a session with zero answers so far still reproduces the exact original exercise list', async () => {
    const dbName = `test-resume-empty-${crypto.randomUUID()}`
    const pool = makeKanaPool()
    const lesson = makeIntroLesson()

    const { controller } = reopenApp(dbName)
    const session = buildLessonSession('s-empty', lesson, pool, new SeededRng(42), NOW)
    const original = structuredClone(session.exercises)
    await controller.startSession(session)

    const { store: reopened } = reopenApp(dbName)
    const resumed = await reopened.getActiveSession()

    expect(resumed?.currentIndex).toBe(0)
    expect(resumed?.answers).toEqual([])
    expect(resumed?.exercises).toEqual(original)
  })

  it('a buffered-but-unflushed write is genuinely lost on kill — the defensive fallback has a real edge, by design', async () => {
    // This documents the honest boundary of §10.3's retry-buffer: it's an
    // in-memory defensive fallback for transient write failures, not a
    // second persistence layer. If the tab is killed before a buffered
    // write flushes, that answer's session-state-advance does not survive
    // — the resume guarantee is about successfully *persisted* answers.
    const dbName = `test-resume-buffered-loss-${crypto.randomUUID()}`
    const pool = makeKanaPool()
    const lesson = makeIntroLesson()
    const { store, controller } = reopenApp(dbName)
    let session = buildLessonSession('s-buffered', lesson, pool, new SeededRng(1), NOW)
    await controller.startSession(session)

    const db = (store as unknown as { db: NihongoTrailDb }).db
    vi.spyOn(db.sessions, 'put').mockRejectedValueOnce(new Error('write failed'))

    const result = await controller.submitAndPersist({
      session,
      rawInput: answerFor(session),
      responseTimeMs: 500,
      usedHint: false,
      script: 'hiragana',
    })
    session = result.session
    expect(result.warning).toBeDefined() // the UI would show this

    // Kill before the buffered write ever flushes.
    const { store: reopened } = reopenApp(dbName)
    const resumed = await reopened.getActiveSession()

    // The persisted state is one answer behind the in-memory state that
    // was shown to the user right before the kill — the known, documented
    // edge of the non-blocking-failure design.
    expect(resumed?.currentIndex).toBe(0)
    expect(session.currentIndex).toBe(1)
  })
})
