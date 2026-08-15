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
