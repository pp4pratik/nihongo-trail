// The storage abstraction (§12.7) — the single most important architectural
// decision in the requirements doc. Nothing outside src/storage/ imports
// Dexie directly.
//
// Contract (decided in /plan-eng-review, Architecture issue 2): every
// method throws on failure. There is no internal retry or buffering here —
// that's the caller's responsibility (a thin persistence wrapper one layer
// above the pure session engine, per §13.3 and the outside-voice
// correction — see the design doc's Phase 0 Architecture diagram).
//
// The one deliberate exception is importAll: malformed input is an
// expected, normal case (the user picked the wrong file), not an
// exceptional one, so it resolves an ImportResult instead of throwing
// (Test gap 4 in /plan-eng-review).

import type {
  SrsCard,
  ReviewLogEntry,
  Session,
  UserMeta,
  LessonProgress,
  UnitProgress,
  DailyStatsEntry,
  ExportBundle,
  ImportResult,
  ChangeSet,
  ConflictReport,
} from '@/types'

export interface ProgressStore {
  getDueCards(now: Date, limit: number): Promise<SrsCard[]>
  getCard(cardId: string): Promise<SrsCard | undefined>
  upsertCards(cards: SrsCard[]): Promise<void>

  appendReviewLog(entries: ReviewLogEntry[]): Promise<void>
  getReviewLog(since?: Date): Promise<ReviewLogEntry[]>

  getActiveSession(): Promise<Session | undefined>
  saveSession(session: Session): Promise<void>

  getMeta(): Promise<UserMeta>
  updateMeta(patch: Partial<UserMeta>): Promise<void>

  getLessonProgress(lessonId: string): Promise<LessonProgress | undefined>
  saveLessonProgress(p: LessonProgress): Promise<void>

  getUnitProgress(unitId: string): Promise<UnitProgress | undefined>
  saveUnitProgress(p: UnitProgress): Promise<void>

  getDailyStats(date: string): Promise<DailyStatsEntry | undefined>
  saveDailyStats(entry: DailyStatsEntry): Promise<void>

  exportAll(): Promise<ExportBundle>
  importAll(bundle: ExportBundle): Promise<ImportResult>

  // Sync hooks — no-ops in Phase 1, implemented in Phase 5 (§12.7).
  getChangesSince(cursor: string): Promise<ChangeSet>
  applyRemoteChanges(changes: ChangeSet): Promise<ConflictReport>
}
