import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeachingCard } from '@/features/exercises/TeachingCard'
import type { ResolvedExercise } from '@/types'

const exercise: ResolvedExercise = {
  index: 0,
  type: '7.15',
  itemId: 'kana:hiragana:あ',
  prompt: { text: 'あ' },
  correctAnswer: 'あ',
  acceptedAnswers: ['a'],
}

describe('TeachingCard', () => {
  it('renders the character and its romaji', () => {
    render(<TeachingCard exercise={exercise} onAcknowledge={vi.fn()} />)
    expect(screen.getByText('あ')).toBeInTheDocument()
    expect(screen.getByText('a')).toBeInTheDocument()
  })

  it('calls onAcknowledge when "Got it" is tapped', async () => {
    const onAcknowledge = vi.fn()
    render(<TeachingCard exercise={exercise} onAcknowledge={onAcknowledge} />)
    await userEvent.click(screen.getByText('Got it'))
    expect(onAcknowledge).toHaveBeenCalledOnce()
  })
})
