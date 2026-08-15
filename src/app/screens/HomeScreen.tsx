// Home screen (§14.1 #2): streak, due-review count, "Continue" CTA, and
// — per the /plan-eng-review cross-model resolution — a single Stage 0
// retrievability stat so the honesty-mechanic differentiator (premise 2,
// design doc) is visible by the end of Phase 1, not hidden until the
// Phase 3 Lesson Map.

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { progressStore } from '@/storage/db'
import { loadCurriculumContent, firstLessonOf } from '@/content/loadCurriculum'
import { createFsrsScheduler, getRetrievability } from '@/features/srs/fsrsClient'
import type { Session, UserMeta } from '@/types'

interface HomeState {
  loading: boolean
  meta: UserMeta | null
  activeSession: Session | null
  nextLessonId: string | null
  hiraganaRetrievability: number | null
}

async function computeHiraganaRetrievability(now: Date): Promise<number | null> {
  // ProgressStore has no "all cards" method (deliberately — Phase 0 only
  // added what Phase 0/1 needed). A far-future due-date ceiling reuses the
  // due index to fetch effectively all cards; fine for kana-only scale.
  // Phase 3's real decay indicator (§9.7) should get a proper method.
  const farFuture = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000)
  const allCards = await progressStore.getDueCards(farFuture, 10000)
  const hiraganaCards = allCards.filter(
    (c) => c.itemId.startsWith('kana:hiragana:') && c.state !== 'New',
  )
  if (hiraganaCards.length === 0) return null
  const scheduler = createFsrsScheduler()
  const values = hiraganaCards.map((c) => getRetrievability(scheduler, c, now))
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function HomeScreen() {
  const navigate = useNavigate()
  const [state, setState] = useState<HomeState>({
    loading: true,
    meta: null,
    activeSession: null,
    nextLessonId: null,
    hiraganaRetrievability: null,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const now = new Date()
      const [meta, activeSession, curriculum, retrievability] = await Promise.all([
        progressStore.getMeta(),
        progressStore.getActiveSession(),
        loadCurriculumContent(),
        computeHiraganaRetrievability(now),
      ])
      if (cancelled) return

      let nextLessonId: string | null = null
      if (!activeSession) {
        for (const lesson of curriculum.lessons.sort((a, b) => a.index - b.index)) {
          const progress = await progressStore.getLessonProgress(lesson.id)
          if (!progress || progress.status !== 'completed') {
            nextLessonId = lesson.id
            break
          }
        }
      }
      if (nextLessonId === null && curriculum.lessons.length > 0) {
        nextLessonId = firstLessonOf(curriculum, curriculum.units[0]?.id ?? '')?.id ?? null
      }

      setState({
        loading: false,
        meta,
        activeSession: activeSession && activeSession.status === 'active' ? activeSession : null,
        nextLessonId,
        hiraganaRetrievability: retrievability,
      })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (state.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <p className="text-neutral-500">Loading…</p>
      </div>
    )
  }

  const handleContinue = () => {
    if (state.activeSession) {
      navigate('/session', { state: { resume: true } })
    } else if (state.nextLessonId) {
      navigate('/session', { state: { lessonId: state.nextLessonId } })
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-100">
      <h1 className="mb-8 text-2xl font-semibold">Nihongo Trail</h1>

      <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-sm text-neutral-500">Streak</p>
        <p className="text-3xl font-bold">{state.meta?.currentStreak ?? 0} days</p>
      </div>

      {state.hiraganaRetrievability !== null && (
        <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-500">Hiragana retrievability</p>
          <p className="text-3xl font-bold">{Math.round(state.hiraganaRetrievability * 100)}%</p>
          <p className="mt-1 text-xs text-neutral-600">
            How much of what you've learned you can actually recall right now — not just what
            you've seen.
          </p>
        </div>
      )}

      {state.activeSession && (
        <div className="mb-6 rounded-2xl border border-amber-700 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-400">
            Resuming — {state.activeSession.currentIndex} of {state.activeSession.exercises.length}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleContinue}
        disabled={!state.activeSession && !state.nextLessonId}
        className="min-h-[44px] w-full rounded-xl bg-neutral-100 px-4 py-4 text-lg font-semibold text-neutral-950 disabled:opacity-40"
      >
        {state.activeSession ? 'Continue' : 'Start lesson'}
      </button>

      <Link
        to="/credits"
        className="mt-6 inline-block text-sm text-neutral-600 underline"
      >
        Credits & data attribution
      </Link>
    </div>
  )
}
