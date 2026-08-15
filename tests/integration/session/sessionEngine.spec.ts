import { describe, it, expect } from 'vitest'
import { IndexedDbProgressStore } from '@/storage/IndexedDbProgressStore'
import { buildLessonSession, submitAnswer } from '@/features/session/sessionEngine'
import { SeededRng } from '@/lib/seededRng'
import { makeKanaPool, makeIntroLesson } from '../../helpers/fixtures'

const NOW = new Date('2026-06-01T12:00:00.000Z')

function makeDeps(store: IndexedDbProgressStore) {
  return { store, clock: () => NOW }
}

describe('buildLessonSession', () => {
  it('produces an active session with a resolved exercise list', () => {
    const pool = makeKanaPool()
    const lesson = makeIntroLesson()
    const session = buildLessonSession('session-1', lesson, pool, new SeededRng(1), NOW)

    expect(session.status).toBe('active')
    expect(session.currentIndex).toBe(0)
    expect(session.lessonId).toBe(lesson.id)
    expect(session.exercises.length).toBeGreaterThan(0)
  })
})

describe('submitAnswer — teaching card (§7.15)', () => {
  it('creates both recognise and produce cards in New state, advances the session, does not rate', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const pool = makeKanaPool()
    const lesson = makeIntroLesson()
    let session = buildLessonSession('session-1', lesson, pool, new SeededRng(1), NOW)

    // Find the first teaching card in the resolved order.
    expect(session.exercises[session.currentIndex].type).toBe('7.15')
    const itemId = session.exercises[session.currentIndex].itemId

    const result = await submitAnswer(makeDeps(store), {
      session,
      rawInput: 'ack',
      responseTimeMs: 500,
      usedHint: false,
      script: 'hiragana',
    })
    session = result.session

    expect(session.currentIndex).toBe(1)
    expect(result.card).toBeUndefined() // teaching card doesn't return a single card
    expect(result.reviewLogEntry).toBeUndefined()

    const recognise = await store.getCard(`${itemId}::recognise`)
    const produce = await store.getCard(`${itemId}::produce`)
    expect(recognise?.state).toBe('New')
    expect(produce?.state).toBe('New')
  })

  it('does not recreate cards that already exist', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const pool = makeKanaPool()
    const lesson = makeIntroLesson()
    let session = buildLessonSession('session-1', lesson, pool, new SeededRng(1), NOW)
    const itemId = session.exercises[0].itemId

    const first = await submitAnswer(makeDeps(store), {
      session,
      rawInput: 'ack',
      responseTimeMs: 500,
      usedHint: false,
      script: 'hiragana',
    })
    const before = await store.getCard(`${itemId}::recognise`)

    // Re-teach the same item (e.g. a Relearning re-teach card, §8.9) —
    // should not stomp the existing card's progress.
    session = { ...first.session, currentIndex: 0 }
    await submitAnswer(makeDeps(store), {
      session,
      rawInput: 'ack',
      responseTimeMs: 500,
      usedHint: false,
      script: 'hiragana',
    })
    const after = await store.getCard(`${itemId}::recognise`)
    expect(after).toEqual(before)
  })
})

describe('submitAnswer — graded exercise', () => {
  async function teachAllItems(store: IndexedDbProgressStore, session: ReturnType<typeof buildLessonSession>) {
    let s = session
    while (s.currentIndex < s.exercises.length && s.exercises[s.currentIndex].type === '7.15') {
      const result = await submitAnswer(makeDeps(store), {
        session: s,
        rawInput: 'ack',
        responseTimeMs: 500,
        usedHint: false,
        script: 'hiragana',
      })
      s = result.session
    }
    return s
  }

  it('a correct answer produces a Good rating, schedules the card forward, and logs the review', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const pool = makeKanaPool()
    const lesson = makeIntroLesson()
    let session = buildLessonSession('session-1', lesson, pool, new SeededRng(1), NOW)
    session = await teachAllItems(store, session)

    const exercise = session.exercises[session.currentIndex]
    expect(exercise.type).not.toBe('7.15')
    const correctOptionId = exercise.options?.find((o) => o.isCorrect)?.id
    expect(correctOptionId).toBeDefined()

    const before = await store.getCard(exercise.cardId!)
    const result = await submitAnswer(makeDeps(store), {
      session,
      rawInput: correctOptionId!,
      responseTimeMs: 1000,
      usedHint: false,
      script: 'hiragana',
    })

    expect(result.srsRating).toBe(3) // Good (insufficient rolling-median samples)
    expect(result.reviewLogEntry?.wasCorrect).toBe(true)
    expect(result.card?.reps).toBe((before?.reps ?? 0) + 1)
    expect(result.session.correctCount).toBe(1)
    expect(result.session.xpEarned).toBe(10)
  })

  it('a wrong answer produces an Again rating and increments incorrectCount, not correctCount', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const pool = makeKanaPool()
    const lesson = makeIntroLesson()
    let session = buildLessonSession('session-1', lesson, pool, new SeededRng(1), NOW)
    session = await teachAllItems(store, session)

    const exercise = session.exercises[session.currentIndex]
    const wrongOptionId = exercise.options?.find((o) => !o.isCorrect)?.id

    const result = await submitAnswer(makeDeps(store), {
      session,
      rawInput: wrongOptionId!,
      responseTimeMs: 1000,
      usedHint: false,
      script: 'hiragana',
    })

    expect(result.srsRating).toBe(1) // Again
    expect(result.reviewLogEntry?.wasCorrect).toBe(false)
    expect(result.session.incorrectCount).toBe(1)
    expect(result.session.correctCount).toBe(0)
    expect(result.session.xpEarned).toBe(0)
  })

  it('marks the session completed once every exercise has been answered', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const pool = makeKanaPool()
    const lesson = makeIntroLesson()
    let session = buildLessonSession('session-1', lesson, pool, new SeededRng(1), NOW)

    while (session.status === 'active') {
      const exercise = session.exercises[session.currentIndex]
      const rawInput =
        exercise.type === '7.15'
          ? 'ack'
          : (exercise.options?.find((o) => o.isCorrect)?.id ?? 'a')
      const result = await submitAnswer(makeDeps(store), {
        session,
        rawInput,
        responseTimeMs: 1000,
        usedHint: false,
        script: 'hiragana',
      })
      session = result.session
    }

    expect(session.status).toBe('completed')
    expect(session.completedAt).toBeDefined()
    expect(session.currentIndex).toBe(session.exercises.length)
  })
})
