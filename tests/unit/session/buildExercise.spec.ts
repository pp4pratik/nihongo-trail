import { describe, it, expect } from 'vitest'
import { buildExercisesForLesson } from '@/features/session/buildExercise'
import { selectDistractors } from '@/features/session/distractors'
import { SeededRng } from '@/lib/seededRng'
import { makeKanaPool, makeIntroLesson } from '../../helpers/fixtures'

describe('selectDistractors (§7.1, §7.2)', () => {
  it('prefers a confusable-set member as one of the distractors when one exists', () => {
    const pool = makeKanaPool()
    const target = pool.find((i) => i.char === 'め')!
    const rng = new SeededRng(1)
    const distractors = selectDistractors(target, pool, pool, 3, rng)
    expect(distractors.some((d) => d.id === 'kana:hiragana:ぬ')).toBe(true)
  })

  it('never includes the target itself', () => {
    const pool = makeKanaPool()
    const target = pool.find((i) => i.char === 'あ')!
    const rng = new SeededRng(2)
    const distractors = selectDistractors(target, pool, pool, 3, rng)
    expect(distractors.some((d) => d.id === target.id)).toBe(false)
  })

  it('is deterministic given the same seed', () => {
    const pool = makeKanaPool()
    const target = pool.find((i) => i.char === 'あ')!
    const a = selectDistractors(target, pool, pool, 3, new SeededRng(42))
    const b = selectDistractors(target, pool, pool, 3, new SeededRng(42))
    expect(a.map((d) => d.id)).toEqual(b.map((d) => d.id))
  })

  it('prefers same-lesson items over the full pool (§7.1: "2 from the same lesson/unit")', () => {
    // Regression: an early implementation drew all non-confusable
    // distractors from the full 208-item content pool, so a beginner's
    // first exercise for あ could show an unrelated yōon syllable (e.g.
    // "byo") instead of the far more useful, same-lesson い/う/え/お —
    // caught via manual browser verification.
    const fullPool = makeKanaPool() // 7 items: あいうえお + めぬ
    const lessonPool = fullPool.filter((i) => ['あ', 'い', 'う'].includes(i.char))
    const target = fullPool.find((i) => i.char === 'あ')!

    for (let seed = 0; seed < 20; seed++) {
      const distractors = selectDistractors(target, lessonPool, fullPool, 2, new SeededRng(seed))
      const distractorChars = distractors.map((d) => d.char)
      // With only い/う available in the lesson pool (あ excluded as the
      // target) and 2 distractors requested, both must come from there —
      // め/ぬ/え should never appear.
      expect(distractorChars.sort()).toEqual(['い', 'う'])
    }
  })

  it('falls back to the full pool once the lesson pool is exhausted', () => {
    const fullPool = makeKanaPool()
    const lessonPool = fullPool.filter((i) => i.char === 'い') // only 1 same-lesson peer
    const target = fullPool.find((i) => i.char === 'あ')!

    const distractors = selectDistractors(target, lessonPool, fullPool, 3, new SeededRng(1))
    expect(distractors).toHaveLength(3)
    expect(distractors.some((d) => d.char === 'い')).toBe(true) // lesson pool used first
  })
})

