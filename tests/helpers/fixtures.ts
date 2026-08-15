import type { SrsCard, ReviewLogEntry, Session, KanaItem, Lesson } from '@/types'

/** A small, self-contained kana pool for session-engine tests — deliberately
 * tiny compared to the real 208-item content so tests stay fast and easy
 * to reason about. Includes one confusable pair (め/ぬ) on purpose. */
export function makeKanaPool(): KanaItem[] {
  const entries: Array<[string, string, string[]]> = [
    ['あ', 'kana:hiragana:あ', ['a']],
    ['い', 'kana:hiragana:い', ['i']],
    ['う', 'kana:hiragana:う', ['u']],
    ['え', 'kana:hiragana:え', ['e']],
    ['お', 'kana:hiragana:お', ['o']],
    ['め', 'kana:hiragana:め', ['me']],
    ['ぬ', 'kana:hiragana:ぬ', ['nu']],
  ]
  return entries.map(([char, id, romaji]) => ({
    id,
    type: 'kana',
    script: 'hiragana',
    char,
    romaji,
    group: 'basic',
    confusableWith:
      char === 'め' ? ['kana:hiragana:ぬ'] : char === 'ぬ' ? ['kana:hiragana:め'] : [],
    audioUrl: `/audio/kana/hiragana/${encodeURIComponent(char)}.opus`,
  }))
}

export function makeIntroLesson(overrides: Partial<Lesson> = {}): Lesson {
  const itemIds = ['kana:hiragana:あ', 'kana:hiragana:い', 'kana:hiragana:う']
  return {
    id: 'lesson:test:0',
    unitId: 'unit:test',
    index: 0,
    kind: 'kana_intro',
    title: 'あ い う',
    introducesItems: itemIds,
    practicesItems: itemIds,
    exerciseTemplates: itemIds.flatMap((itemId) => [
      { type: '7.15', itemId },
      { type: '7.1', itemId },
    ]),
    estimatedMinutes: 8,
    ...overrides,
  }
}

export function makeCard(overrides: Partial<SrsCard> = {}): SrsCard {
  return {
    cardId: 'kana:hiragana:あ::recognise',
    itemId: 'kana:hiragana:あ',
    itemType: 'kana',
    direction: 'recognise',
    due: '2026-01-01T00:00:00.000Z',
    stability: 1,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    learningStep: 0,
    reps: 0,
    lapses: 0,
    state: 'New',
    introducedAt: '2026-01-01T00:00:00.000Z',
    isLeech: false,
    isSuspended: false,
    ...overrides,
  }
}

export function makeReviewLogEntry(overrides: Partial<ReviewLogEntry> = {}): ReviewLogEntry {
  return {
    id: crypto.randomUUID(),
    cardId: 'kana:hiragana:あ::recognise',
    reviewedAt: '2026-01-01T00:05:00.000Z',
    rating: 3,
    state: 'New',
    elapsedDays: 0,
    scheduledDays: 1,
    exerciseType: '7.1',
    responseTimeMs: 1200,
    wasCorrect: true,
    usedHint: false,
    sessionId: 'session-1',
    ...overrides,
  }
}

export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    schemaVersion: 1,
    kind: 'lesson',
    startedAt: '2026-01-01T00:00:00.000Z',
    lastActiveAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    exercises: [],
    currentIndex: 0,
    answers: [],
    xpEarned: 0,
    heartsLost: 0,
    correctCount: 0,
    incorrectCount: 0,
    ...overrides,
  }
}
