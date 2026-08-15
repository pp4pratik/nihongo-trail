// Turns an ExerciseTemplate (curriculum blueprint) + the resolved kana item
// pool into a fully-resolved exercise (§12.5: "options pre-shuffled" —
// resolved once at session build, never regenerated, per §10.4).

import type { KanaItem } from '@/types'
import type { ExerciseTemplate } from '@/types'
import type { ResolvedExercise, ExerciseOption } from '@/types'
import type { SeededRng } from '@/lib/seededRng'
import { selectDistractors } from './distractors'

const OPTION_COUNT = 4
const MATCHING_PAIR_COUNT = 5

function cardId(itemId: string, direction: 'recognise' | 'produce'): string {
  return `${itemId}::${direction}`
}

function buildOptions(
  correctText: string,
  distractorTexts: string[],
  rng: SeededRng,
): ExerciseOption[] {
  const options: ExerciseOption[] = [
    { id: 'correct', text: correctText, isCorrect: true },
    ...distractorTexts.map((text, i) => ({ id: `distractor-${i}`, text, isCorrect: false })),
  ]
  return rng.shuffle(options)
}

/** §7.15 teaching card — not graded, cardId is undefined (§12.5). */
function buildTeachingCard(item: KanaItem, index: number): ResolvedExercise {
  return {
    index,
    type: '7.15',
    itemId: item.id,
    prompt: { text: item.char },
    correctAnswer: item.char,
    acceptedAnswers: item.romaji,
  }
}

/** §7.1 recognition — kana shown, pick the romaji (kana→sound = recognise). */
function buildRecognition(
  item: KanaItem,
  lessonPool: KanaItem[],
  fullPool: KanaItem[],
  index: number,
  rng: SeededRng,
): ResolvedExercise {
  const distractors = selectDistractors(item, lessonPool, fullPool, OPTION_COUNT - 1, rng)
  const options = buildOptions(item.romaji[0], distractors.map((d) => d.romaji[0]), rng)
  return {
    index,
    type: '7.1',
    cardId: cardId(item.id, 'recognise'),
    itemId: item.id,
    prompt: { text: item.char },
    options,
    correctAnswer: item.romaji[0],
  }
}

/** §7.2 recall — romaji shown, pick the kana (sound→kana = produce). */
function buildRecall(
  item: KanaItem,
  lessonPool: KanaItem[],
  fullPool: KanaItem[],
  index: number,
  rng: SeededRng,
): ResolvedExercise {
  const distractors = selectDistractors(item, lessonPool, fullPool, OPTION_COUNT - 1, rng)
  const options = buildOptions(item.char, distractors.map((d) => d.char), rng)
  return {
    index,
    type: '7.2',
    cardId: cardId(item.id, 'produce'),
    itemId: item.id,
    prompt: { text: item.romaji[0] },
    options,
    correctAnswer: item.char,
  }
}

/** §7.3 typing romaji-to-kana — kana→sound direction, typed instead of MC. */
function buildTyping(item: KanaItem, index: number): ResolvedExercise {
  return {
    index,
    type: '7.3',
    cardId: cardId(item.id, 'recognise'),
    itemId: item.id,
    prompt: { text: item.char },
    correctAnswer: item.char,
    acceptedAnswers: item.romaji,
  }
}

/**
 * §7.12 matching pairs — resolves to N ResolvedExercise entries sharing a
 * groupId (see docs/DECISIONS.md), each independently gradable with its
 * own SRS rating.
 */
function buildMatchingGroup(
  items: KanaItem[],
  startIndex: number,
  groupId: string,
): ResolvedExercise[] {
  return items.map((item, i) => ({
    index: startIndex + i,
    type: '7.12',
    cardId: cardId(item.id, 'recognise'),
    itemId: item.id,
    prompt: { text: item.char },
    correctAnswer: item.romaji[0],
    groupId,
  }))
}

