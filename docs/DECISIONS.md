# Decisions log

Architecture decisions made while building Nihongo Trail, appended as they happen.
Each entry: date, decision, why, what section of `REQUIREMENTS.md` it touches (if any).

<!-- Example entry format:

## 2026-08-15 — Decision title

**Decision:** what was decided.

**Why:** the reasoning / trade-off considered.

**Affects:** §12.3 (data model), etc.

-->

## 2026-08-15 — TypeScript pinned to 6.0.3, not the latest 7.x

**Decision:** `typescript` is pinned to `^6.0.3` in `package.json` rather than the latest stable `7.0.2`.

**Why:** `typescript-eslint@8.67.0`'s peer range caps at `<6.1.0` — TS7 is too new for the current ESLint tooling. Revisit once `typescript-eslint` ships TS7 support.

**Affects:** Build tooling only, no data model impact.

## 2026-08-15 — jsdom/testing-library pinned below latest for Node 20 compatibility

**Decision:** `jsdom` pinned to `^27.0.0` (not latest `30.x`) and `@testing-library/jest-dom` pinned to `^6.9.1` (not latest `7.x`).

**Why:** `jsdom@28+` and `@testing-library/jest-dom@7+` require Node ≥22. §8.1 of the requirements doc specifies Node ≥20 as the runtime floor (matching `ts-fsrs`'s own requirement), and the local dev machine runs Node 20.20.2. Revisit if the project's Node floor is deliberately raised.

**Affects:** Test tooling only, no data model impact.

## 2026-08-15 — `SrsCard.learningStep` added (mirrors ts-fsrs 5.x `Card.learning_steps`)

**Decision:** Added `learningStep: number` to `SrsCard` (`src/types/progress.ts`), not present in the original §12.3 spec.

**Why:** ts-fsrs 5.4.1's actual `Card` interface tracks the current (re)learning step index on the card itself (`learning_steps` field) — without persisting it, a card mid-way through its learning steps would lose that position on reload, breaking correctness. §12.3 says the FSRS fields should "mirror the ts-fsrs Card shape"; this field is required to actually do that, since the source doc's field list predates this ts-fsrs release (or simply omitted it).

**Affects:** §12.3 `SrsCard` interface.

## 2026-08-15 — `UserSettings`, `ExportBundle`, `DailyStatsEntry`, `ImportResult` defined (referenced in §12 but never spelled out)

**Decision:** Defined these four types (`src/types/settings.ts`, `src/types/storage.ts`) from first principles against other sections of the requirements doc, since §12 references them (`UserMeta.settings: UserSettings`, `ProgressStore.exportAll(): Promise<ExportBundle>`, the `dailyStats` object store) without ever defining their shape.

**Why:**
- `UserSettings` — built from §14.1's Settings screen inventory (theme, audio prefs) plus §11.5 (silent-mode toggle) and §7.7 (fill-in-blank difficulty setting). Fields already covered by top-level `UserMeta` (daily goal, retention target, new-items/day) were left off to avoid duplication.
- `ExportBundle` — built from §10.1's four progress layers plus §10.5's "schema version and export timestamp" requirement.
- `DailyStatsEntry` — built from §12.6's one-line description ("One row per day: XP, reviews, accuracy, minutes").
- `ImportResult` — built from the `/plan-eng-review` decision (Test gap 4) that `importAll` never throws on malformed input; it resolves a result object with a `success`/`error`/`diff` shape the Phase 4 UI can branch on directly to render §10.5's diff-summary confirmation screen.

**Affects:** §12.4 (`UserMeta.settings`), §12.7 (`ProgressStore.exportAll`/`importAll` return types), §12.6 (`dailyStats` store).

## 2026-08-15 — `ProgressStore` filled out with explicit unit-progress and daily-stats methods

**Decision:** Added `getUnitProgress`/`saveUnitProgress` and `getDailyStats`/`saveDailyStats` to the `ProgressStore` interface (`src/storage/ProgressStore.ts`).

**Why:** §12.7's interface listing ends with `// ... unit progress, daily stats` — the doc explicitly left these unspecified but named them as required. Filled in following the exact pattern of the adjacent `getLessonProgress`/`saveLessonProgress` pair, against the `unitProgress` and `dailyStats` object stores already defined in §12.6.

**Affects:** §12.7 `ProgressStore` interface.

## 2026-08-15 — ぢ/づ get unique romaji keys (di/du), を drops "o" as an alternate

**Decision:** In `src/lib/kanaTable.ts`, を accepts only `wo` (not `o`); ぢ accepts only `di` (not `ji`/`zi`); づ accepts only `du` (not `zu`).

**Why:** ぢ/づ are phonetically identical to じ/ず in modern standard Japanese (the yotsugana merger), and を is phonetically identical to お. §7.3's grading rule ("accept both shi/si, tsu/tu, fu/hu, ji/zi, n/nn") lists variant spellings per kana, but doesn't address what happens when two *different* kana would claim the same romaji string — a single romaji→kana lookup can only resolve to one target. Kept じ/ず/お as the claimants for the shared spellings (they're the far more common characters in N5-level content) and gave ぢ/づ/を their own unambiguous keys, matching how real Japanese IMEs resolve the same ambiguity.

**Affects:** §15.5 (romaji→kana IME), §7.3 (typing exercise grading).

## 2026-08-15 — `LessonKind` extended with `kana_intro` / `kana_review`

**Decision:** Added `'kana_intro'` and `'kana_review'` to the `LessonKind` union (`src/types/curriculum.ts`), alongside the six values already in §12.2.

**Why:** §12.2's `Lesson.kind` enum (`vocab`/`kanji`/`grammar`/`mixed`/`listening`/`test`) mirrors §5.4's unit template, which the doc explicitly scopes to Stage 1-3 ("Each unit follows a fixed shape so lesson generation can be automated" — under the "Stage 1-3 unit template" heading). Stage 0's kana lessons (§5.3: 5-characters-per-lesson introduction, every-3rd-lesson mixed review) don't fit any of the six existing values. Rather than force-fit kana lessons into `'vocab'`/`'mixed'`, added the two values the actual content needs.

**Affects:** §12.2 `Lesson.kind`.

## 2026-08-15 — Stage 0 lesson chunking deviates from strict gojūon-row order to satisfy §5.5 rule 5

**Decision:** The Stage 0 curriculum generator (`scripts/ingest/01-generate-curriculum.ts`) chunks kana into lessons using a greedy algorithm that defers an item to the next lesson if adding it would put two confusable-set members (§5.3) in the same lesson — rather than always taking a fixed gojūon row as one lesson.

**Why:** §5.3's own worked example ("Lesson 4: さしすせそ, Lesson 5: たちつてと") is row-based, and the doc's confusable-pairs table separately lists は/ほ/ま and る/ろ as confusable sets. Taking はひふへほ as a single lesson (the natural continuation of the row pattern) would put は and ほ in the same lesson, and らりるれろ would put る and ろ together — both violate §5.5 rule 5 ("Two items in the same confusion set are never introduced in the same lesson") and §6.6's matching validation invariant. The generator now checks confusable membership before adding an item to the lesson being built, producing slightly uneven lesson sizes (typically 3-5 items) rather than always exactly one row.

**Affects:** §5.3 (Stage 0 lesson sequencing), §5.5 rule 5, §6.6 (validation invariants).

## 2026-08-15 — `ProgressStore.persistAnswer` added for §10.3's single-transaction write

**Decision:** Added `persistAnswer({ card?, reviewLogEntry?, session, metaPatch? })` to `ProgressStore` (§12.7), implemented as one Dexie `'rw'` transaction across `cards`/`reviewLog`/`sessions`/`meta`.

**Why:** §10.3 requires "Write to IndexedDB in one transaction: card update + review log entry + session state + XP delta" per answer — but the existing §12.7 interface only exposes separate `upsertCards`/`appendReviewLog`/`saveSession`/`updateMeta` methods. Calling them sequentially isn't atomic: a failure partway through (e.g. session write fails after the card already updated) could leave state inconsistent — exactly the kind of bug the resume contract (§10.4) exists to prevent. `card`/`reviewLogEntry` are optional since a teaching card (§7.15) advances the session without producing an FSRS rating or review log row.

**Affects:** §12.7 `ProgressStore` interface, §10.3 (checkpointing).

## 2026-08-15 — `ResolvedExercise.groupId` added for matching-pairs (§7.12)

**Decision:** Added optional `groupId?: string` to `ResolvedExercise` (§12.5).

**Why:** §7.12 (matching pairs) shows a grid of 5 Japanese + 5 English tiles and grades "per-pair; each pair produces its own SRS rating" — inherently multi-item, but §12.5's `ResolvedExercise` (and §12.2's `ExerciseTemplate`) model one exercise as one item/card/answer. Rather than reshape the whole exercise model around one multi-item exception, matching pairs resolve to N consecutive `ResolvedExercise` entries (one per pair, each independently gradable with its own SRS rating, matching the spec's own grading rule) sharing a `groupId` — the UI renders same-`groupId` entries as one matching screen.

**Affects:** §12.5 `ResolvedExercise`.
