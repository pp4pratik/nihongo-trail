// Session types — the resume backbone (§12.5)

import type { ItemId } from './content'

export type SessionKind = 'lesson' | 'review' | 'practice' | 'test' | 'speed'
export type SessionStatus = 'active' | 'completed' | 'abandoned'

export interface ExercisePrompt {
  text?: string
  audioUrl?: string
  furigana?: string
  imageUrl?: string
}

export interface ExerciseOption {
  id: string
  text: string
  isCorrect: boolean
}

export interface ResolvedExercise {
  index: number
  type: string // '7.1' | 'recognition_mc' | ...
  cardId?: string // null for teaching cards / speed rounds
  itemId: ItemId
  prompt: ExercisePrompt
  options?: ExerciseOption[] // pre-shuffled
  correctAnswer: string | string[]
  acceptedAnswers?: string[] // normalised alternatives
  hint?: string
}

export interface ExerciseAnswer {
  exerciseIndex: number
  answeredAt: string
  rawInput: string
  wasCorrect: boolean
  responseTimeMs: number
  usedHint: boolean
  attempts: number
  srsRating?: 1 | 2 | 3 | 4
}

export interface Session {
  id: string
  schemaVersion: number // for §10.4 update-mid-session handling
  kind: SessionKind
  lessonId?: string
  startedAt: string
  lastActiveAt: string
  completedAt?: string
  status: SessionStatus

  exercises: ResolvedExercise[] // fully resolved at start — never regenerated
  currentIndex: number
  answers: ExerciseAnswer[]

  xpEarned: number
  heartsLost: number
  correctCount: number
  incorrectCount: number
}
