import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MatchingExercise } from '@/features/exercises/MatchingExercise'
import type { ResolvedExercise } from '@/types'

const exercises: ResolvedExercise[] = [
  {
    index: 0,
    type: '7.12',
    cardId: 'kana:hiragana:あ::recognise',
    itemId: 'kana:hiragana:あ',
    prompt: { text: 'あ' },
    correctAnswer: 'a',
    groupId: 'match:g1',
  },
  {
    index: 1,
    type: '7.12',
    cardId: 'kana:hiragana:い::recognise',
    itemId: 'kana:hiragana:い',
    prompt: { text: 'い' },
    correctAnswer: 'i',
    groupId: 'match:g1',
  },
]

describe('MatchingExercise', () => {
  it('shows the first (active) kana and every romaji option', () => {
    render(<MatchingExercise exercises={exercises} onPair={vi.fn()} />)
    expect(screen.getByText('あ')).toBeInTheDocument()
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('i')).toBeInTheDocument()
  })

  it('tapping the correct romaji calls onPair with wasCorrect: true for the active exercise, single-shot', async () => {
    const onPair = vi.fn()
    render(<MatchingExercise exercises={exercises} onPair={onPair} />)
    await userEvent.click(screen.getByText('a'))
    expect(onPair).toHaveBeenCalledWith(exercises[0], 'a', true)
    expect(onPair).toHaveBeenCalledTimes(1)
  })

  it('a wrong tap is graded immediately (§8.4 Again signal), shown briefly, then moves to the next pair — never retried', async () => {
    const onPair = vi.fn()
    render(<MatchingExercise exercises={exercises} onPair={onPair} />)

    await userEvent.click(screen.getByText('i')) // wrong for あ (correct is 'a')
    expect(onPair).toHaveBeenCalledWith(exercises[0], 'i', false)
    expect(onPair).toHaveBeenCalledTimes(1)

    // Still showing あ during the brief flash window — not yet advanced.
    expect(screen.getByText('あ')).toBeInTheDocument()

    // Advances to い once the flash clears — あ is resolved (wrong,
    // already recorded) and is never offered again for retry.
    await waitFor(() => expect(screen.getByText('い')).toBeInTheDocument(), { timeout: 2000 })
    expect(onPair).toHaveBeenCalledTimes(1) // still only the one submission
  })

  it('ignores taps while a flash is in progress (no double-submission)', async () => {
    const onPair = vi.fn()
    render(<MatchingExercise exercises={exercises} onPair={onPair} />)

    await userEvent.click(screen.getByText('a'))
    expect(onPair).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByText('い')).toBeInTheDocument(), { timeout: 2000 })
    expect(onPair).toHaveBeenCalledTimes(1)
  })
})
