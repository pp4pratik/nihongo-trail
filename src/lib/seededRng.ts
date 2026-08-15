// Seeded RNG (§13.3) — sessions must be reproducible in tests, and
// distractor generation must be deterministic given a seed.
//
// Uses mulberry32: a 32-bit bitwise-integer PRNG. Bitwise operations are
// spec-guaranteed identical (32-bit two's complement) across every JS
// engine, so this is deterministic across Node and browser environments —
// unlike a floating-point-seeded generator, whose output can drift across
// engines. See docs/DECISIONS.md and the /plan-eng-review failure-modes note.

export class SeededRng {
  private state: number

  constructor(seed: number) {
    // Force to a 32-bit unsigned integer so any input seed (including 0,
    // negatives, or non-integers) normalises to a valid internal state.
    this.state = seed >>> 0
  }

  /** Returns a float in [0, 1). */
  next(): number {
    this.state |= 0
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Returns an integer in [min, max). */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min
  }

  /** Returns a new array, Fisher-Yates shuffled — does not mutate the input. */
  shuffle<T>(items: readonly T[]): T[] {
    const result = items.slice()
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1)
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  /** Picks `count` distinct items from `items` without replacement. */
  sample<T>(items: readonly T[], count: number): T[] {
    return this.shuffle(items).slice(0, count)
  }
}
