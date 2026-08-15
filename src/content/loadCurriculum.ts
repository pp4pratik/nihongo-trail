// Content loading (§13.4): curriculum.json is always loaded eagerly.

import type { Stage, Unit, Lesson } from '@/types'

export interface CurriculumContent {
  stages: Stage[]
  units: Unit[]
  lessons: Lesson[]
}

export async function loadCurriculumContent(): Promise<CurriculumContent> {
  const res = await fetch('/content/curriculum.json')
  if (!res.ok) {
    throw new Error(`Failed to load curriculum content: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<CurriculumContent>
}

export function findLesson(content: CurriculumContent, lessonId: string): Lesson | undefined {
  return content.lessons.find((l) => l.id === lessonId)
}

export function findUnit(content: CurriculumContent, unitId: string): Unit | undefined {
  return content.units.find((u) => u.id === unitId)
}

/** The first lesson of a unit, ordered by index — the entry point when a
 * learner has no progress in this unit yet. */
export function firstLessonOf(content: CurriculumContent, unitId: string): Lesson | undefined {
  return content.lessons
    .filter((l) => l.unitId === unitId)
    .sort((a, b) => a.index - b.index)[0]
}
