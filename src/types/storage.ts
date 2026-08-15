// Storage-layer types referenced by §12.6/§12.7 but not spelled out in §12
// itself (ExportBundle, DailyStatsEntry, ImportResult). Filled in here from
// §10.1 (the four progress layers), §10.5 (export/import contract), §12.6
// (dailyStats store), and the /plan-eng-review decision that importAll
// never throws — it returns a result the caller branches on. See
// docs/DECISIONS.md — these fill gaps the source spec left open.

import type { SrsCard, ReviewLogEntry, LessonProgress, UnitProgress, UserMeta } from './progress'
import type { Session } from './session'

export interface DailyStatsEntry {
  date: string // local YYYY-MM-DD, primary key per §12.6
  xpEarned: number
  reviewsCompleted: number
  accuracy: number // 0-1
  minutesStudied: number
}

// §10.5: "a single JSON file containing all four progress layers plus a
// schema version and export timestamp."
export interface ExportBundle {
  schemaVersion: number
  exportedAt: string // ISO 8601
  cards: SrsCard[]
  reviewLog: ReviewLogEntry[]
  sessions: Session[]
  lessonProgress: LessonProgress[]
  unitProgress: UnitProgress[]
  dailyStats: DailyStatsEntry[]
  meta: UserMeta
}

// Decided in /plan-eng-review (Test gap 4): importAll never throws on
// malformed input — it resolves a result the Phase 4 UI branches on to
// show the §10.5 diff-summary confirmation screen.
export interface ImportResult {
  success: boolean
  error?: string
  diff?: {
    reviewLogDelta: number // e.g. +240 more reviews than current data
    cardsDelta: number
  }
}
