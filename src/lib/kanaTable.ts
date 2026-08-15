// The full kana inventory (§5.3): 46 basic (gojūon) + 25 dakuten/handakuten
// + 33 yōon = 104 forms per script. Each entry's `romaji` array lists every
// accepted romanisation — Hepburn first, Kunrei/common variants after
// (§15.5: shi/si, chi/ti, tsu/tu, fu/hu, ji/zi). The first entry in the
// array is the "canonical" display romaji.

export type KanaGroup = 'basic' | 'dakuten' | 'handakuten' | 'yoon'

export interface KanaTableEntry {
  hiragana: string
  katakana: string
  romaji: string[]
  group: KanaGroup
}

export const KANA_TABLE: KanaTableEntry[] = [
  // --- basic: vowels ---
  { hiragana: 'あ', katakana: 'ア', romaji: ['a'], group: 'basic' },
  { hiragana: 'い', katakana: 'イ', romaji: ['i'], group: 'basic' },
  { hiragana: 'う', katakana: 'ウ', romaji: ['u'], group: 'basic' },
  { hiragana: 'え', katakana: 'エ', romaji: ['e'], group: 'basic' },
  { hiragana: 'お', katakana: 'オ', romaji: ['o'], group: 'basic' },
  // --- basic: k ---
  { hiragana: 'か', katakana: 'カ', romaji: ['ka'], group: 'basic' },
  { hiragana: 'き', katakana: 'キ', romaji: ['ki'], group: 'basic' },
  { hiragana: 'く', katakana: 'ク', romaji: ['ku'], group: 'basic' },
  { hiragana: 'け', katakana: 'ケ', romaji: ['ke'], group: 'basic' },
  { hiragana: 'こ', katakana: 'コ', romaji: ['ko'], group: 'basic' },
  // --- basic: s ---
  { hiragana: 'さ', katakana: 'サ', romaji: ['sa'], group: 'basic' },
  { hiragana: 'し', katakana: 'シ', romaji: ['shi', 'si'], group: 'basic' },
  { hiragana: 'す', katakana: 'ス', romaji: ['su'], group: 'basic' },
  { hiragana: 'せ', katakana: 'セ', romaji: ['se'], group: 'basic' },
  { hiragana: 'そ', katakana: 'ソ', romaji: ['so'], group: 'basic' },
  // --- basic: t ---
  { hiragana: 'た', katakana: 'タ', romaji: ['ta'], group: 'basic' },
  { hiragana: 'ち', katakana: 'チ', romaji: ['chi', 'ti'], group: 'basic' },
  { hiragana: 'つ', katakana: 'ツ', romaji: ['tsu', 'tu'], group: 'basic' },
  { hiragana: 'て', katakana: 'テ', romaji: ['te'], group: 'basic' },
  { hiragana: 'と', katakana: 'ト', romaji: ['to'], group: 'basic' },
  // --- basic: n ---
  { hiragana: 'な', katakana: 'ナ', romaji: ['na'], group: 'basic' },
  { hiragana: 'に', katakana: 'ニ', romaji: ['ni'], group: 'basic' },
  { hiragana: 'ぬ', katakana: 'ヌ', romaji: ['nu'], group: 'basic' },
  { hiragana: 'ね', katakana: 'ネ', romaji: ['ne'], group: 'basic' },
  { hiragana: 'の', katakana: 'ノ', romaji: ['no'], group: 'basic' },
  // --- basic: h ---
  { hiragana: 'は', katakana: 'ハ', romaji: ['ha'], group: 'basic' },
  { hiragana: 'ひ', katakana: 'ヒ', romaji: ['hi'], group: 'basic' },
  { hiragana: 'ふ', katakana: 'フ', romaji: ['fu', 'hu'], group: 'basic' },
  { hiragana: 'へ', katakana: 'ヘ', romaji: ['he'], group: 'basic' },
  { hiragana: 'ほ', katakana: 'ホ', romaji: ['ho'], group: 'basic' },
  // --- basic: m ---
  { hiragana: 'ま', katakana: 'マ', romaji: ['ma'], group: 'basic' },
  { hiragana: 'み', katakana: 'ミ', romaji: ['mi'], group: 'basic' },
  { hiragana: 'む', katakana: 'ム', romaji: ['mu'], group: 'basic' },
  { hiragana: 'め', katakana: 'メ', romaji: ['me'], group: 'basic' },
  { hiragana: 'も', katakana: 'モ', romaji: ['mo'], group: 'basic' },
  // --- basic: y ---
  { hiragana: 'や', katakana: 'ヤ', romaji: ['ya'], group: 'basic' },
  { hiragana: 'ゆ', katakana: 'ユ', romaji: ['yu'], group: 'basic' },
  { hiragana: 'よ', katakana: 'ヨ', romaji: ['yo'], group: 'basic' },
  // --- basic: r ---
  { hiragana: 'ら', katakana: 'ラ', romaji: ['ra'], group: 'basic' },
  { hiragana: 'り', katakana: 'リ', romaji: ['ri'], group: 'basic' },
  { hiragana: 'る', katakana: 'ル', romaji: ['ru'], group: 'basic' },
  { hiragana: 'れ', katakana: 'レ', romaji: ['re'], group: 'basic' },
  { hiragana: 'ろ', katakana: 'ロ', romaji: ['ro'], group: 'basic' },
  // --- basic: w + n ---
  { hiragana: 'わ', katakana: 'ワ', romaji: ['wa'], group: 'basic' },
  { hiragana: 'を', katakana: 'ヲ', romaji: ['wo'], group: 'basic' },
  { hiragana: 'ん', katakana: 'ン', romaji: ['n', 'nn'], group: 'basic' },

  // --- dakuten: g, z, d, b ---
  { hiragana: 'が', katakana: 'ガ', romaji: ['ga'], group: 'dakuten' },
  { hiragana: 'ぎ', katakana: 'ギ', romaji: ['gi'], group: 'dakuten' },
  { hiragana: 'ぐ', katakana: 'グ', romaji: ['gu'], group: 'dakuten' },
  { hiragana: 'げ', katakana: 'ゲ', romaji: ['ge'], group: 'dakuten' },
  { hiragana: 'ご', katakana: 'ゴ', romaji: ['go'], group: 'dakuten' },
  { hiragana: 'ざ', katakana: 'ザ', romaji: ['za'], group: 'dakuten' },
  { hiragana: 'じ', katakana: 'ジ', romaji: ['ji', 'zi'], group: 'dakuten' },
  { hiragana: 'ず', katakana: 'ズ', romaji: ['zu'], group: 'dakuten' },
  { hiragana: 'ぜ', katakana: 'ゼ', romaji: ['ze'], group: 'dakuten' },
  { hiragana: 'ぞ', katakana: 'ゾ', romaji: ['zo'], group: 'dakuten' },
  { hiragana: 'だ', katakana: 'ダ', romaji: ['da'], group: 'dakuten' },
  // ぢ/づ are phonetically identical to じ/ず in modern standard Japanese
  // (the yotsugana merger) — "ji"/"zi"/"zu" are already claimed by じ/ず,
  // so ぢ/づ get their own unambiguous romaji, matching real Japanese IME
  // convention (typing "di"/"du" is how you reach ぢ/づ specifically).
  { hiragana: 'ぢ', katakana: 'ヂ', romaji: ['di'], group: 'dakuten' },
  { hiragana: 'づ', katakana: 'ヅ', romaji: ['du'], group: 'dakuten' },
  { hiragana: 'で', katakana: 'デ', romaji: ['de'], group: 'dakuten' },
  { hiragana: 'ど', katakana: 'ド', romaji: ['do'], group: 'dakuten' },
  { hiragana: 'ば', katakana: 'バ', romaji: ['ba'], group: 'dakuten' },
  { hiragana: 'び', katakana: 'ビ', romaji: ['bi'], group: 'dakuten' },
  { hiragana: 'ぶ', katakana: 'ブ', romaji: ['bu'], group: 'dakuten' },
  { hiragana: 'べ', katakana: 'ベ', romaji: ['be'], group: 'dakuten' },
  { hiragana: 'ぼ', katakana: 'ボ', romaji: ['bo'], group: 'dakuten' },
  // --- handakuten: p ---
  { hiragana: 'ぱ', katakana: 'パ', romaji: ['pa'], group: 'handakuten' },
  { hiragana: 'ぴ', katakana: 'ピ', romaji: ['pi'], group: 'handakuten' },
  { hiragana: 'ぷ', katakana: 'プ', romaji: ['pu'], group: 'handakuten' },
  { hiragana: 'ぺ', katakana: 'ペ', romaji: ['pe'], group: 'handakuten' },
  { hiragana: 'ぽ', katakana: 'ポ', romaji: ['po'], group: 'handakuten' },

  // --- yōon: 11 consonant bases × ゃゅょ = 33 ---
  { hiragana: 'きゃ', katakana: 'キャ', romaji: ['kya'], group: 'yoon' },
  { hiragana: 'きゅ', katakana: 'キュ', romaji: ['kyu'], group: 'yoon' },
  { hiragana: 'きょ', katakana: 'キョ', romaji: ['kyo'], group: 'yoon' },
  { hiragana: 'ぎゃ', katakana: 'ギャ', romaji: ['gya'], group: 'yoon' },
  { hiragana: 'ぎゅ', katakana: 'ギュ', romaji: ['gyu'], group: 'yoon' },
  { hiragana: 'ぎょ', katakana: 'ギョ', romaji: ['gyo'], group: 'yoon' },
  { hiragana: 'しゃ', katakana: 'シャ', romaji: ['sha', 'sya'], group: 'yoon' },
  { hiragana: 'しゅ', katakana: 'シュ', romaji: ['shu', 'syu'], group: 'yoon' },
  { hiragana: 'しょ', katakana: 'ショ', romaji: ['sho', 'syo'], group: 'yoon' },
  { hiragana: 'じゃ', katakana: 'ジャ', romaji: ['ja', 'zya'], group: 'yoon' },
  { hiragana: 'じゅ', katakana: 'ジュ', romaji: ['ju', 'zyu'], group: 'yoon' },
  { hiragana: 'じょ', katakana: 'ジョ', romaji: ['jo', 'zyo'], group: 'yoon' },
  { hiragana: 'ちゃ', katakana: 'チャ', romaji: ['cha', 'tya'], group: 'yoon' },
  { hiragana: 'ちゅ', katakana: 'チュ', romaji: ['chu', 'tyu'], group: 'yoon' },
  { hiragana: 'ちょ', katakana: 'チョ', romaji: ['cho', 'tyo'], group: 'yoon' },
  { hiragana: 'にゃ', katakana: 'ニャ', romaji: ['nya'], group: 'yoon' },
  { hiragana: 'にゅ', katakana: 'ニュ', romaji: ['nyu'], group: 'yoon' },
  { hiragana: 'にょ', katakana: 'ニョ', romaji: ['nyo'], group: 'yoon' },
  { hiragana: 'ひゃ', katakana: 'ヒャ', romaji: ['hya'], group: 'yoon' },
  { hiragana: 'ひゅ', katakana: 'ヒュ', romaji: ['hyu'], group: 'yoon' },
  { hiragana: 'ひょ', katakana: 'ヒョ', romaji: ['hyo'], group: 'yoon' },
  { hiragana: 'びゃ', katakana: 'ビャ', romaji: ['bya'], group: 'yoon' },
  { hiragana: 'びゅ', katakana: 'ビュ', romaji: ['byu'], group: 'yoon' },
  { hiragana: 'びょ', katakana: 'ビョ', romaji: ['byo'], group: 'yoon' },
  { hiragana: 'ぴゃ', katakana: 'ピャ', romaji: ['pya'], group: 'yoon' },
  { hiragana: 'ぴゅ', katakana: 'ピュ', romaji: ['pyu'], group: 'yoon' },
  { hiragana: 'ぴょ', katakana: 'ピョ', romaji: ['pyo'], group: 'yoon' },
  { hiragana: 'みゃ', katakana: 'ミャ', romaji: ['mya'], group: 'yoon' },
  { hiragana: 'みゅ', katakana: 'ミュ', romaji: ['myu'], group: 'yoon' },
  { hiragana: 'みょ', katakana: 'ミョ', romaji: ['myo'], group: 'yoon' },
  { hiragana: 'りゃ', katakana: 'リャ', romaji: ['rya'], group: 'yoon' },
  { hiragana: 'りゅ', katakana: 'リュ', romaji: ['ryu'], group: 'yoon' },
  { hiragana: 'りょ', katakana: 'リョ', romaji: ['ryo'], group: 'yoon' },
]

// §5.3 confusable pairs — the app must deliberately generate distractors
// from these groups, since random distractors won't surface these. Used to
// build each kana item's confusableWith list and to check "different
// lesson" spacing.
export const HIRAGANA_CONFUSABLE_GROUPS: string[][] = [
  ['め', 'ぬ'],
  ['は', 'ほ', 'ま'],
  ['れ', 'わ', 'ね'],
  ['さ', 'き'],
  ['る', 'ろ'],
  ['い', 'り'],
  ['つ', 'し'],
]

export const KATAKANA_CONFUSABLE_GROUPS: string[][] = [
  ['シ', 'ツ'],
  ['ソ', 'ン'],
  ['ク', 'ワ', 'ケ'],
  ['ア', 'マ'],
  ['ス', 'ヌ'],
  ['チ', 'テ'],
]

export const CROSS_SCRIPT_CONFUSABLE_GROUPS: string[][] = [
  ['り', 'リ'],
  ['か', 'カ'],
  ['へ', 'ヘ'],
  ['ん', 'ソ'],
]
