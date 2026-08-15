import { describe, it, expect } from 'vitest'
import { gradeAnswer } from '@/features/session/grading'
import type { ResolvedExercise } from '@/types'

function mc(overrides: Partial<ResolvedExercise> = {}): ResolvedExercise {
  return {
    index: 0,
    type: '7.1',
    itemId: 'kana:hiragana:あ',
    prompt: { text: 'あ' },
    options: [
      { id: 'correct', text: 'a', isCorrect: true },
      { id: 'distractor-0', text: 'i', isCorrect: false },
    ],
    correctAnswer: 'a',
    ...overrides,
  }
}

describe('gradeAnswer', () => {
  it('7.15 teaching card is always correct — not graded', () => {
    const exercise = mc({ type: '7.15', options: undefined })
    expect(gradeAnswer(exercise, 'anything', 'hiragana').wasCorrect).toBe(true)
  })

  it('7.1 recognition: correct when the selected option id isCorrect', () => {
    expect(gradeAnswer(mc({ type: '7.1' }), 'correct', 'hiragana').wasCorrect).toBe(true)
    expect(gradeAnswer(mc({ type: '7.1' }), 'distractor-0', 'hiragana').wasCorrect).toBe(false)
  })

  it('7.2 recall: same option-based grading as 7.1', () => {
    expect(gradeAnswer(mc({ type: '7.2' }), 'correct', 'hiragana').wasCorrect).toBe(true)
  })

  it('7.12 matching: grades by comparing the paired romaji directly against correctAnswer (no options)', () => {
    const exercise = mc({ type: '7.12', options: undefined, correctAnswer: 'a' })
    expect(gradeAnswer(exercise, 'a', 'hiragana').wasCorrect).toBe(true)
    expect(gradeAnswer(exercise, 'i', 'hiragana').wasCorrect).toBe(false)
  })

  it('an unknown option id grades as incorrect, not a crash', () => {
    expect(gradeAnswer(mc({ type: '7.1' }), 'not-a-real-option', 'hiragana').wasCorrect).toBe(
      false,
    )
  })

  it('7.3 typing: accepts any valid romanisation via romajiToKana', () => {
    const exercise = mc({ type: '7.3', itemId: 'kana:hiragana:し', correctAnswer: 'し' })
    expect(gradeAnswer(exercise, 'shi', 'hiragana').wasCorrect).toBe(true)
    expect(gradeAnswer(exercise, 'si', 'hiragana').wasCorrect).toBe(true)
    expect(gradeAnswer(exercise, 'chi', 'hiragana').wasCorrect).toBe(false)
  })

  it('7.3 typing grades against the correct script', () => {
    const exercise = mc({ type: '7.3', itemId: 'kana:katakana:シ', correctAnswer: 'シ' })
    expect(gradeAnswer(exercise, 'shi', 'katakana').wasCorrect).toBe(true)
    expect(gradeAnswer(exercise, 'shi', 'hiragana').wasCorrect).toBe(false)
  })
})
