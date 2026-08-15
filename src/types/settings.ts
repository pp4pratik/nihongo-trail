// UserSettings — referenced by UserMeta.settings in §12.4 but never defined
// in §12 itself. Filled in here from the Settings screen requirements
// (§14.1 #11, §11.5, §15.5, §7.7). See docs/DECISIONS.md — this fills a gap
// the source spec left open, it does not change a defined §12 contract.

export interface UserSettings {
  theme: 'dark' | 'light'
  audioAutoplay: boolean
  silentMode: boolean // explicit "I'm somewhere quiet" override, §11.5
  furiganaEnabled: boolean // global furigana toggle, §15.5
  fillInBlankMode: 'tap' | 'type' // difficulty setting for §7.7
}
