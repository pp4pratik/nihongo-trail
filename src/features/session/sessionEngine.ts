// The pure session engine (§13.3): build → serve → grade → rate →
// schedule → persist → advance. Deterministic given the same injected
// store/clock/RNG and inputs — no hidden retry state (that lives in the
// persistence wrapper one layer up, see persistenceWrapper.ts).

import type { KanaItem, Lesson, Session, ExerciseAnswer, SrsCard, ReviewLogEntry } from '@/types'
import type { ProgressStore } from '@/storage/ProgressStore'
import type { SeededRng } from '@/lib/seededRng'
import type { KanaScript } from '@/lib/romajiKana'
import { buildExercisesForLesson } from './buildExercise'
import { gradeAnswer } from './grading'
import { rateOutcome, type SrsRating } from './rating'
import { createNewCard, createFsrsScheduler, scheduleReview } from '@/features/srs/fsrsClient'

export interface SessionEngineDeps {
  store: ProgressStore
  clock: () => Date
}

// XP per §9.1. Phase 1's grading is single-attempt (no retry-on-wrong
// flow built yet, so "correct after a mistake" — worth 4 XP — never
// applies here); lesson/session-level bonuses (perfect lesson, daily
// goal, etc.) are gamification scope (§16 Phase 3), not wired here yet.
const XP_CORRECT_FIRST_ATTEMPT = 10

function cardId(itemId: string, direction: 'recognise' | 'produce'): string {
  return `${itemId}::${direction}`
}

/** §13.3 step 1 — Build: resolves a lesson blueprint into a full session. */
export function buildLessonSession(
  sessionId: string,
  lesson: Lesson,
  contentPool: KanaItem[],
  rng: SeededRng,
  now: Date,
): Session {
  const itemsById = new Map(contentPool.map((item) => [item.id, item]))
  const exercises = buildExercisesForLesson(
    lesson.exerciseTemplates,
    itemsById,
    contentPool,
    lesson.practicesItems,
    rng,
    sessionId,
  )

  return {
    id: sessionId,
    schemaVersion: 1,
    kind: 'lesson',
    lessonId: lesson.id,
    startedAt: now.toISOString(),
    lastActiveAt: now.toISOString(),
    status: 'active',
    exercises,
    currentIndex: 0,
    answers: [],
    xpEarned: 0,
    heartsLost: 0,
    correctCount: 0,
    incorrectCount: 0,
  }
}

/** Rolling median response time for an exercise type, from the last 50
 * matching review log entries (§8.4). undefined until 20 samples exist. */
async function rollingMedianMs(
  store: ProgressStore,
  exerciseType: string,
): Promise<number | undefined> {
  const log = await store.getReviewLog()
  const matching = log
    .filter((entry) => entry.exerciseType === exerciseType)
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))
    .slice(0, 50)
  if (matching.length < 20) return undefined
  const sorted = matching.map((e) => e.responseTimeMs).sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export interface SubmitAnswerParams {
  session: Session
  rawInput: string
  responseTimeMs: number
  usedHint: boolean
  script: KanaScript
}

export interface SubmitAnswerResult {
  session: Session
  card?: SrsCard
  reviewLogEntry?: ReviewLogEntry
  srsRating?: SrsRating
}

/**
 * §13.3 steps 3-7 (grade → rate → schedule → advance). Does NOT call
 * store.persistAnswer itself — the caller (persistence wrapper) owns when
 * and how the result gets written, so it can add retry-buffer behavior
 * around a single call site without the engine needing to know about it.
 */
