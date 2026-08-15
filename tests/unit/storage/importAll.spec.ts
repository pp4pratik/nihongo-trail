import { describe, it, expect } from 'vitest'
import { IndexedDbProgressStore } from '@/storage/IndexedDbProgressStore'
import { makeCard } from '../../helpers/fixtures'

// Test gap 4 from /plan-eng-review: importAll never throws on malformed
// input. It resolves { success: false, error } — a normal, expected case
// the Phase 4 UI branches on directly (§10.5's diff-summary confirmation).

describe('IndexedDbProgressStore.importAll — malformed input', () => {
  it('resolves { success: false } for completely invalid input, does not throw', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await store.importAll('not even an object' as any)
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('resolves { success: false } when required array fields are missing', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const malformed = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      meta: {},
      // cards, reviewLog, sessions, lessonProgress, unitProgress, dailyStats all missing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    const result = await store.importAll(malformed)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Malformed')
  })

  it('does not modify existing data when the import is malformed', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const card = makeCard()
    await store.upsertCards([card])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await store.importAll({ garbage: true } as any)

    const fetched = await store.getCard(card.cardId)
    expect(fetched).toEqual(card)
  })

  it('resolves { success: true } with a diff for well-formed input', async () => {
    const store = new IndexedDbProgressStore(`test-${crypto.randomUUID()}`)
    const bundle = await store.exportAll()
    const result = await store.importAll({
      ...bundle,
      cards: [makeCard()],
    })
    expect(result.success).toBe(true)
    expect(result.diff).toBeDefined()
    expect(result.diff?.cardsDelta).toBe(1)
  })
})
