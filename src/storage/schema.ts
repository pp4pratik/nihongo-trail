// Dexie schema (§12.6). This file, plus IndexedDbProgressStore.ts, are the
// only files in the app that import Dexie directly (§12.7).

import Dexie, { type EntityTable } from 'dexie'
import type {
  SrsCard,
  ReviewLogEntry,
  Session,
  LessonProgress,
  UnitProgress,
  DailyStatsEntry,
  UserMeta,
} from '@/types'

// meta (§12.6) is "fixed key 'user' — single record" — Dexie tables need a
// real keyPath, so the single record always carries key: 'user'.
export interface MetaRecord extends UserMeta {
  key: 'user'
}

// snapshots (§12.6, §10.6): rolling 3-day safety snapshots of the whole
// progress store, so a corrupted write is recoverable without an external
// backup. Shape mirrors ExportBundle minus schemaVersion/exportedAt (the
// snapshot's own `date` key serves that purpose).
export interface SnapshotRecord {
  date: string
  cards: SrsCard[]
  reviewLog: ReviewLogEntry[]
  sessions: Session[]
  lessonProgress: LessonProgress[]
  unitProgress: UnitProgress[]
  dailyStats: DailyStatsEntry[]
  meta: UserMeta
}

export class NihongoTrailDb extends Dexie {
  cards!: EntityTable<SrsCard, 'cardId'>
  reviewLog!: EntityTable<ReviewLogEntry, 'id'>
  sessions!: EntityTable<Session, 'id'>
  lessonProgress!: EntityTable<LessonProgress, 'lessonId'>
  unitProgress!: EntityTable<UnitProgress, 'unitId'>
  meta!: EntityTable<MetaRecord, 'key'>
  dailyStats!: EntityTable<DailyStatsEntry, 'date'>
  snapshots!: EntityTable<SnapshotRecord, 'date'>

  constructor(name = 'nihongo-trail') {
    super(name)
    this.version(1).stores({
      cards: 'cardId, due, itemId, state, isLeech',
      reviewLog: 'id, cardId, reviewedAt, sessionId',
      sessions: 'id, status, startedAt',
      lessonProgress: 'lessonId, status',
      unitProgress: 'unitId, status',
      meta: 'key',
      dailyStats: 'date',
      snapshots: 'date',
    })
  }
}
