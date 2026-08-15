// §7.12 matching pairs — a grid of kana tiles + romaji tiles. Resolves to
// N ResolvedExercise entries sharing a groupId (see docs/DECISIONS.md),
// each graded single-shot as the learner taps it — "each pair produces
// its own SRS rating" (§7.12), matching every other exercise type's
// one-attempt grading. A wrong tap is real signal (§8.4: wrong -> Again)
// and is recorded immediately, not silently retried away — it briefly
// flashes red showing the correct answer, then moves on to the next pair.
//
// Grading always operates on the session's currentIndex (the session
// engine has no notion of "which item in the group" beyond that), so the
// active kana is always exercises[0] of whatever remains unresolved. The
// active tile is held fixed through the flash window (via `pending`) so
// the display doesn't jump to the next character mid-flash.

import { useState } from 'react'
import type { ResolvedExercise } from '@/types'
import { SeededRng } from '@/lib/seededRng'

export interface MatchingExerciseProps {
  /** All ResolvedExercise entries sharing this matching group's groupId,
   * in their original (unanswered) order — exercises[0] is always the one
   * currently gradable (matches session.currentIndex). */
  exercises: ResolvedExercise[]
  /** Called once per tapped pair, single-shot — `wasCorrect` reflects
   * whether the tap matched the active kana's actual romaji. */
  onPair: (exercise: ResolvedExercise, selectedRomaji: string, wasCorrect: boolean) => void
}

interface Pending {
  exercise: ResolvedExercise
  tappedRomaji: string
  wasCorrect: boolean
}

function romajiOf(e: ResolvedExercise): string {
  return Array.isArray(e.correctAnswer) ? e.correctAnswer[0] : e.correctAnswer
}

const FLASH_MS = 500

export function MatchingExercise({ exercises, onPair }: MatchingExerciseProps) {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<Pending | null>(null)

  const remaining = exercises.filter((e) => !resolvedIds.has(e.itemId))
  // Held fixed during the flash window so the active tile doesn't jump to
  // the next character until the flash clears.
  const active = pending ? pending.exercise : remaining[0]

  const [romajiOrder] = useState(() => new SeededRng(exercises.length).shuffle(exercises.map(romajiOf)))

  const handleRomajiTap = (romaji: string) => {
    if (!active || pending) return
    const wasCorrect = romaji === romajiOf(active)

    onPair(active, romaji, wasCorrect)
    setPending({ exercise: active, tappedRomaji: romaji, wasCorrect })
    setTimeout(() => {
      setResolvedIds((prev) => new Set(prev).add(active.itemId))
      setPending(null)
    }, FLASH_MS)
  }

  return (
    <div className="flex min-h-full flex-col px-4 py-8">
      <p className="mb-4 text-center text-sm text-neutral-500">
        Match each character to its sound — {remaining.length} left
      </p>
      <div className="mb-6 flex justify-center">
        {active && (
          <div
            lang="ja"
            className="min-h-[44px] rounded-xl border-2 border-neutral-100 bg-neutral-800 px-8 py-4 text-3xl text-neutral-100"
          >
            {active.prompt.text}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {romajiOrder.map((romaji) => {
          const isResolved = exercises.some((e) => resolvedIds.has(e.itemId) && romajiOf(e) === romaji)
          if (isResolved) return null

          const isTapped = pending?.tappedRomaji === romaji
          const isCorrectAnswerReveal = pending && !pending.wasCorrect && romaji === romajiOf(pending.exercise)
          const highlight = isTapped
            ? pending!.wasCorrect
              ? 'border-green-500 bg-green-500/10 text-green-400'
              : 'border-red-500 bg-red-500/10 text-red-400'
            : isCorrectAnswerReveal
              ? 'border-green-500 bg-green-500/10 text-green-400'
              : 'border-neutral-700 bg-neutral-900 text-neutral-200 disabled:opacity-50'

          return (
            <button
              key={romaji}
              type="button"
              onClick={() => handleRomajiTap(romaji)}
              disabled={!active || !!pending}
              className={`min-h-[44px] rounded-xl border-2 px-4 py-3 text-lg font-medium transition-colors ${highlight}`}
            >
              {romaji}
            </button>
          )
        })}
      </div>
    </div>
  )
}