export async function submitAnswer(
  deps: SessionEngineDeps,
  params: SubmitAnswerParams,
): Promise<SubmitAnswerResult> {
  const { session, rawInput, responseTimeMs, usedHint, script } = params
  const exercise = session.exercises[session.currentIndex]
  const now = deps.clock()
  const grade = gradeAnswer(exercise, rawInput, script)

  const answer: ExerciseAnswer = {
    exerciseIndex: exercise.index,
    answeredAt: now.toISOString(),
    rawInput,
    wasCorrect: grade.wasCorrect,
    responseTimeMs,
    usedHint,
    attempts: 1,
  }

  // Teaching cards (§7.15) are "not graded" — accepting one always reports
  // wasCorrect: true from gradeAnswer so the UI can advance, but it must
  // never move correctCount/incorrectCount/xpEarned, which are answer
  // quality signals for genuinely graded exercise types only.
  const isGraded = exercise.type !== '7.15'

  const advancedSession: Session = {
    ...session,
    answers: [...session.answers, answer],
    currentIndex: session.currentIndex + 1,
    lastActiveAt: now.toISOString(),
    correctCount: session.correctCount + (isGraded && grade.wasCorrect ? 1 : 0),
    incorrectCount: session.incorrectCount + (isGraded && !grade.wasCorrect ? 1 : 0),
    xpEarned:
      session.xpEarned + (isGraded && grade.wasCorrect ? XP_CORRECT_FIRST_ATTEMPT : 0),
    status:
      session.currentIndex + 1 >= session.exercises.length ? 'completed' : session.status,
    completedAt:
      session.currentIndex + 1 >= session.exercises.length ? now.toISOString() : session.completedAt,
  }

  // Teaching card: create both direction-cards for the item, no rating.
  if (exercise.type === '7.15') {
    const existingRecognise = await deps.store.getCard(cardId(exercise.itemId, 'recognise'))
    const existingProduce = await deps.store.getCard(cardId(exercise.itemId, 'produce'))
    const newCards: SrsCard[] = []
    if (!existingRecognise) {
      newCards.push(
        createNewCard(now, {
          cardId: cardId(exercise.itemId, 'recognise'),
          itemId: exercise.itemId,
          itemType: 'kana',
          direction: 'recognise',
          introducedAt: now.toISOString(),
          isLeech: false,
          isSuspended: false,
        }),
      )
    }
    if (!existingProduce) {
      newCards.push(
        createNewCard(now, {
          cardId: cardId(exercise.itemId, 'produce'),
          itemId: exercise.itemId,
          itemType: 'kana',
          direction: 'produce',
          introducedAt: now.toISOString(),
          isLeech: false,
          isSuspended: false,
        }),
      )
    }
    for (const card of newCards) await deps.store.upsertCards([card])
    return { session: advancedSession }
  }

  // Graded exercise types (7.1, 7.2, 7.3, 7.12): rate, schedule, log.
  if (!exercise.cardId) {
    return { session: advancedSession }
  }

  const existingCard = await deps.store.getCard(exercise.cardId)
  if (!existingCard) {
    // Defensive: a graded exercise should never be reachable before its
    // teaching card, per teach-then-test (§1.5) and §5.5 rule 1.
    return { session: advancedSession }
  }

  const medianMs = await rollingMedianMs(deps.store, exercise.type)
  const rating = rateOutcome({
    wasCorrect: grade.wasCorrect,
    usedHint,
    responseTimeMs,
    rollingMedianMs: medianMs,
    cardState: existingCard.state,
  })

  const scheduler = createFsrsScheduler()
  const { card: updatedCard, reviewLog } = scheduleReview(scheduler, existingCard, now, rating as 1 | 2 | 3 | 4)

  const reviewLogEntry: ReviewLogEntry = {
    id: crypto.randomUUID(),
    cardId: exercise.cardId,
    reviewedAt: now.toISOString(),
    rating,
    state: existingCard.state,
    elapsedDays: reviewLog.elapsed_days,
    scheduledDays: reviewLog.scheduled_days,
    exerciseType: exercise.type,
    responseTimeMs,
    wasCorrect: grade.wasCorrect,
    usedHint,
    sessionId: session.id,
  }

  return {
    session: {
      ...advancedSession,
      answers: advancedSession.answers.map((a, i) =>
        i === advancedSession.answers.length - 1 ? { ...a, srsRating: rating } : a,
      ),
    },
    card: updatedCard,
    reviewLogEntry,
    srsRating: rating,
  }
}
