// §7.3 typing romaji-to-kana. Live-converts the typed buffer on every
// keystroke via the same romajiToKana used for grading (§15.5), so the
// preview and the grade are always consistent with each other.

import { useState } from 'react'
import type { ResolvedExercise } from '@/types'
import { romajiToKana, type KanaScript } from '@/lib/romajiKana'

export interface TypingExerciseProps {
  exercise: ResolvedExercise
  script: KanaScript
  onAnswer: (rawInput: string) => void
  feedback?: { wasCorrect: boolean; correctText: string; acceptedRomaji: string[] } | null
}

export function TypingExercise({ exercise, script, onAnswer, feedback }: TypingExerciseProps) {
  const [input, setInput] = useState('')
  const preview = romajiToKana(input, script)

  const submit = () => {
    if (feedback || input.trim().length === 0) return
    onAnswer(input)
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
        <p lang="ja" className="text-center text-[2.5rem] leading-tight text-neutral-100">
          {exercise.prompt.text}
        </p>
        <p className="text-sm text-neutral-500">What does this sound like? Type the romaji.</p>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-6">
        <div
          lang="ja"
          className="min-h-[44px] rounded-xl border-2 border-neutral-700 bg-neutral-900 px-4 py-3 text-2xl text-neutral-100"
        >
          {preview || <span className="text-neutral-600">…</span>}
        </div>
        <input
          type="text"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={input}
          disabled={!!feedback}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="romaji…"
          className="min-h-[44px] rounded-xl border-2 border-neutral-700 bg-neutral-950 px-4 py-3 text-lg text-neutral-100 placeholder:text-neutral-600"
        />
        {feedback && !feedback.wasCorrect && (
          <p className="text-sm text-neutral-400">
            Expected: <span lang="ja">{feedback.correctText}</span> — accepted:{' '}
            {feedback.acceptedRomaji.join(', ')}
          </p>
        )}
        {!feedback && (
          <button
            type="button"
            onClick={submit}
            disabled={input.trim().length === 0}
            className="min-h-[44px] rounded-xl bg-neutral-100 px-4 py-3 text-lg font-semibold text-neutral-950 disabled:opacity-40"
          >
            Check
          </button>
        )}
      </div>
    </div>
  )
}
