// Distractor generation for recognition/recall exercises (§7.1, §7.2).
// Deterministic given the injected RNG — required for the resume contract
// (§10.4: the same session must reproduce the same distractors on resume).

import type { KanaItem } from '@/types'
import type { SeededRng } from '@/lib/seededRng'

/**
 * §7.1: "1 from the confusion set if one exists, 2 from the same
 * lesson/unit, remainder from same part-of-speech pool." For kana, "same
 * part-of-speech pool" collapses to "the rest of the full content pool" —
 * kana has no part-of-speech notion. `lessonPool` is the lesson's own
 * items — preferred over `fullPool` so a beginner sees plausible
 * same-lesson peers (い/う/え/お for あ) rather than an unrelated yōon
 * syllable, which is a trivially-obvious-wrong distractor that doesn't
 * actually test discrimination.
 */
export function selectDistractors(
  target: KanaItem,
  lessonPool: KanaItem[],
  fullPool: KanaItem[],
  count: number,
  rng: SeededRng,
): KanaItem[] {
  const confusableIds = new Set(target.confusableWith)
  const excludeId = (item: KanaItem) => item.id !== target.id

  const confusableCandidates = fullPool.filter((c) => excludeId(c) && confusableIds.has(c.id))
  const distractors: KanaItem[] = []
  if (confusableCandidates.length > 0) {
    distractors.push(...rng.sample(confusableCandidates, 1))
  }

  const picked = () => new Set(distractors.map((d) => d.id))

  let remaining = count - distractors.length
  if (remaining > 0) {
    const lessonCandidates = lessonPool.filter((c) => excludeId(c) && !picked().has(c.id))
    distractors.push(...rng.sample(lessonCandidates, Math.min(remaining, lessonCandidates.length)))
  }

  remaining = count - distractors.length
  if (remaining > 0) {
    const restCandidates = fullPool.filter(
      (c) => excludeId(c) && !confusableIds.has(c.id) && !picked().has(c.id),
    )
    distractors.push(...rng.sample(restCandidates, Math.min(remaining, restCandidates.length)))
  }

  return distractors
}
