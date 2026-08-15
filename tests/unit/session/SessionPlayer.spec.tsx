import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionPlayer } from '@/features/session/SessionPlayer'
import { SessionPersistenceController } from '@/features/session/persistenceController'
import { IndexedDbProgressStore } from '@/storage/IndexedDbProgressStore'
import { buildLessonSession, submitAnswer } from '@/features/session/sessionEngine'
import { SeededRng } from '@/lib/seededRng'
import { makeKanaPool, makeIntroLesson } from '../../helpers/fixtures'
import type { Session } from '@/types'

const NOW = new Date('2026-06-01T12:00:00.000Z')

function setup() {
  const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
  const controller = new SessionPersistenceController({ store, clock: () => NOW })
  const pool = makeKanaPool()
  const lesson = makeIntroLesson()
  const session = buildLessonSession('s1', lesson, pool, new SeededRng(1), NOW)
  return { store, controller, pool, session }
}

describe('SessionPlayer', () => {
  it('renders the teaching card first and advances on "Got it" without gating on feedback', async () => {
    const { controller, session } = setup()
    expect(session.exercises[0].type).toBe('7.15')

    let current = session
    const onSessionChange = (s: Session) => {
      current = s
    }

    render(
      <SessionPlayer
        session={current}
        script="hiragana"
        controller={controller}
        onSessionChange={onSessionChange}
        onComplete={() => {}}
      />,
    )

    await userEvent.click(screen.getByText('Got it'))
    await waitFor(() => expect(current.currentIndex).toBe(1))
  })

  it('a wrong MC answer shows feedback and requires an explicit Continue tap before advancing (§14.2)', async () => {
    const { store, controller, session: initialSession } = setup()

    // Answer every teaching card first (engine-level, not via UI) to reach
    // the first genuinely graded exercise.
    let session = initialSession
    while (session.exercises[session.currentIndex]?.type === '7.15') {
      const result = await submitAnswer(
        { store, clock: () => NOW },
        { session, rawInput: 'ack', responseTimeMs: 100, usedHint: false, script: 'hiragana' },
      )
      session = result.session
    }
    expect(session.exercises[session.currentIndex].type).toBe('7.1')

    let current = session
    const onSessionChange = (s: Session) => {
      current = s
    }

    render(
      <SessionPlayer
        session={current}
        script="hiragana"
        controller={controller}
        onSessionChange={onSessionChange}
        onComplete={() => {}}
      />,
    )

    const exercise = current.exercises[current.currentIndex]
    const wrongOption = exercise.options!.find((o) => !o.isCorrect)!
    await userEvent.click(screen.getByText(wrongOption.text))

    await waitFor(() => expect(screen.getByText('Not quite')).toBeInTheDocument())
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })

  it('regression: does not advance to the next exercise underneath the feedback panel until Continue is tapped', async () => {
    // Caught via manual browser verification: onSessionChange was called
    // immediately on a wrong answer (not just on correct/teaching-card),
    // so the parent's `session` prop advanced right away — the feedback
    // panel showed the just-answered exercise's correct answer while the
    // exercise rendered underneath it had already jumped to the next one.
    const { store, controller, session: initialSession } = setup()

    let session = initialSession
    while (session.exercises[session.currentIndex]?.type === '7.15') {
      const result = await submitAnswer(
        { store, clock: () => NOW },
        { session, rawInput: 'ack', responseTimeMs: 100, usedHint: false, script: 'hiragana' },
      )
      session = result.session
    }

    const answeredExercise = session.exercises[session.currentIndex]
    const answeredPrompt = answeredExercise.prompt.text
    const nextExercise = session.exercises[session.currentIndex + 1]

    let current = session
    let onSessionChangeCallCount = 0
    const onSessionChange = (s: Session) => {
      onSessionChangeCallCount += 1
      current = s
    }

    render(
      <SessionPlayer
        session={current}
        script="hiragana"
        controller={controller}
        onSessionChange={onSessionChange}
        onComplete={() => {}}
      />,
    )

    const wrongOption = answeredExercise.options!.find((o) => !o.isCorrect)!
    await userEvent.click(screen.getByText(wrongOption.text))
    await waitFor(() => expect(screen.getByText('Not quite')).toBeInTheDocument())

    // The parent must not have been told to advance yet.
    expect(onSessionChangeCallCount).toBe(0)
    expect(current.currentIndex).toBe(session.currentIndex)
    // The prompt still showing is the one that was just answered, not the
    // next exercise's — even though the persisted session already advanced.
    if (answeredPrompt && nextExercise?.prompt.text !== answeredPrompt) {
      expect(screen.getByText(answeredPrompt)).toBeInTheDocument()
    }

    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => expect(onSessionChangeCallCount).toBe(1))
    expect(current.currentIndex).toBe(session.currentIndex + 1)
  })
})
