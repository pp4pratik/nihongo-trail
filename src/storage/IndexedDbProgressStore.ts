// Dexie-backed ProgressStore implementation (§12.7, §12.6).
//
// Every method throws on failure (propagates the rejected Dexie promise) —
// no internal retry/buffering, per the /plan-eng-review architecture
// decision. The one exception is importAll, which never throws (Test gap
// 4): malformed input is a normal, expected case, not exceptional.

import type { ProgressStore } from './ProgressStore'
import { NihongoTrailDb, type MetaRecord } from './schema'
import { createDefaultMeta } from './defaultMeta'
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

const EXPORT_SCHEMA_VERSION = 1

const EXPORT_ARRAY_FIELDS = [
  'cards',
  'reviewLog',
  'sessions',
  'lessonProgress',
  'unitProgress',
  'dailyStats',
] as const

function isValidExportBundle(bundle: unknown): bundle is ExportBundle {
  if (typeof bundle !== 'object' || bundle === null) return false
  const b = bundle as Record<string, unknown>
  if (typeof b.schemaVersion !== 'number') return false
  if (typeof b.exportedAt !== 'string') return false
  if (typeof b.meta !== 'object' || b.meta === null) return false
  return EXPORT_ARRAY_FIELDS.every((field) => Array.isArray(b[field]))
}

export class IndexedDbProgressStore implements ProgressStore {
  private db: NihongoTrailDb

  constructor(dbName = 'nihongo-trail') {
    this.db = new NihongoTrailDb(dbName)
  }

  async getDueCards(now: Date, limit: number): Promise<SrsCard[]> {
    // Must use the `due` index (§15.2), not a full-table scan — .and()
    // filters the already-indexed result set, it does not re-scan.
    return this.db.cards
      .where('due')
      .belowOrEqual(now.toISOString())
      .and((card) => !card.isSuspended)
      .limit(limit)
      .toArray()
  }

  async getCard(cardId: string): Promise<SrsCard | undefined> {
    return this.db.cards.get(cardId)
  }

  async upsertCards(cards: SrsCard[]): Promise<void> {
    await this.db.cards.bulkPut(cards)
  }

  async appendReviewLog(entries: ReviewLogEntry[]): Promise<void> {
    // bulkAdd (not bulkPut): append-only — a colliding id throws rather
    // than silently overwriting a prior log entry.
    await this.db.reviewLog.bulkAdd(entries)
  }

  async getReviewLog(since?: Date): Promise<ReviewLogEntry[]> {
    if (!since) return this.db.reviewLog.toArray()
    return this.db.reviewLog.where('reviewedAt').aboveOrEqual(since.toISOString()).toArray()
  }

  async getActiveSession(): Promise<Session | undefined> {
    return this.db.sessions.where('status').equals('active').first()
  }

  async saveSession(session: Session): Promise<void> {
    await this.db.sessions.put(session)
  }

  async getMeta(): Promise<UserMeta> {
    const existing = await this.db.meta.get('user')
    if (existing) {
      const { key: _key, ...meta } = existing
      return meta
    }
    const seeded: MetaRecord = { key: 'user', ...createDefaultMeta(new Date()) }
    await this.db.meta.put(seeded)
    const { key: _key, ...meta } = seeded
    return meta
  }

  async updateMeta(patch: Partial<UserMeta>): Promise<void> {
    const current = await this.getMeta()
    const updated: MetaRecord = { key: 'user', ...current, ...patch }
    await this.db.meta.put(updated)
  }

  async getLessonProgress(lessonId: string): Promise<LessonProgress | undefined> {
    return this.db.lessonProgress.get(lessonId)
  }

  async saveLessonProgress(p: LessonProgress): Promise<void> {
    await this.db.lessonProgress.put(p)
  }

  async getUnitProgress(unitId: string): Promise<UnitProgress | undefined> {
    return this.db.unitProgress.get(unitId)
  }

  async saveUnitProgress(p: UnitProgress): Promise<void> {
    await this.db.unitProgress.put(p)
  }

  async getDailyStats(date: string): Promise<DailyStatsEntry | undefined> {
    return this.db.dailyStats.get(date)
  }

  async saveDailyStats(entry: DailyStatsEntry): Promise<void> {
    await this.db.dailyStats.put(entry)
  }

  async persistAnswer(params: {
    card?: SrsCard
    reviewLogEntry?: ReviewLogEntry
    session: Session
    metaPatch?: Partial<UserMeta>
  }): Promise<void> {
    await this.db.transaction('rw', [this.db.cards, this.db.reviewLog, this.db.sessions, this.db.meta], async () => {
      if (params.card) await this.db.cards.put(params.card)
      if (params.reviewLogEntry) await this.db.reviewLog.add(params.reviewLogEntry)
      await this.db.sessions.put(params.session)
      if (params.metaPatch) {
        const current = await this.getMeta()
        await this.db.meta.put({ key: 'user', ...current, ...params.metaPatch })
      }
    })
  }

  async exportAll(): Promise<ExportBundle> {
    const [cards, reviewLog, sessions, lessonProgress, unitProgress, dailyStats, meta] =
      await Promise.all([
        this.db.cards.toArray(),
        this.db.reviewLog.toArray(),
        this.db.sessions.toArray(),
        this.db.lessonProgress.toArray(),
        this.db.unitProgress.toArray(),
        this.db.dailyStats.toArray(),
        this.getMeta(),
      ])
    return {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      cards,
      reviewLog,
      sessions,
      lessonProgress,
      unitProgress,
      dailyStats,
      meta,
    }
  }

  async importAll(bundle: ExportBundle): Promise<ImportResult> {
    if (!isValidExportBundle(bundle)) {
      return { success: false, error: 'Malformed backup file: missing or invalid fields.' }
    }

    try {
      const [currentReviewLogCount, currentCardsCount] = await Promise.all([
        this.db.reviewLog.count(),
        this.db.cards.count(),
      ])

      await this.db.transaction(
        'rw',
        [
          this.db.cards,
          this.db.reviewLog,
          this.db.sessions,
          this.db.lessonProgress,
          this.db.unitProgress,
          this.db.dailyStats,
          this.db.meta,
        ],
        async () => {
          await Promise.all([
            this.db.cards.clear(),
            this.db.reviewLog.clear(),
            this.db.sessions.clear(),
            this.db.lessonProgress.clear(),
            this.db.unitProgress.clear(),
            this.db.dailyStats.clear(),
          ])
          await Promise.all([
            this.db.cards.bulkAdd(bundle.cards),
            this.db.reviewLog.bulkAdd(bundle.reviewLog),
            this.db.sessions.bulkAdd(bundle.sessions),
            this.db.lessonProgress.bulkAdd(bundle.lessonProgress),
            this.db.unitProgress.bulkAdd(bundle.unitProgress),
            this.db.dailyStats.bulkAdd(bundle.dailyStats),
            this.db.meta.put({ key: 'user', ...bundle.meta }),
          ])
        },
      )

      return {
        success: true,
        diff: {
          reviewLogDelta: bundle.reviewLog.length - currentReviewLogCount,
          cardsDelta: bundle.cards.length - currentCardsCount,
        },
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  // Phase 5 stubs (§12.7) — no-ops in Phase 1.
  async getChangesSince(_cursor: string): Promise<ChangeSet> {
    return { cursor: _cursor, changes: [] }
  }

  async applyRemoteChanges(_changes: ChangeSet): Promise<ConflictReport> {
    return { conflicts: [] }
  }
}
