// §7.1 (recognition) and §7.2 (recall) — structurally identical: a prompt
// and 4 tap options, exact-match grading. They only differ in which side
// (kana vs romaji) is the prompt vs the options, which is already baked
// into the resolved exercise by buildExercise.ts.

import { useState } from 'react'
import type { ResolvedExercise } from '@/types'

export interface MultipleChoiceExerciseProps {
  exercise: ResolvedExercise
  onAnswer: (optionId: string) => void
  feedback?: { wasCorrect: boolean; correctText: string } | null
}

export function MultipleChoiceExercise({ exercise, onAnswer, feedback }: MultipleChoiceExerciseProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSelect = (optionId: string) => {
    if (feedback) return // already answered, awaiting explicit continue
    setSelectedId(optionId)
    onAnswer(optionId)
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <p lang="ja" className="text-center text-[2.5rem] leading-tight text-neutral-100">
          {exercise.prompt.text}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 pb-6">
        {exercise.options?.map((option) => {
          const isSelected = option.id === selectedId
          const showCorrect = feedback && option.isCorrect
          const showWrong = feedback && isSelected && !option.isCorrect
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              disabled={!!feedback}
              aria-pressed={isSelected}
              className={`min-h-[44px] rounded-xl border-2 px-4 py-4 text-lg font-medium transition-colors ${
                showCorrect
                  ? 'border-green-500 bg-green-500/10 text-green-400'
                  : showWrong
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : isSelected
                      ? 'border-neutral-400 bg-neutral-800 text-neutral-100'
                      : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-500'
              }`}
            >
              {option.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
