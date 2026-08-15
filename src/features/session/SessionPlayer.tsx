// Orchestrates the exercise components against the session engine +
// persistence controller (§14.2 session screen). Feedback on a wrong
// answer requires an explicit tap to continue — "auto-advance on error
// means the correction is never read" (§14.2). Matching-pairs groups are
// their own continuous flow and don't use the tap-to-continue gate.

import { useCallback, useState } from 'react'
import type { Session, ResolvedExercise } from '@/types'
import type { SessionPersistenceController } from './persistenceController'
import type { KanaScript } from '@/lib/romajiKana'
import { MultipleChoiceExercise } from '@/features/exercises/MultipleChoiceExercise'
import { TypingExercise } from '@/features/exercises/TypingExercise'
import { MatchingExercise } from '@/features/exercises/MatchingExercise'
import { TeachingCard } from '@/features/exercises/TeachingCard'

export interface SessionPlayerProps {
  session: Session
  script: KanaScript
  controller: SessionPersistenceController
  onSessionChange: (session: Session) => void
  onComplete: (session: Session) => void
}

interface PendingFeedback {
  wasCorrect: boolean
  correctText: string
  acceptedRomaji: string[]
  /** The already-persisted, advanced session — applied via onSessionChange
   * only once the learner taps Continue (§14.2). Held here rather than
   * pushed immediately so `exercise` (derived from the `session` prop)
   * keeps referring to the just-answered exercise while its feedback is
   * still on screen, instead of jumping to the next one underneath it. */
  nextSession: Session
}

function collectMatchingGroup(session: Session): ResolvedExercise[] {
  const start = session.currentIndex
  const groupId = session.exercises[start]?.groupId
  if (!groupId) return [session.exercises[start]]
  const group: ResolvedExercise[] = []
  for (let i = start; i < session.exercises.length; i++) {
    if (session.exercises[i].groupId !== groupId) break
    group.push(session.exercises[i])
  }
  return group
}

export function SessionPlayer({
  session,
  script,
  controller,
  onSessionChange,
  onComplete,
}: SessionPlayerProps) {
  const [feedback, setFeedback] = useState<PendingFeedback | null>(null)
  const [responseStartedAt, setResponseStartedAt] = useState(() => Date.now())

  const exercise = session.exercises[session.currentIndex]

  // Event-handler callbacks (invoked from onClick, never during render) —
  // useCallback marks that clearly for the compiler/lint's purity check,
  // which otherwise can't tell an inline closure from actual render logic.
  // Declared unconditionally (rules-of-hooks) — `exercise` may be
  // undefined only in the impossible-in-practice case of a stale/empty
  // session, guarded below before this is ever invoked.
  const answer = useCallback(
    async (rawInput: string) => {
      if (!exercise) return
      const responseTimeMs = Date.now() - responseStartedAt
      const result = await controller.submitAndPersist({
        session,
        rawInput,
        responseTimeMs,
        usedHint: false,
        script,
      })

      if (result.session.status === 'completed') {
        onComplete(result.session)
        return
      }

      const wasCorrect =
        result.session.answers[result.session.answers.length - 1]?.wasCorrect ?? true
      const correctText = Array.isArray(exercise.correctAnswer)
        ? exercise.correctAnswer[0]
        : exercise.correctAnswer

      if (exercise.type === '7.15' || exercise.type === '7.12' || wasCorrect) {
        // Teaching cards, matching pairs, and correct answers advance
        // immediately. Matching pairs handle their own brief inline
        // right/wrong flash (MatchingExercise) rather than the full-screen
        // gate — §7.12 frames matching as a fast "efficient warm-up," and
        // it's single-shot per pair (§8.4: a wrong tap is real Again
        // signal, recorded immediately, never silently retried). Only a
        // wrong MC/typing answer gates on an explicit "Continue" tap (§14.2).
        onSessionChange(result.session)
        setResponseStartedAt(Date.now())
      } else {
        // Deliberately NOT calling onSessionChange yet — see PendingFeedback's
        // nextSession doc comment. Applied only from continueAfterFeedback.
        setFeedback({
          wasCorrect,
          correctText,
          acceptedRomaji: exercise.acceptedAnswers ?? [],
          nextSession: result.session,
        })
      }
    },
    [controller, session, script, exercise, responseStartedAt, onComplete, onSessionChange],
  )

  const continueAfterFeedback = useCallback(() => {
    if (feedback) onSessionChange(feedback.nextSession)
    setFeedback(null)
    setResponseStartedAt(Date.now())
  }, [feedback, onSessionChange])

  if (!exercise) return null

  if (exercise.type === '7.12') {
    const group = collectMatchingGroup(session)
    return (
      <MatchingExercise
        exercises={group}
        onPair={(_pairExercise, selectedRomaji) => {
          void answer(selectedRomaji)
        }}
      />
    )
  }

  // One stable wrapper shape whether or not feedback is showing — the
  // exercise component must stay at the same position in the tree across
  // the answer -> feedback transition, or React remounts it and its
  // internal "which option did I tap" state resets before the wrong-answer
  // highlight ever renders. (Caught via manual browser verification: the
  // correct answer highlighted green as expected, but the actually-tapped
  // wrong option never turned red — an earlier version returned a
  // differently-shaped tree once `feedback` was set, which unmounted and
  // remounted MultipleChoiceExercise/TypingExercise mid-transition.)
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        {renderExercise(exercise, script, feedback ? () => {} : answer, feedback)}
      </div>
      {feedback && (
        <div className={`px-4 pb-6 pt-4 ${feedback.wasCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <p
            className={`mb-3 text-lg font-semibold ${feedback.wasCorrect ? 'text-green-400' : 'text-red-400'}`}
          >
            {feedback.wasCorrect ? 'Correct!' : 'Not quite'}
          </p>
          {!feedback.wasCorrect && (
            <p lang="ja" className="mb-3 text-neutral-300">
              Correct answer: {feedback.correctText}
            </p>
          )}
          <button
            type="button"
            onClick={continueAfterFeedback}
            className="min-h-[44px] w-full rounded-xl bg-neutral-100 px-4 py-3 text-lg font-semibold text-neutral-950"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  )
}

function renderExercise(
  exercise: ResolvedExercise,
  script: KanaScript,
  onAnswer: (rawInput: string) => void,
  feedback: PendingFeedback | null,
) {
  if (exercise.type === '7.15') {
    return <TeachingCard exercise={exercise} onAcknowledge={() => onAnswer('ack')} />
  }
  if (exercise.type === '7.1' || exercise.type === '7.2') {
    return <MultipleChoiceExercise exercise={exercise} onAnswer={onAnswer} feedback={feedback} />
  }
  if (exercise.type === '7.3') {
    return (
      <TypingExercise exercise={exercise} script={script} onAnswer={onAnswer} feedback={feedback} />
    )
  }
  return null
}
