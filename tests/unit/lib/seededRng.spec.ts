import { describe, it, expect } from 'vitest'
import { SeededRng } from '@/lib/seededRng'

describe('SeededRng', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = new SeededRng(42)
    const b = new SeededRng(42)
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = new SeededRng(1)
    const b = new SeededRng(2)
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })

  it('always returns values in [0, 1)', () => {
    const rng = new SeededRng(7)
    for (let i = 0; i < 1000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('normalises negative and non-integer seeds without throwing', () => {
    expect(() => new SeededRng(-5).next()).not.toThrow()
    expect(() => new SeededRng(0).next()).not.toThrow()
  })

  it('nextInt stays within [min, max)', () => {
    const rng = new SeededRng(99)
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInt(3, 8)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThan(8)
    }
  })

  it('shuffle is deterministic for the same seed and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const a = new SeededRng(123).shuffle(input)
    const b = new SeededRng(123).shuffle(input)
    expect(a).toEqual(b)
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(a.slice().sort()).toEqual(input.slice().sort())
  })

  it('sample returns the requested count of distinct items', () => {
    const rng = new SeededRng(55)
    const picked = rng.sample(['a', 'b', 'c', 'd', 'e'], 3)
    expect(picked).toHaveLength(3)
    expect(new Set(picked).size).toBe(3)
  })
})
