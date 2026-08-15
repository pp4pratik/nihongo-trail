// Session Complete screen (§14.1 #5): XP breakdown, accuracy, next-up.

import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { progressStore } from '@/storage/db'
import type { Session } from '@/types'

interface LocationState {
  session?: Session
}

export function SessionCompleteScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const session = (location.state as LocationState | null)?.session

  useEffect(() => {
    if (!session) {
      navigate('/', { replace: true })
      return
    }
    // §9.1: session-completion XP bonus, and mark the lesson complete.
    void (async () => {
      if (session.lessonId) {
        await progressStore.saveLessonProgress({
          lessonId: session.lessonId,
          status: 'completed',
          completedAt: session.completedAt ?? new Date().toISOString(),
          attempts: 1,
          bestAccuracy:
            session.correctCount + session.incorrectCount > 0
              ? session.correctCount / (session.correctCount + session.incorrectCount)
              : 1,
          lastSessionId: session.id,
        })
      }
      await progressStore.updateMeta({ totalXp: (await progressStore.getMeta()).totalXp + 20 })
    })()
    // Run once when this screen mounts with a completed session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!session) return null

  const total = session.correctCount + session.incorrectCount
  const accuracyPct = total > 0 ? Math.round((session.correctCount / total) * 100) : 100

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-neutral-100">
      <p className="text-3xl font-bold">Lesson complete!</p>
      <div className="grid w-full max-w-xs grid-cols-2 gap-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-center">
          <p className="text-sm text-neutral-500">XP earned</p>
          <p className="text-2xl font-bold">{session.xpEarned + 20}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-center">
          <p className="text-sm text-neutral-500">Accuracy</p>
          <p className="text-2xl font-bold">{accuracyPct}%</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="min-h-[44px] w-full max-w-xs rounded-xl bg-neutral-100 px-4 py-3 text-lg font-semibold text-neutral-950"
      >
        Back to home
      </button>
    </div>
  )
}
