import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TypingExercise } from '@/features/exercises/TypingExercise'
import type { ResolvedExercise } from '@/types'

const exercise: ResolvedExercise = {
  index: 0,
  type: '7.3',
  cardId: 'kana:hiragana:し::recognise',
  itemId: 'kana:hiragana:し',
  prompt: { text: 'し' },
  correctAnswer: 'し',
  acceptedAnswers: ['shi', 'si'],
}

describe('TypingExercise', () => {
  it('live-converts typed romaji to kana as a preview', async () => {
    render(<TypingExercise exercise={exercise} script="hiragana" onAnswer={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText('romaji…'), 'shi')
    expect(screen.getAllByText('し')).toHaveLength(2) // prompt + live preview
  })

  it('accepts the Kunrei variant too', async () => {
    render(<TypingExercise exercise={exercise} script="hiragana" onAnswer={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText('romaji…'), 'si')
    expect(screen.getAllByText('し')).toHaveLength(2) // prompt + live preview
  })

  it('submits the raw typed input on Check', async () => {
    const onAnswer = vi.fn()
    render(<TypingExercise exercise={exercise} script="hiragana" onAnswer={onAnswer} />)
    await userEvent.type(screen.getByPlaceholderText('romaji…'), 'shi')
    await userEvent.click(screen.getByText('Check'))
    expect(onAnswer).toHaveBeenCalledWith('shi')
  })

  it('submits on Enter', async () => {
    const onAnswer = vi.fn()
    render(<TypingExercise exercise={exercise} script="hiragana" onAnswer={onAnswer} />)
    await userEvent.type(screen.getByPlaceholderText('romaji…'), 'shi{Enter}')
    expect(onAnswer).toHaveBeenCalledWith('shi')
  })

  it('the Check button is disabled with empty input', () => {
    render(<TypingExercise exercise={exercise} script="hiragana" onAnswer={vi.fn()} />)
    expect(screen.getByText('Check')).toBeDisabled()
  })
})
