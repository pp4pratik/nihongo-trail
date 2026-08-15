import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MultipleChoiceExercise } from '@/features/exercises/MultipleChoiceExercise'
import type { ResolvedExercise } from '@/types'

const exercise: ResolvedExercise = {
  index: 0,
  type: '7.1',
  cardId: 'kana:hiragana:あ::recognise',
  itemId: 'kana:hiragana:あ',
  prompt: { text: 'あ' },
  options: [
    { id: 'correct', text: 'a', isCorrect: true },
    { id: 'd1', text: 'i', isCorrect: false },
    { id: 'd2', text: 'u', isCorrect: false },
    { id: 'd3', text: 'e', isCorrect: false },
  ],
  correctAnswer: 'a',
}

describe('MultipleChoiceExercise', () => {
  it('renders the prompt and all 4 options', () => {
    render(<MultipleChoiceExercise exercise={exercise} onAnswer={vi.fn()} />)
    expect(screen.getByText('あ')).toBeInTheDocument()
    for (const opt of exercise.options!) {
      expect(screen.getByText(opt.text)).toBeInTheDocument()
    }
  })

  it('calls onAnswer with the tapped option id', async () => {
    const onAnswer = vi.fn()
    render(<MultipleChoiceExercise exercise={exercise} onAnswer={onAnswer} />)
    await userEvent.click(screen.getByText('i'))
    expect(onAnswer).toHaveBeenCalledWith('d1')
  })

  it('disables all options once feedback is present', async () => {
    const onAnswer = vi.fn()
    const { rerender } = render(<MultipleChoiceExercise exercise={exercise} onAnswer={onAnswer} />)
    await userEvent.click(screen.getByText('a'))
    rerender(
      <MultipleChoiceExercise
        exercise={exercise}
        onAnswer={onAnswer}
        feedback={{ wasCorrect: true, correctText: 'a' }}
      />,
    )
    // Tapping again after feedback must not fire a second onAnswer call.
    await userEvent.click(screen.getByText('u'))
    expect(onAnswer).toHaveBeenCalledTimes(1)
  })
})
