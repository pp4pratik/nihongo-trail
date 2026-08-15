import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { HIRAGANA_CONFUSABLE_GROUPS, KATAKANA_CONFUSABLE_GROUPS } from '@/lib/kanaTable'
import type { Stage, Unit, Lesson } from '@/types'

interface CurriculumContent {
  stages: Stage[]
  units: Unit[]
  lessons: Lesson[]
}

function readCurriculum(): CurriculumContent {
  const path = resolve(process.cwd(), 'public/content/curriculum.json')
  return JSON.parse(readFileSync(path, 'utf-8')) as CurriculumContent
}

const content = readCurriculum()

describe('generated public/content/curriculum.json — §6.6 validation invariants', () => {
  it('every lesson references only item IDs that exist in kana.json', () => {
    const kanaContent = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/content/kana.json'), 'utf-8'),
    ) as { items: Array<{ id: string }> }
    const validIds = new Set(kanaContent.items.map((i) => i.id))
    for (const lesson of content.lessons) {
      for (const id of [...lesson.introducesItems, ...lesson.practicesItems]) {
        expect(validIds.has(id)).toBe(true)
      }
      for (const template of lesson.exerciseTemplates) {
        expect(validIds.has(template.itemId)).toBe(true)
      }
    }
  })

  it('every item is introduced exactly once across the whole curriculum', () => {
    const introduced = content.lessons.flatMap((l) => l.introducesItems)
    const counts = new Map<string, number>()
    for (const id of introduced) counts.set(id, (counts.get(id) ?? 0) + 1)
    const duplicates = [...counts.entries()].filter(([, count]) => count > 1)
    expect(duplicates).toEqual([])
    // 104 hiragana + 104 katakana = 208 total.
    expect(introduced.length).toBe(208)
  })

  it('no lesson exceeds 18 exercises', () => {
    for (const lesson of content.lessons) {
      expect(lesson.exerciseTemplates.length).toBeLessThanOrEqual(18)
    }
  })

  it('no orphan items — every kana item is referenced by some lesson', () => {
    const kanaContent = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/content/kana.json'), 'utf-8'),
    ) as { items: Array<{ id: string }> }
    const referenced = new Set(content.lessons.flatMap((l) => l.practicesItems))
    for (const item of kanaContent.items) {
      expect(referenced.has(item.id)).toBe(true)
    }
  })

  it('every confusion-pair member is introduced in a different lesson from its partner', () => {
    const lessonOfItem = new Map<string, string>()
    for (const lesson of content.lessons) {
      for (const id of lesson.introducesItems) lessonOfItem.set(id, lesson.id)
    }

    for (const group of HIRAGANA_CONFUSABLE_GROUPS) {
      const lessonsForGroup = group.map((char) => lessonOfItem.get(`kana:hiragana:${char}`))
      expect(new Set(lessonsForGroup).size).toBe(lessonsForGroup.length)
    }
    for (const group of KATAKANA_CONFUSABLE_GROUPS) {
      const lessonsForGroup = group.map((char) => lessonOfItem.get(`kana:katakana:${char}`))
      expect(new Set(lessonsForGroup).size).toBe(lessonsForGroup.length)
    }
  })
})

describe('generated curriculum — structural consistency', () => {
  it('stage references valid unit IDs, units reference valid lesson IDs', () => {
    const unitIds = new Set(content.units.map((u) => u.id))
    const lessonIds = new Set(content.lessons.map((l) => l.id))
    for (const stage of content.stages) {
      for (const unitId of stage.unitIds) expect(unitIds.has(unitId)).toBe(true)
    }
    for (const unit of content.units) {
      for (const lessonId of unit.lessonIds) expect(lessonIds.has(lessonId)).toBe(true)
    }
  })

  it('no duplicate lesson, unit, or stage IDs', () => {
    expect(new Set(content.lessons.map((l) => l.id)).size).toBe(content.lessons.length)
    expect(new Set(content.units.map((u) => u.id)).size).toBe(content.units.length)
    expect(new Set(content.stages.map((s) => s.id)).size).toBe(content.stages.length)
  })

  it('katakana unit is gated behind hiragana via prerequisiteUnitIds (§5.3)', () => {
    const katakana = content.units.find((u) => u.name === 'Katakana')
    const hiragana = content.units.find((u) => u.name === 'Hiragana')
    expect(katakana?.prerequisiteUnitIds).toEqual([hiragana?.id])
  })

  it('every 3rd lesson (per script) is a mixed review of the preceding two (§5.3)', () => {
    for (const unit of content.units) {
      const lessons = unit.lessonIds
        .map((id) => content.lessons.find((l) => l.id === id)!)
        .sort((a, b) => a.index - b.index)
      let sinceReview = 0
      for (const lesson of lessons) {
        if (lesson.kind === 'kana_review') {
          expect(sinceReview).toBeGreaterThanOrEqual(1)
          expect(sinceReview).toBeLessThanOrEqual(2)
          sinceReview = 0
        } else {
          sinceReview += 1
        }
      }
    }
  })
})
