import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadKanaContent, findKanaItem, type KanaContent } from '@/content/loadKana'
import type { KanaItem } from '@/types'

const CONTENT_PATH = resolve(process.cwd(), 'public/content/kana.json')

function readGeneratedKanaContent(): KanaContent {
  return JSON.parse(readFileSync(CONTENT_PATH, 'utf-8')) as KanaContent
}

describe('generated public/content/kana.json — basic invariants', () => {
  const content = readGeneratedKanaContent()

  it('has exactly 104 hiragana and 104 katakana items (§5.3)', () => {
    const hiragana = content.items.filter((i) => i.script === 'hiragana')
    const katakana = content.items.filter((i) => i.script === 'katakana')
    expect(hiragana).toHaveLength(104)
    expect(katakana).toHaveLength(104)
  })

  it('has no duplicate item IDs', () => {
    const ids = content.items.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every item has at least one accepted romaji spelling', () => {
    for (const item of content.items) {
      expect(item.romaji.length).toBeGreaterThan(0)
    }
  })

  it('every confusableWith reference points to a real item ID', () => {
    const allIds = new Set(content.items.map((i) => i.id))
    for (const item of content.items) {
      for (const ref of item.confusableWith) {
        expect(allIds.has(ref)).toBe(true)
      }
    }
  })

  it('confusable relationships are symmetric', () => {
    const byId = new Map<string, KanaItem>(content.items.map((i) => [i.id, i]))
    for (const item of content.items) {
      for (const refId of item.confusableWith) {
        const other = byId.get(refId)
        expect(other?.confusableWith).toContain(item.id)
      }
    }
  })

  it('irregular readings are present: し, ち, つ, ふ, ん (§5.3)', () => {
    const chars = new Set(content.items.filter((i) => i.script === 'hiragana').map((i) => i.char))
    for (const char of ['し', 'ち', 'つ', 'ふ', 'ん']) {
      expect(chars.has(char)).toBe(true)
    }
  })
})

describe('loadKanaContent', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches from /content/kana.json and returns the parsed content', async () => {
    const fakeContent: KanaContent = { items: [] }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeContent),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadKanaContent()

    expect(fetchMock).toHaveBeenCalledWith('/content/kana.json')
    expect(result).toBe(fakeContent)
  })

  it('throws a descriptive error when the fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }),
    )

    await expect(loadKanaContent()).rejects.toThrow('404')
  })
})

describe('findKanaItem', () => {
  it('finds an item by id', () => {
    const content = readGeneratedKanaContent()
    const found = findKanaItem(content, 'kana:hiragana:あ')
    expect(found?.char).toBe('あ')
  })

  it('returns undefined for an unknown id', () => {
    const content = readGeneratedKanaContent()
    expect(findKanaItem(content, 'kana:hiragana:not-real')).toBeUndefined()
  })
})
