import { describe, it, expect } from 'vitest'
import { KANA_TABLE } from '@/lib/kanaTable'
import { romajiToKana, getAcceptedRomaji, isCorrectRomaji } from '@/lib/romajiKana'

describe('romajiToKana — full table round trip (§17 highest-value test #2)', () => {
  it.each(KANA_TABLE)('$hiragana / $katakana converts from every accepted romaji spelling', (entry) => {
    for (const romaji of entry.romaji) {
      expect(romajiToKana(romaji, 'hiragana')).toBe(entry.hiragana)
      expect(romajiToKana(romaji, 'katakana')).toBe(entry.katakana)
    }
  })
})

describe('romajiToKana — Hepburn/Kunrei variant acceptance (§15.5, §7.3)', () => {
  const variantPairs: Array<[string, string, string]> = [
    ['shi', 'si', 'し'],
    ['chi', 'ti', 'ち'],
    ['tsu', 'tu', 'つ'],
    ['fu', 'hu', 'ふ'],
    ['ji', 'zi', 'じ'],
    ['n', 'nn', 'ん'],
  ]

  it.each(variantPairs)('"%s" and "%s" both convert to %s', (a, b, kana) => {
    expect(romajiToKana(a)).toBe(kana)
    expect(romajiToKana(b)).toBe(kana)
  })
})

describe('romajiToKana — special rules (§5.3, §15.5)', () => {
  it('doubles a consonant into small tsu っ — かった', () => {
    expect(romajiToKana('katta')).toBe('かった')
  })

  it('doubles a consonant into small tsu っ — がっこう (school)', () => {
    expect(romajiToKana('gakkou')).toBe('がっこう')
  })

  it('naturally spells long vowels mora-by-mora — こうこう', () => {
    expect(romajiToKana('koukou')).toBe('こうこう')
  })

  it('naturally spells a doubled vowel — ああ', () => {
    expect(romajiToKana('aa')).toBe('ああ')
  })

  it('uses ー for a hyphen in katakana only — コーヒー', () => {
    expect(romajiToKana('ko-hi-', 'katakana')).toBe('コーヒー')
  })

  it('does not treat a hyphen specially in hiragana — passes it through', () => {
    expect(romajiToKana('ko-hi-', 'hiragana')).toBe('こ-ひ-')
  })

  it('"n" at the end of a word converts to ん', () => {
    expect(romajiToKana('kin')).toBe('きん')
  })

  it('yōon takes priority over splitting into separate mora — kya is きゃ, not きや', () => {
    expect(romajiToKana('kya')).toBe('きゃ')
    expect(romajiToKana('kya')).not.toBe('きや')
  })

  it('leaves an incomplete trailing syllable unconverted for live-preview typing', () => {
    // "ky" alone isn't a complete mora yet — the live IME should show it
    // as-is rather than eating or mis-guessing it.
    expect(romajiToKana('ky')).toBe('ky')
  })
})

describe('getAcceptedRomaji', () => {
  it('returns every accepted spelling for a kana with variants', () => {
    expect(getAcceptedRomaji('し')).toEqual(['shi', 'si'])
    expect(getAcceptedRomaji('ん')).toEqual(['n', 'nn'])
  })

  it('returns a single-item list for a kana with only one spelling', () => {
    expect(getAcceptedRomaji('あ')).toEqual(['a'])
  })

  it('returns an empty list for an unknown character', () => {
    expect(getAcceptedRomaji('食')).toEqual([])
  })
})

describe('isCorrectRomaji (§7.3 grading)', () => {
  it('accepts any valid romanisation of the target kana', () => {
    expect(isCorrectRomaji('shi', 'し', 'hiragana')).toBe(true)
    expect(isCorrectRomaji('si', 'し', 'hiragana')).toBe(true)
  })

  it('rejects a wrong answer', () => {
    expect(isCorrectRomaji('chi', 'し', 'hiragana')).toBe(false)
  })

  it('trims surrounding whitespace before grading', () => {
    expect(isCorrectRomaji('  shi  ', 'し', 'hiragana')).toBe(true)
  })

  it('grades against the correct script', () => {
    expect(isCorrectRomaji('shi', 'シ', 'katakana')).toBe(true)
    expect(isCorrectRomaji('shi', 'シ', 'hiragana')).toBe(false)
  })
})
