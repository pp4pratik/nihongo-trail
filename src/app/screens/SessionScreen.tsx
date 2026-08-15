// Session screen (§14.2) — full-screen exercise player. Top bar: exit,
// progress bar. Hearts are out of Phase 1 scope (§16 lists only "Basic XP
// and streak" for Phase 1 — hearts/levels/badges are Phase 3).

import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { progressStore } from '@/storage/db'
import { loadCurriculumContent, findLesson } from '@/content/loadCurriculum'
import { loadKanaContent } from '@/content/loadKana'
import { buildLessonSession } from '@/features/session/sessionEngine'
import { SessionPersistenceController } from '@/features/session/persistenceController'
import { SessionPlayer } from '@/features/session/SessionPlayer'
import { SeededRng } from '@/lib/seededRng'
import { randomSeed } from '@/lib/randomSeed'
import type { KanaScript } from '@/lib/romajiKana'
import type { Session } from '@/types'

/** Infers hiragana vs katakana from the session's own item IDs, so a
 * resumed session doesn't need the script re-derived from a lesson
 * lookup — it's already fully resolved on the session itself (§10.4). */
function scriptOf(session: Session): KanaScript {
  const firstItemId = session.exercises[0]?.itemId ?? ''
  return firstItemId.startsWith('kana:katakana:') ? 'katakana' : 'hiragana'
}

interface LocationState {
  lessonId?: string
  resume?: boolean
}

// Module-level in-flight lock, not component-scoped state. React
// StrictMode's dev-mode mount→cleanup→remount runs synchronously, so a
// naive "only run once" ref guard combined with the standard
// cancelled-on-cleanup pattern can deadlock: the first invocation's
// cleanup marks it cancelled before its async work resolves, and a ref
// guard stops any other invocation from ever setting state. Instead, all
// concurrent callers (regardless of which effect invocation triggered
// them) share the SAME in-flight promise — each still applies its own
// `cancelled` check against the shared result, so whichever invocation is
// still mounted when it resolves is the one that calls setSession.
let pendingSessionResolution: Promise<Session | null> | null = null

async function resolveSession(state: LocationState, navigate: (path: string, opts?: { replace: boolean }) => void): Promise<Session | null> {
  if (pendingSessionResolution) return pendingSessionResolution

  pendingSessionResolution = (async () => {
    if (state.resume) {
      return (await progressStore.getActiveSession()) ?? null
    }

    if (!state.lessonId) {
      navigate('/', { replace: true })
      return null
    }

    // Never start a second session for a lesson that already has one
    // active — covers both StrictMode's double-invoke and any genuine
    // re-entry (e.g. browser back/forward) into the same in-flight lesson.
    const existingActive = await progressStore.getActiveSession()
    if (existingActive?.lessonId === state.lessonId) {
      return existingActive
    }

    const [curriculum, kanaContent] = await Promise.all([
      loadCurriculumContent(),
      loadKanaContent(),
    ])
    const lesson = findLesson(curriculum, state.lessonId)
    if (!lesson) {
      navigate('/', { replace: true })
      return null
    }

    const now = new Date()
    const built = buildLessonSession(
      crypto.randomUUID(),
      lesson,
      kanaContent.items,
      new SeededRng(randomSeed()),
      now,
    )
    const controller = new SessionPersistenceController({ store: progressStore, clock: () => new Date() })
    await controller.startSession(built)
    return built
  })()

  try {
    return await pendingSessionResolution
  } finally {
    pendingSessionResolution = null
  }
}

export function SessionScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState<Session | null>(null)
  const [controller] = useState(
    () => new SessionPersistenceController({ store: progressStore, clock: () => new Date() }),
  )

  useEffect(() => {
    let cancelled = false
    const state = (location.state ?? {}) as LocationState

    void resolveSession(state, navigate).then((resolved) => {
      if (!cancelled && resolved) setSession(resolved)
    })

    return () => {
      cancelled = true
    }
    // location.state is read once on mount per navigation — re-running on
    // every render would rebuild the session mid-play.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <p className="text-neutral-500">Loading…</p>
      </div>
    )
  }

  const progressPct = Math.round((session.currentIndex / Math.max(session.exercises.length, 1)) * 100)

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Exit lesson"
          className="min-h-[44px] min-w-[44px] text-2xl text-neutral-500"
        >
          ✕
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-neutral-100 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
      <div className="flex-1">
        <SessionPlayer
          session={session}
          script={scriptOf(session)}
          controller={controller}
          onSessionChange={setSession}
          onComplete={(completed) => {
            navigate('/session-complete', { state: { session: completed }, replace: true })
          }}
        />
      </div>
    </div>
  )
}
