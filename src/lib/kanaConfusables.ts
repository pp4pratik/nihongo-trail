// Shared confusable-group lookup, used by both the kana content generator
// and the curriculum generator (§5.3 confusable pairs, §5.5 rule 5).

import {
  HIRAGANA_CONFUSABLE_GROUPS,
  KATAKANA_CONFUSABLE_GROUPS,
  CROSS_SCRIPT_CONFUSABLE_GROUPS,
} from './kanaTable'

/** Builds a char -> list-of-confusable-chars map, merging a script's own
 * confusable groups with the cross-script ones. */
export function buildConfusableMap(
  ownGroups: string[][],
  crossGroups: string[][],
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const group of [...ownGroups, ...crossGroups]) {
    for (const char of group) {
      const others = group.filter((c) => c !== char)
      map.set(char, [...(map.get(char) ?? []), ...others])
    }
  }
  return map
}

export function confusableMapForScript(script: 'hiragana' | 'katakana'): Map<string, string[]> {
  return script === 'hiragana'
    ? buildConfusableMap(HIRAGANA_CONFUSABLE_GROUPS, CROSS_SCRIPT_CONFUSABLE_GROUPS)
    : buildConfusableMap(KATAKANA_CONFUSABLE_GROUPS, CROSS_SCRIPT_CONFUSABLE_GROUPS)
}

/** True if any member of `groupA` is confusable with any member of `groupB`,
 * checking within a single script's own confusable groups only (§5.5 rule
 * 5 is about same-script same-lesson spacing during kana introduction). */
export function anyConfusableWithLesson(
  candidateChar: string,
  lessonChars: string[],
  confusables: Map<string, string[]>,
): boolean {
  const confusableWithCandidate = new Set(confusables.get(candidateChar) ?? [])
  return lessonChars.some((c) => confusableWithCandidate.has(c))
}
