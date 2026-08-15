// Content types — read-only, sourced from public/content/ (§12.1)

export type ItemId = string // e.g. "word:jmdict:1310920"
export type ItemType = 'kana' | 'word' | 'kanji' | 'grammar' | 'sentence'

export interface KanaItem {
  id: ItemId
  type: 'kana'
  script: 'hiragana' | 'katakana'
  char: string
  romaji: string[] // accepted romanisations, e.g. ["shi", "si"]
  group: 'basic' | 'dakuten' | 'handakuten' | 'yoon'
  confusableWith: ItemId[]
  audioUrl: string
}

export interface WordSense {
  glosses: string[] // ["to eat"]
  partOfSpeech: string[] // ["v1", "vt"]
  tags?: string[]
}

export interface WordItem {
  id: ItemId // JMdict entry sequence
  type: 'word'
  kanjiForm?: string // 食べる
  kanaForm: string // たべる
  romaji: string
  senses: WordSense[]
  commonness: string[] // JMdict tags: news1, ichi1, spec1, ...
  jlptLevel?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  containsKanji: ItemId[]
  audioUrl: string
  pitchAccent?: number[]
}

export interface KanjiItem {
  id: ItemId // "kanji:U+65E5"
  type: 'kanji'
  char: string
  meanings: string[]
  onReadings: string[] // katakana
  kunReadings: string[] // hiragana
  strokeCount: number
  grade?: number // Japanese school grade
  frequencyRank?: number
  jlptLevel?: string
  radical: string
  components: string[] // from KanjiVG decomposition
  mnemonic?: string // hand-authored
  strokeDataUrl: string // lazy-loaded path
  exampleWords: ItemId[]
}

export interface GrammarItem {
  id: ItemId // "grammar:n5:te-form-request"
  type: 'grammar'
  title: string // "〜てください"
  summary: string // one line
  explanation: string // markdown, hand-authored
  formationRule: string
  exampleSentences: ItemId[]
  relatedGrammar: ItemId[]
  commonMistakes: string[]
}

export interface SentenceToken {
  surface: string
  reading: string
  itemId?: ItemId
  isParticle: boolean
}

export interface SentenceItem {
  id: ItemId // "sentence:tatoeba:112345"
  type: 'sentence'
  japanese: string
  reading: string // full kana reading, for furigana
  tokens: SentenceToken[]
  english: string
  audioUrl?: string
  audioLicense?: string // must be recorded if audio is bundled
  usesItems: ItemId[]
  acceptedOrders?: string[][] // for word-bank exercises with multiple valid answers
}

export type ContentItem = KanaItem | WordItem | KanjiItem | GrammarItem | SentenceItem
