// Curriculum types (§12.2)

import type { ItemId } from './content'

export interface Stage {
  id: string
  index: number
  name: string
  description: string
  unitIds: string[]
}

export interface Unit {
  id: string
  stageId: string
  index: number
  name: string // "Family"
  theme: string
  lessonIds: string[]
  introducesItems: ItemId[]
  prerequisiteUnitIds: string[]
}

export type LessonKind = 'vocab' | 'kanji' | 'grammar' | 'mixed' | 'listening' | 'test'

// Blueprint for an exercise, concretised into a ResolvedExercise at session start (§12.5).
export interface ExerciseTemplate {
  type: string // '7.1' | 'recognition_mc' | ...
  itemId: ItemId
}

export interface Lesson {
  id: string
  unitId: string
  index: number
  kind: LessonKind
  title: string
  introducesItems: ItemId[]
  practicesItems: ItemId[]
  exerciseTemplates: ExerciseTemplate[] // blueprint; concretised at session start
  estimatedMinutes: number
}
