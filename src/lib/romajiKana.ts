// Romaji → kana IME (§15.5) — a custom converter, not the OS IME. Handles:
// n vs nn (ん), double consonants (kk → っ), long vowels (mora-by-mora
// conversion naturally produces おう/おお etc. — no special-casing needed),
// '-' for ー in katakana, and Hepburn + common Kunrei variants.

import { KANA_TABLE, type KanaTableEntry } from './kanaTable'

export type KanaScript = 'hiragana' | 'katakana'

const MAX_ROMAJI_LEN = 3
const CONSONANT_PATTERN = /[bcdfghjklmpqrstvwxyz]/

// romaji variant -> table entry, across every accepted spelling.
const ROMAJI_LOOKUP = new Map<string, KanaTableEntry>()
for (const entry of KANA_TABLE) {
  for (const romaji of entry.romaji) {
    ROMAJI_LOOKUP.set(romaji, entry)
  }
}

/**
 * Converts a raw romaji string (as typed so far) into kana. Designed to be
 * called on every keystroke against the full accumulated buffer — an
 * incomplete trailing syllable (e.g. "ky" before "kya" completes) is left
 * as-is in the output so the live preview shows exactly what's pending.
 */
export function romajiToKana(input: string, script: KanaScript = 'hiragana'): string {
  const s = input.toLowerCase()
  let result = ''
  let i = 0

  while (i < s.length) {
    if (script === 'katakana' && s[i] === '-') {
      result += 'ー'
      i += 1
      continue
    }

    // Doubled consonant -> small tsu (っ/ッ), e.g. "kka" -> っか.
    if (
      i + 1 < s.length &&
      s[i] === s[i + 1] &&
      CONSONANT_PATTERN.test(s[i]) &&
      s[i] !== 'n'
    ) {
      result += script === 'hiragana' ? 'っ' : 'ッ'
      i += 1
      continue
    }

    let matchedLen = 0
    for (let len = MAX_ROMAJI_LEN; len >= 1; len--) {
      const chunk = s.slice(i, i + len)
      if (chunk.length !== len) continue
      const entry = ROMAJI_LOOKUP.get(chunk)
      if (entry) {
        result += script === 'hiragana' ? entry.hiragana : entry.katakana
        matchedLen = len
        break
      }
    }

    if (matchedLen > 0) {
      i += matchedLen
      continue
    }

    // Unrecognised character: pass through unchanged. This lets a live
    // preview show trailing unconverted romaji (e.g. "ky" mid-syllable)
    // instead of silently eating it.
    result += s[i]
    i += 1
  }

  return result
}

/** All accepted romaji spellings for a single kana character. */
export function getAcceptedRomaji(kana: string): string[] {
  const entry = KANA_TABLE.find((e) => e.hiragana === kana || e.katakana === kana)
  return entry ? entry.romaji : []
}

/**
 * Grades a typed romaji answer against a target kana string (§7.3). The
 * typed input is converted the same way the live preview would render it,
 * so "shi" and "si" are both accepted for し without a separate alias list.
 */
export function isCorrectRomaji(typed: string, targetKana: string, script: KanaScript): boolean {
  return romajiToKana(typed.trim(), script) === targetKana
}
