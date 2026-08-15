// §7.15 teaching card — new item introduction, not graded. "Got it" to
// continue. Satisfies teach-then-test (§1.5).

import type { ResolvedExercise } from '@/types'

export interface TeachingCardProps {
  exercise: ResolvedExercise
  onAcknowledge: () => void
}

export function TeachingCard({ exercise, onAcknowledge }: TeachingCardProps) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
        <p lang="ja" className="text-center text-[4rem] leading-tight text-neutral-100">
          {exercise.prompt.text}
        </p>
        {exercise.acceptedAnswers && exercise.acceptedAnswers.length > 0 && (
          <p className="text-xl text-neutral-400">{exercise.acceptedAnswers.join(' / ')}</p>
        )}
      </div>
      <div className="px-4 pb-6">
        <button
          type="button"
          onClick={onAcknowledge}
          className="min-h-[44px] w-full rounded-xl bg-neutral-100 px-4 py-3 text-lg font-semibold text-neutral-950"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
