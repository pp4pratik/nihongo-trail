// The persistence wrapper (§10.3, §10.4) — a thin, stateful shell one
// layer outside the pure session engine. Owns the retry-buffer state and
// non-blocking warning on write failure; the engine itself stays
// deterministic and stateless (see docs/DECISIONS.md's architecture note
// and the Phase 0 Architecture diagram in the design doc).
//
// Resume itself needs no special logic beyond this: the Session object
// carries its own fully-resolved exercise list (§10.4), so loading the
// persisted session via ProgressStore.getActiveSession() and continuing
// from currentIndex IS the resume — nothing is ever regenerated.

import type { ProgressStore } from '@/storage/ProgressStore'
import type { Session } from '@/types'
import type { KanaScript } from '@/lib/romajiKana'
import { submitAnswer, type SessionEngineDeps } from './sessionEngine'

export interface PersistenceWarning {
  message: string
  failedAt: string
}

export interface SubmitAndPersistParams {
  session: Session
  rawInput: string
  responseTimeMs: number
  usedHint: boolean
  script: KanaScript
}

export interface SubmitAndPersistResult {
  session: Session
  warning?: PersistenceWarning
}

interface PendingWrite {
  card?: Parameters<ProgressStore['persistAnswer']>[0]['card']
  reviewLogEntry?: Parameters<ProgressStore['persistAnswer']>[0]['reviewLogEntry']
  session: Session
}

export class SessionPersistenceController {
  private readonly deps: SessionEngineDeps
  private pendingWrites: PendingWrite[] = []

  constructor(deps: SessionEngineDeps) {
    this.deps = deps
  }

  /** Persists a freshly-built session immediately, before any answer is
   * given — otherwise killing the tab before the first answer would leave
   * no active session to resume (§10.4). */
  async startSession(session: Session): Promise<SubmitAndPersistResult> {
    await this.flushPending()
    try {
      await this.deps.store.persistAnswer({ session })
      return { session }
    } catch {
      this.pendingWrites.push({ session })
      return { session, warning: this.warningNow() }
    }
  }

  async submitAndPersist(params: SubmitAndPersistParams): Promise<SubmitAndPersistResult> {
    // §13.3 steps 3-7: grade/rate/schedule/advance. The engine never
    // throws on a persistence failure — persistence is this wrapper's job.
    const result = await submitAnswer(this.deps, {
      session: params.session,
      rawInput: params.rawInput,
      responseTimeMs: params.responseTimeMs,
      usedHint: params.usedHint,
      script: params.script,
    })

    await this.flushPending()

    const write: PendingWrite = {
      card: result.card,
      reviewLogEntry: result.reviewLogEntry,
      session: result.session,
    }

    try {
      await this.deps.store.persistAnswer(write)
      return { session: result.session }
    } catch {
      this.pendingWrites.push(write)
      return { session: result.session, warning: this.warningNow() }
    }
  }

  /** How many writes are currently buffered, waiting to retry. Exposed for
   * UI/testing — not persisted itself, so a real tab kill loses the
   * buffer (see the resume contract's own successfully-persisted-answer
   * guarantee, which this buffer is a defensive fallback on top of). */
  get pendingCount(): number {
    return this.pendingWrites.length
  }

  private async flushPending(): Promise<void> {
    while (this.pendingWrites.length > 0) {
      const next = this.pendingWrites[0]
      try {
        await this.deps.store.persistAnswer(next)
        this.pendingWrites.shift()
      } catch {
        break // still failing — leave the rest buffered, try again next call
      }
    }
  }

  private warningNow(): PersistenceWarning {
    return {
      message: 'Could not save your progress — will keep retrying automatically.',
      failedAt: this.deps.clock().toISOString(),
    }
  }
}
