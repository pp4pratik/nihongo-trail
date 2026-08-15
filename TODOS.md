# TODOs

Deferred items surfaced during plan review, not yet scheduled into a phase's Next Steps.

## Content-correctness QA mechanism

**What:** A way to catch linguistically wrong content (grammar cards, kanji mnemonics, AI-generated curriculum text) before it ships — native-speaker spot-check, cross-reference against an established textbook (Genki, Tae Kim), or similar.

**Why:** The target user (§2) is an absolute beginner who can't read hiragana/katakana yet — the same person authoring or reviewing this content. `06-validate.ts` (§6.6) checks structural invariants (IDs exist, no orphans, lesson size) — it cannot check whether a て-form explanation is actually correct Japanese. Neither engineering review nor structural validation catches this risk category.

**Pros:** Catches errors before they're internalized by the learner; cheap to decide the method now vs. discovering the gap after content is written.

**Cons:** Adds a review step to content authoring; may require finding an external reviewer (native speaker) which the builder doesn't currently have lined up.

**Context:** Affects §6.5's ~80 hand-authored grammar cards and any kanji mnemonics. Not urgent until Phase 3 grammar authoring begins — but the approach should be decided before writing starts, not after 40 cards exist.

**Depends on / blocked by:** Nothing — can be decided any time before Phase 3.

---

## Unblock Phase 2/3 with open-question decisions

**What:** Decide grammar-authoring method (open question #1) and TTS/audio budget (open question #2) explicitly, rather than leaving them as ambient open questions.

**Why:** Open question #1 gates Phase 3's acceptance criteria directly (grammar cards can't be authored without a method). Open question #2 gates Phase 2's "every Stage 1 item has playable audio" criterion. §18.1 already calls grammar authoring "the real project bottleneck." Neither decision has a dependency reason to wait.

**Pros:** De-risks the two phases most likely to stall; costs nothing to decide now.

**Cons:** None significant — this is a decision-timing issue, not new work.

**Context:** Both are listed as open questions in §18.3 of the source requirements doc and carried forward in the design doc's Open Questions section.

**Depends on / blocked by:** Nothing — no dependency reason to wait on either.

---

## ~~Investigate Skola for reuse before building Phase 0's storage layer from scratch~~ (RESOLVED 2026-08-15)

**Resolution:** Checked via `gh repo view h16nning/skola`. Skola is **AGPL-3.0** — reusing its code would force the whole app to be AGPL-3.0. Decided to build Phase 0 from the spec instead; no license constraint carried into the app. Original TODO body kept below for context.

**What:** Check [Skola](https://github.com/h16nning/skola)'s license and skim its Dexie schema / `ts-fsrs` wrapper code for anything forkable or adaptable, before implementing Phase 0's `IndexedDbProgressStore` and FSRS wrapper from the spec alone.

**Why:** Skola is a real, working, local-first FSRS PWA on Dexie — the closest existing comparable (surfaced during office-hours). It was cited as "validates the architecture pattern, not a shortcut" without actually checking whether reuse is possible. Premise 4 explicitly worries about over-scoping and never shipping — skipping a cheap reuse check is inconsistent with that stated risk appetite.

**Pros:** Could genuinely shrink Phase 0's Dexie-schema and FSRS-wrapper work if the license permits reuse; low cost to check (30-60 min).

**Cons:** May turn up nothing usable (different license, incompatible schema shape) — the 30-60 min could be a dead end.

**Context:** The cross-model review in office-hours estimated Skola covers roughly 20-25% of this project's complexity (the "boring" storage-pattern plumbing, not the curriculum/sequencing/ingestion layer that's the actual novelty).

**Depends on / blocked by:** Nothing — should happen before Phase 0 implementation starts, not after.

---

## Pin ingestion pipeline dataset versions/checksums

**What:** Extend `00-download.ts` (§6.2, already idempotent and checksummed per the current fetch) to pin specific dataset versions for JMdict/KANJIDIC2/KanjiVG/Tatoeba, not just checksum whatever is currently live.

**Why:** jmdict-simplified refreshes weekly; Tatoeba/KanjiVG can drift too. If the builder pauses for months and later resumes `content:build`, upstream format drift could silently break the pipeline. Ironic gap given how much the rest of the spec (§10.3, §10.4) obsesses over interruption-resilience — just not for the build process itself.

**Pros:** Reproducible builds regardless of how long the project is paused; cheap to build in from the start vs. expensive to retrofit after drift has already happened.

**Cons:** Requires actively updating the pin when intentionally picking up new upstream data (a small amount of ongoing maintenance).

**Context:** This is Phase 2 scope (ingestion pipeline doesn't exist yet) — not urgent now, but should be part of the pipeline's initial design, not bolted on later.

**Depends on / blocked by:** Phase 2 — the ingestion pipeline itself.
