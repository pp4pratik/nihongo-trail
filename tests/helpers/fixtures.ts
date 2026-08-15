import type { SrsCard, ReviewLogEntry, Session } from '@/types'

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
