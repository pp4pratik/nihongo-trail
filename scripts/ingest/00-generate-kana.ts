// Stage 0 kana content generator (§5.3, §6.2). Kana has no external
// dataset — it's hand-authored — but per CLAUDE.md, public/content/ is
// still never hand-edited directly; this script is the single source that
// produces public/content/kana.json.
//
// Run via `npm run content:build`.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KANA_TABLE, HIRAGANA_CONFUSABLE_GROUPS, KATAKANA_CONFUSABLE_GROUPS, type KanaTableEntry } from '../../src/lib/kanaTable'
import { confusableMapForScript } from '../../src/lib/kanaConfusables'
import type { KanaItem } from '../../src/types/content'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, '../../public/content/kana.json')

function kanaId(script: 'hiragana' | 'katakana', char: string): string {
  return `kana:${script}:${char}`
}

const hiraganaConfusables = confusableMapForScript('hiragana')
const katakanaConfusables = confusableMapForScript('katakana')

function toKanaItem(entry: KanaTableEntry, script: 'hiragana' | 'katakana'): KanaItem {
  const char = script === 'hiragana' ? entry.hiragana : entry.katakana
  const confusables = script === 'hiragana' ? hiraganaConfusables : katakanaConfusables
  const confusableChars = confusables.get(char) ?? []
  return {
    id: kanaId(script, char),
    type: 'kana',
    script,
    char,
    romaji: entry.romaji,
    group: entry.group,
    confusableWith: confusableChars.map((c) => {
      // A cross-script confusable's char belongs to the *other* script.
      const otherScript = script === 'hiragana' ? 'katakana' : 'hiragana'
      const belongsToOwnScript =
        script === 'hiragana'
          ? HIRAGANA_CONFUSABLE_GROUPS.flat().includes(c)
          : KATAKANA_CONFUSABLE_GROUPS.flat().includes(c)
      return kanaId(belongsToOwnScript ? script : otherScript, c)
    }),
    // No TTS audio in Phase 1 — no exercise type in Phase 1's scope
    // (7.1/7.2/7.3/7.12/7.15) requires it, and pre-generated TTS is
    // explicit Phase 2 scope (§16, §11.2). Placeholder path, silently
    // unplayable until Phase 2 fills it in.
    audioUrl: `/audio/kana/${script}/${encodeURIComponent(char)}.opus`,
  }
}

const items: KanaItem[] = KANA_TABLE.flatMap((entry) => [
  toKanaItem(entry, 'hiragana'),
  toKanaItem(entry, 'katakana'),
])

mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
writeFileSync(OUTPUT_PATH, JSON.stringify({ items }, null, 2) + '\n')

console.log(`Wrote ${items.length} kana items to ${OUTPUT_PATH}`)