export function buildExercisesForLesson(
  templates: ExerciseTemplate[],
  itemsById: Map<string, KanaItem>,
  pool: KanaItem[],
  lessonItemIds: string[],
  rng: SeededRng,
  groupIdSeed: string,
): ResolvedExercise[] {
  const teachingCards: ResolvedExercise[] = []
  const practice: ResolvedExercise[] = []
  let index = 0

  // §7.1: distractors prefer "the same lesson/unit" before falling back to
  // the full content pool — otherwise a beginner's first exercise for あ
  // could show an unrelated yōon syllable as a distractor instead of the
  // far more useful い/う/え/お.
  const lessonPool = lessonItemIds
    .map((id) => itemsById.get(id))
    .filter((i): i is KanaItem => i !== undefined)

  for (const template of templates) {
    const item = itemsById.get(template.itemId)
    if (!item) continue // unresolvable reference — skip rather than crash a whole session

    if (template.type === '7.15') {
      teachingCards.push(buildTeachingCard(item, index))
      index += 1
    } else if (template.type === '7.1') {
      practice.push(buildRecognition(item, lessonPool, pool, index, rng))
      index += 1
    } else if (template.type === '7.2') {
      practice.push(buildRecall(item, lessonPool, pool, index, rng))
      index += 1
    } else if (template.type === '7.3') {
      practice.push(buildTyping(item, index))
      index += 1
    }
  }

  // Matching-pairs warm-up (§7.16), synthesized from the lesson's own item
  // pool rather than a template — inherently multi-item, see distractors.ts
  // and docs/DECISIONS.md's ResolvedExercise.groupId entry. Shuffled and
  // repaired as a single atomic block (below) — collectMatchingGroup
  // (SessionPlayer) requires every same-groupId entry to stay contiguous,
  // and the session engine always grades session.currentIndex, so
  // scattering the group across the exercise list would silently strand
  // most of its pairs ungradable.
  const matchingItems = lessonItemIds
    .map((id) => itemsById.get(id))
    .filter((i): i is KanaItem => i !== undefined)
    .slice(0, MATCHING_PAIR_COUNT)
  const matchingGroup =
    matchingItems.length >= 2 ? buildMatchingGroup(matchingItems, index, `match:${groupIdSeed}`) : []

  // Shuffle at the block level (single exercises + the whole matching
  // group as one block) so the group can never be scattered apart.
  const blocks: ResolvedExercise[][] = practice.map((ex) => [ex])
  if (matchingGroup.length > 0) blocks.push(matchingGroup)
  const shuffledBlocks = rng.shuffle(blocks)
  const shuffledPractice = arrangeWithSpacing(shuffledBlocks.flat())

  // Teaching cards always precede practice — teach-then-test (§1.5, §7.0).
  return [...teachingCards, ...shuffledPractice].map((ex, i) => ({ ...ex, index: i }))
}

const MAX_REPAIR_PASSES = 3

/**
 * Best-effort repair pass enforcing §7.16's spacing constraints: no item
 * repeats within 3 exercises, no exercise type repeats more than twice
 * consecutively. Matching-pairs groups (shared groupId) are exempt from
 * the "no type repeat" rule — they're meant to run consecutively as one
 * screen.
 */
function arrangeWithSpacing(exercises: ResolvedExercise[]): ResolvedExercise[] {
  const arranged = [...exercises]

  for (let pass = 0; pass < MAX_REPAIR_PASSES; pass++) {
    let changed = false
    for (let i = 0; i < arranged.length; i++) {
      // A matching-group member is never repaired individually — moving
      // just one would split the block the shuffle deliberately kept
      // contiguous (see buildExercisesForLesson's block-level shuffle).
      if (arranged[i].groupId) continue

      const violatesItemSpacing = arranged
        .slice(Math.max(0, i - 3), i)
        .some((e) => e.itemId === arranged[i].itemId)
      const violatesTypeRun =
        i >= 2 &&
        arranged[i - 1].type === arranged[i].type &&
        arranged[i - 2].type === arranged[i].type

      if (!violatesItemSpacing && !violatesTypeRun) continue

      const swapIndex = arranged.findIndex((candidate, j) => {
        if (j <= i) return false
        if (candidate.groupId) return false // never break a matching group apart
        const itemOk = !arranged
          .slice(Math.max(0, i - 3), i)
          .some((e) => e.itemId === candidate.itemId)
        const typeOk = !(
          i >= 2 &&
          arranged[i - 1].type === candidate.type &&
          arranged[i - 2].type === candidate.type
        )
        return itemOk && typeOk
      })

      if (swapIndex > i) {
        ;[arranged[i], arranged[swapIndex]] = [arranged[swapIndex], arranged[i]]
        changed = true
      }
    }
    if (!changed) break
  }

  return arranged
}
