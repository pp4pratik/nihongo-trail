// Progress types — read-write, in IndexedDB (§12.3, §12.4)

import type { ItemId, ItemType } from './content'
import type { UserSettings } from './settings'

export type CardDirection = 'recognise' | 'produce' | 'listen' | 'meaning' | 'reading' | 'apply'
export type FsrsState = 'New' | 'Learning' | 'Review' | 'Relearning'

export interface SrsCard {
  cardId: string // `${itemId}::${direction}`
  itemId: ItemId
  itemType: ItemType
  direction: CardDirection

  // FSRS fields — mirror the ts-fsrs Card shape
  due: string // ISO 8601
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  // ts-fsrs 5.x tracks the current (re)learning step index on the card itself
  // (`learning_steps` in its Card type) — not present in the original §12.3
  // spec, added here to mirror the actual library shape per §12.3's own
  // "mirror the ts-fsrs Card shape" instruction. See docs/DECISIONS.md.
  learningStep: number
  reps: number
  lapses: number
  state: FsrsState
  lastReview?: string

  // app-specific
  introducedAt: string
  isLeech: boolean
  isSuspended: boolean
  userNote?: string
}

export interface ReviewLogEntry {
  id: string // uuid
  cardId: string
  reviewedAt: string
  rating: 1 | 2 | 3 | 4 // FSRS Again/Hard/Good/Easy
  state: FsrsState // state BEFORE this review
  elapsedDays: number
  scheduledDays: number
  exerciseType: string
  responseTimeMs: number
  wasCorrect: boolean
  usedHint: boolean
  sessionId: string
}

export interface LessonProgress {
  lessonId: string
  status: 'locked' | 'available' | 'in_progress' | 'completed'
  completedAt?: string
  attempts: number
  bestAccuracy: number
  lastSessionId?: string
}

export interface UnitProgress {
  unitId: string
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'needs_review'
  completedAt?: string
  testScore?: number
  averageRetrievability: number // recomputed daily; drives the decay indicator
}

export interface UserMeta {
  createdAt: string
  totalXp: number
  level: number
  currentStreak: number
  longestStreak: number
  lastStudyDate: string // local YYYY-MM-DD
  streakFreezes: number
  streakRepairUsedAt?: string
  hearts: number
  heartsLastRegenAt: string
  dailyGoalXp: number
  earnedBadgeIds: string[]
  newItemsPerDay: number
  requestRetention: number
  fsrsParameters: number[]
  settings: UserSettings
}
