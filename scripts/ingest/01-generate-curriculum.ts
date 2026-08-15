// Stage 0 curriculum generator (§5.1-§5.3). Chunks kana into lessons of
// ~5 characters, inserting a mixed-review lesson every 3rd lesson, per
// §5.3's introduction order. Deviates from strict gojūon-row grouping
// where needed to satisfy §5.5 rule 5 (confusable-set members never
// introduced in the same lesson) — see docs/DECISIONS.md.
//
// Run via `npm run content:build` (chained after 00-generate-kana.ts).

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KANA_TABLE, type KanaGroup, type KanaTableEntry } from '../../src/lib/kanaTable'
import { confusableMapForScript, anyConfusableWithLesson } from '../../src/lib/kanaConfusables'
import type { Stage, Unit, Lesson, ExerciseTemplate } from '../../src/types/curriculum'
import type { ItemId } from '../../src/types/content'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, '../../public/content/curriculum.json')

type Script = 'hiragana' | 'katakana'

function kanaId(script: Script, char: string): ItemId {
  return `kana:${script}:${char}`
}

function charOf(entry: KanaTableEntry, script: Script): string {
  return script === 'hiragana' ? entry.hiragana : entry.katakana
}

const TARGET_LESSON_SIZE = 5
const GROUP_ORDER: KanaGroup[] = ['basic', 'dakuten', 'handakuten', 'yoon']

/**
 * Greedily chunks a script's kana entries (in table order) into lessons,
 * deferring an entry to the next lesson whenever adding it would put two
 * confusable-set members together (§5.5 rule 5).
 */
function chunkIntoLessons(script: Script, confusables: Map<string, string[]>): KanaTableEntry[][] {
  const lessons: KanaTableEntry[][] = []
  let current: KanaTableEntry[] = []
  let currentChars: string[] = []

  for (const group of GROUP_ORDER) {
    for (const entry of KANA_TABLE.filter((e) => e.group === group)) {
      const char = charOf(entry, script)
      const wouldCollide = anyConfusableWithLesson(char, currentChars, confusables)
      if (wouldCollide || current.length >= TARGET_LESSON_SIZE) {
        if (current.length > 0) lessons.push(current)
        current = []
        currentChars = []
      }
      current.push(entry)
      currentChars.push(char)
    }
  }
  if (current.length > 0) lessons.push(current)
  return lessons
}

function introLessonTemplates(itemIds: ItemId[]): ExerciseTemplate[] {
  // §7.16 New-state guidance: teaching card first, then recognition.
  // Matching-pairs (7.12) is synthesized by the session engine from the
  // lesson's item pool at session-build time, not enumerated here — it's
  // inherently multi-item and §12.2's ExerciseTemplate is one-item-per-entry.
  return itemIds.flatMap((itemId) => [
    { type: '7.15', itemId },
    { type: '7.1', itemId },
  ])
}

function reviewLessonTemplates(itemIds: ItemId[]): ExerciseTemplate[] {
  const types = ['7.1', '7.2', '7.3']
  return itemIds.map((itemId, i) => ({ type: types[i % types.length], itemId }))
}

function buildLessonsForScript(script: Script, unitId: string): Lesson[] {
  const confusables = confusableMapForScript(script)
  const chunks = chunkIntoLessons(script, confusables)

  const lessons: Lesson[] = []
  let index = 0
  let sinceReview: KanaTableEntry[][] = []

  for (const chunk of chunks) {
    const itemIds = chunk.map((entry) => kanaId(script, charOf(entry, script)))
    const title = chunk.map((entry) => charOf(entry, script)).join(' ')

    lessons.push({
      id: `lesson:stage0:${unitId}:${index}`,
      unitId,
      index,
      kind: 'kana_intro',
      title,
      introducesItems: itemIds,
      practicesItems: itemIds,
      exerciseTemplates: introLessonTemplates(itemIds),
      estimatedMinutes: 8,
    })
    index += 1
    sinceReview.push(chunk)

    if (sinceReview.length === 2) {
      const reviewItemIds = sinceReview.flat().map((entry) => kanaId(script, charOf(entry, script)))
      const reviewTitle = `Review: ${sinceReview.map((c) => c.map((e) => charOf(e, script)).join('')).join(' + ')}`
      lessons.push({
        id: `lesson:stage0:${unitId}:${index}`,
        unitId,
        index,
        kind: 'kana_review',
        title: reviewTitle,
        introducesItems: [],
        practicesItems: reviewItemIds,
        exerciseTemplates: reviewLessonTemplates(reviewItemIds),
        estimatedMinutes: 10,
      })
      index += 1
      sinceReview = []
    }
  }

  // Trailing 1-2 lessons since the last review, if any: one final review.
  if (sinceReview.length > 0) {
    const reviewItemIds = sinceReview.flat().map((entry) => kanaId(script, charOf(entry, script)))
    const reviewTitle = `Review: ${sinceReview.map((c) => c.map((e) => charOf(e, script)).join('')).join(' + ')}`
    lessons.push({
      id: `lesson:stage0:${unitId}:${index}`,
      unitId,
      index,
      kind: 'kana_review',
      title: reviewTitle,
      introducesItems: [],
      practicesItems: reviewItemIds,
      exerciseTemplates: reviewLessonTemplates(reviewItemIds),
      estimatedMinutes: 10,
    })
  }

  return lessons
}

const hiraganaUnitId = 'unit:stage0:hiragana'
const katakanaUnitId = 'unit:stage0:katakana'

const hiraganaLessons = buildLessonsForScript('hiragana', hiraganaUnitId)
const katakanaLessons = buildLessonsForScript('katakana', katakanaUnitId)

const hiraganaUnit: Unit = {
  id: hiraganaUnitId,
  stageId: 'stage:0',
  index: 0,
  name: 'Hiragana',
  theme: 'Kana Foundations — Hiragana',
  lessonIds: hiraganaLessons.map((l) => l.id),
  introducesItems: hiraganaLessons.flatMap((l) => l.introducesItems),
  prerequisiteUnitIds: [],
}

const katakanaUnit: Unit = {
  id: katakanaUnitId,
  stageId: 'stage:0',
  index: 1,
  name: 'Katakana',
  theme: 'Kana Foundations — Katakana',
  lessonIds: katakanaLessons.map((l) => l.id),
  introducesItems: katakanaLessons.flatMap((l) => l.introducesItems),
  // Structural prerequisite only. The retrievability-threshold gate itself
  // (§5.3: hiragana avg retrievability ≥ 0.85 across all 46 basic
  // characters) is a runtime check against live FSRS state, not something
  // a static curriculum file can express — enforced by the session engine
  // when deciding unit availability, using this prerequisite as the
  // "which unit to check" pointer.
  prerequisiteUnitIds: [hiraganaUnitId],
}

const stage0: Stage = {
  id: 'stage:0',
  index: 0,
  name: 'Kana Foundations',
  description: 'Hiragana, then katakana. No kanji, no grammar. (§5.2)',
  unitIds: [hiraganaUnitId, katakanaUnitId],
}

const output = {
  stages: [stage0],
  units: [hiraganaUnit, katakanaUnit],
  lessons: [...hiraganaLessons, ...katakanaLessons],
}

mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n')

console.log(
  `Wrote ${output.lessons.length} lessons (${hiraganaLessons.length} hiragana, ${katakanaLessons.length} katakana) to ${OUTPUT_PATH}`,
)