describe('buildExercisesForLesson', () => {
  const pool = makeKanaPool()
  const lesson = makeIntroLesson()
  const itemsById = new Map(pool.map((i) => [i.id, i]))

  it('teaching cards always precede any graded exercise for the same item (teach-then-test, §1.5)', () => {
    const exercises = buildExercisesForLesson(
      lesson.exerciseTemplates,
      itemsById,
      pool,
      lesson.practicesItems,
      new SeededRng(1),
      'seed',
    )
    const firstSeenIndex = new Map<string, number>()
    const teachingIndex = new Map<string, number>()
    exercises.forEach((ex) => {
      if (ex.type === '7.15') teachingIndex.set(ex.itemId, ex.index)
      else if (!firstSeenIndex.has(ex.itemId)) firstSeenIndex.set(ex.itemId, ex.index)
    })
    for (const [itemId, gradedIndex] of firstSeenIndex) {
      expect(teachingIndex.get(itemId)).toBeLessThan(gradedIndex)
    }
  })

  it('is fully deterministic given the same seed (§10.4 resume requirement)', () => {
    const a = buildExercisesForLesson(
      lesson.exerciseTemplates,
      itemsById,
      pool,
      lesson.practicesItems,
      new SeededRng(7),
      'seed',
    )
    const b = buildExercisesForLesson(
      lesson.exerciseTemplates,
      itemsById,
      pool,
      lesson.practicesItems,
      new SeededRng(7),
      'seed',
    )
    expect(a).toEqual(b)
  })

  it('produces a different arrangement for a different seed', () => {
    const a = buildExercisesForLesson(
      lesson.exerciseTemplates,
      itemsById,
      pool,
      lesson.practicesItems,
      new SeededRng(1),
      'seed',
    )
    const b = buildExercisesForLesson(
      lesson.exerciseTemplates,
      itemsById,
      pool,
      lesson.practicesItems,
      new SeededRng(999),
      'seed',
    )
    expect(a.map((e) => `${e.type}:${e.itemId}`)).not.toEqual(b.map((e) => `${e.type}:${e.itemId}`))
  })

  it('contains at least 3 distinct exercise types (§7.16)', () => {
    const exercises = buildExercisesForLesson(
      lesson.exerciseTemplates,
      itemsById,
      pool,
      lesson.practicesItems,
      new SeededRng(3),
      'seed',
    )
    const types = new Set(exercises.map((e) => e.type))
    expect(types.size).toBeGreaterThanOrEqual(3)
  })

  it('synthesizes a matching-pairs group sharing one groupId', () => {
    const exercises = buildExercisesForLesson(
      lesson.exerciseTemplates,
      itemsById,
      pool,
      lesson.practicesItems,
      new SeededRng(5),
      'seed-abc',
    )
    const matching = exercises.filter((e) => e.type === '7.12')
    expect(matching.length).toBeGreaterThan(0)
    const groupIds = new Set(matching.map((e) => e.groupId))
    expect(groupIds.size).toBe(1)
  })

  it('regression: matching-group members stay contiguous after the shuffle, across many seeds', () => {
    // Caught via manual browser verification: an early implementation
    // shuffled individual exercises rather than blocks, scattering the
    // matching group across the session. SessionPlayer's
    // collectMatchingGroup only gathers a contiguous run starting at
    // currentIndex, so a scattered group silently stranded most of its
    // pairs — the UI showed "1 left" instead of all 5.
    for (let seed = 0; seed < 30; seed++) {
      const exercises = buildExercisesForLesson(
        lesson.exerciseTemplates,
        itemsById,
        pool,
        lesson.practicesItems,
        new SeededRng(seed),
        `seed-${seed}`,
      )
      const groupIndices = exercises
        .map((e, i) => (e.type === '7.12' ? i : -1))
        .filter((i) => i !== -1)
      if (groupIndices.length === 0) continue
      const expectedRun = Array.from(
        { length: groupIndices.length },
        (_, k) => groupIndices[0] + k,
      )
      expect(groupIndices).toEqual(expectedRun)
    }
  })

  it('re-indexes exercises sequentially from 0', () => {
    const exercises = buildExercisesForLesson(
      lesson.exerciseTemplates,
      itemsById,
      pool,
      lesson.practicesItems,
      new SeededRng(1),
      'seed',
    )
    expect(exercises.map((e) => e.index)).toEqual(exercises.map((_, i) => i))
  })

  it('skips a template whose itemId is not in the resolved pool, without crashing', () => {
    const exercises = buildExercisesForLesson(
      [{ type: '7.1', itemId: 'kana:hiragana:not-real' }],
      itemsById,
      pool,
      [],
      new SeededRng(1),
      'seed',
    )
    expect(exercises).toEqual([])
  })
})
