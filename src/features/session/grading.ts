// Grading (§7 per-type rules) and SRS rating mapping (§8.4).

import type { ResolvedExercise } from '@/types'
import { isCorrectRomaji, type KanaScript } from '@/lib/romajiKana'

export interface GradeResult {
  wasCorrect: boolean
}

/**
 * Grades a raw answer against a resolved exercise.
 * - 7.1 / 7.2: `rawInput` is the selected option id, graded via `options`.
 * - 7.12: `rawInput` is the romaji tile text the learner paired with this
 *   kana tile — matching entries carry no `options` (they're not MC), so
 *   grading compares directly against `correctAnswer`.
 * - 7.3: `rawInput` is typed romaji, graded via the romaji↔kana converter.
 * - 7.15: teaching cards are never graded — accepting one is always
 *   "correct" so the UI can advance.
 */
export function gradeAnswer(
  exercise: ResolvedExercise,
  rawInput: string,
  script: KanaScript,
): GradeResult {
  if (exercise.type === '7.15') {
    return { wasCorrect: true }
  }

  if (exercise.type === '7.1' || exercise.type === '7.2') {
    const selected = exercise.options?.find((o) => o.id === rawInput)
    return { wasCorrect: selected?.isCorrect ?? false }
  }

  if (exercise.type === '7.12') {
    const target = Array.isArray(exercise.correctAnswer)
      ? exercise.correctAnswer[0]
      : exercise.correctAnswer
    return { wasCorrect: rawInput === target }
  }

  if (exercise.type === '7.3') {
    const target = Array.isArray(exercise.correctAnswer)
      ? exercise.correctAnswer[0]
      : exercise.correctAnswer
    return { wasCorrect: isCorrectRomaji(rawInput, target, script) }
  }

  return { wasCorrect: false }
}
