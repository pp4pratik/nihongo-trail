// ts-fsrs wrapper (§8). Converts between the app's SrsCard shape (§12.3)
// and ts-fsrs's own Card/CardInput shape, and applies the scheduler
// configuration from §8.3.

import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  type FSRS,
  type FSRSParameters,
  type Card,
  type CardInput,
  type Grade,
  type ReviewLog,
  State,
} from 'ts-fsrs'
import type { SrsCard, FsrsState } from '@/types'

// §8.3 scheduler configuration.
const SCHEDULER_CONFIG: Partial<FSRSParameters> = {
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: true,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['10m'],
}

export function createFsrsScheduler(overrides?: Partial<FSRSParameters>): FSRS {
  return fsrs(generatorParameters({ ...SCHEDULER_CONFIG, ...overrides }))
}

// Fields SrsCard carries that ts-fsrs's Card knows nothing about — must be
// supplied by the caller (they come from the app's item/session context,
// not from the scheduling algorithm).
export interface SrsCardIdentity {
  cardId: string
  itemId: SrsCard['itemId']
  itemType: SrsCard['itemType']
  direction: SrsCard['direction']
  introducedAt: string
  isLeech: boolean
  isSuspended: boolean
  userNote?: string
}

/** Creates a brand-new FSRS card in the `New` state, ready to persist. */
export function createNewCard(now: Date, identity: SrsCardIdentity): SrsCard {
  const card = createEmptyCard(now)
  return toAppCard(card, identity)
}

/** Converts an app SrsCard into the CardInput shape ts-fsrs expects. */
export function toFsrsCardInput(card: SrsCard): CardInput {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningStep,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.lastReview ?? null,
  }
}

/** Converts a ts-fsrs Card back into the app's SrsCard shape. */
export function toAppCard(fsrsCard: Card, identity: SrsCardIdentity): SrsCard {
  return {
    cardId: identity.cardId,
    itemId: identity.itemId,
    itemType: identity.itemType,
    direction: identity.direction,

    due: fsrsCard.due.toISOString(),
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsedDays: fsrsCard.elapsed_days,
    scheduledDays: fsrsCard.scheduled_days,
    learningStep: fsrsCard.learning_steps,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    state: State[fsrsCard.state] as FsrsState,
    lastReview: fsrsCard.last_review?.toISOString(),

    introducedAt: identity.introducedAt,
    isLeech: identity.isLeech,
    isSuspended: identity.isSuspended,
    userNote: identity.userNote,
  }
}

export interface ScheduleResult {
  card: SrsCard
  reviewLog: ReviewLog
}

/**
 * Schedules the next review for a card given a rating. `grade` excludes
 * `Rating.Manual` — the app never submits a manual rating (§8.4: ratings
 * are always derived from exercise outcomes, never self-rated).
 */
export function scheduleReview(
  scheduler: FSRS,
  appCard: SrsCard,
  now: Date,
  grade: Grade,
): ScheduleResult {
  const { card, log } = scheduler.next(toFsrsCardInput(appCard), now, grade)
  return {
    card: toAppCard(card, {
      cardId: appCard.cardId,
      itemId: appCard.itemId,
      itemType: appCard.itemType,
      direction: appCard.direction,
      introducedAt: appCard.introducedAt,
      isLeech: appCard.isLeech,
      isSuspended: appCard.isSuspended,
      userNote: appCard.userNote,
    }),
    reviewLog: log,
  }
}

/** Current estimated probability of recall (§8, retrievability). */
export function getRetrievability(scheduler: FSRS, appCard: SrsCard, now: Date): number {
  return scheduler.get_retrievability(toFsrsCardInput(appCard), now, false)
}
