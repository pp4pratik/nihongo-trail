import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SessionScreen } from '@/app/screens/SessionScreen'
import { progressStore } from '@/storage/db'
import { NihongoTrailDb } from '@/storage/schema'

// Regression test for a bug caught via manual browser verification: React
// StrictMode intentionally double-invokes effects in dev mode, and
// SessionScreen's mount effect built + persisted a brand-new session on
// each invocation — so a single "Start lesson" click silently created two
// sessions for the same lesson, leaving an orphaned active one with zero
// progress sitting in IndexedDB. The fix checks for an already-active
// session on the same lesson before building a new one.

vi.mock('@/content/loadCurriculum', () => ({
  loadCurriculumContent: vi.fn().mockResolvedValue({
    stages: [],
    units: [],
    lessons: [
      {
        id: 'lesson:test:0',
        unitId: 'unit:test',
        index: 0,
        kind: 'kana_intro',
        title: 'あ',
        introducesItems: ['kana:hiragana:あ'],
        practicesItems: ['kana:hiragana:あ'],
        exerciseTemplates: [
          { type: '7.15', itemId: 'kana:hiragana:あ' },
          { type: '7.1', itemId: 'kana:hiragana:あ' },
        ],
        estimatedMinutes: 5,
      },
    ],
  }),
  findLesson: (c: { lessons: Array<{ id: string }> }, id: string) =>
    c.lessons.find((l) => l.id === id),
}))

vi.mock('@/content/loadKana', () => ({
  loadKanaContent: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'kana:hiragana:あ',
        type: 'kana',
        script: 'hiragana',
        char: 'あ',
        romaji: ['a'],
        group: 'basic',
        confusableWith: [],
        audioUrl: '',
      },
    ],
  }),
}))

async function countSessions(): Promise<number> {
  const db = (progressStore as unknown as { db: NihongoTrailDb }).db
  return db.sessions.count()
}

beforeEach(async () => {
  const db = (progressStore as unknown as { db: NihongoTrailDb }).db
  await db.sessions.clear()
})

describe('SessionScreen — StrictMode double-invoke does not create duplicate sessions', () => {
  it('renders under StrictMode (double-mounts the effect) and persists exactly one session', async () => {
    render(
      <StrictMode>
        <MemoryRouter
          initialEntries={[{ pathname: '/session', state: { lessonId: 'lesson:test:0' } }]}
        >
          <Routes>
            <Route path="/session" element={<SessionScreen />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    )

    await waitFor(() => expect(screen.getByText('あ')).toBeInTheDocument())
    // Give any second (StrictMode-duplicated) effect invocation a chance
    // to finish its async work before asserting the count.
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(await countSessions()).toBe(1)
  })
})
