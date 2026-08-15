// Sync-readiness fields (§12.8) — written from day one, implemented in Phase 5.

export interface SyncMeta {
  updatedAt: string // ISO, always set on write
  deviceId: string // random uuid, generated once per install
  revision: number // monotonic per-record counter
  deleted?: boolean // soft delete — never hard-delete a synced record
}

// Phase 5 stubs (§12.7) — no-ops in Phase 1, implemented in Phase 5.
export interface ChangeSet {
  cursor: string
  changes: unknown[]
}

export interface ConflictReport {
  conflicts: unknown[]
}
