---
description: "Task list for 002 — Monthly charts and insights"
---

# Tasks: Monthly charts and insights

**Input**: Design documents from `/specs/002-monthly-charts/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md;
design.md (written in T014) before any UI task except T010's placeholder

**Tests**: Required. Constitution principle II: every behavior change ships with automated tests
and all money calculations are unit-tested. Every implementation task names its tests, written in
the same task. From 002, each story's phase starts with the `spec-tester` agent's black-box
acceptance tests and ends with them green (AGENTS.md).

**Organization**: tasks are grouped by user story, in the order US1 → US2 → US3 → US4. US4 (P2)
goes last on purpose: its scenario 7 needs US3's **View month**. Until the picker exists,
acceptance tests that need a past month select it through the harness's `selectMonth`
(contracts/test-harness.md), never through 001's arrows, which T048 removes. Work goes in
**blocks** (Delivery Blocks below).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: user story from spec.md (US1–US4)
- Paths are relative to the repository root (single Expo project, see plan.md)

## Conventions for every task

- Money is integer cents; never divide cents to get a float. Percents only through `percentOf`
  (research R4). Chart coordinates are the only floats and are never shown as amounts.
- No `console.*` with amounts, categories or dates tied to a user; errors go through
  `reportError(code)` (code only); timings through `devLog` (ms only).
- UI text, roles, labels, hints and states exactly as in `contracts/ui-screens.md`; spoken forms
  from its Notation section.
- Colors, type, spacing, line styles and motion come from design.md through `src/ui/theme.ts`
  tokens; motion follows `useReduceMotion` and the performance rules (no JS work during a
  transition, UI-thread transforms only).
- Code that runs inside a gesture callback on the UI thread is a worklet (`'worklet'` directive)
  and reads only shared values; Jest runs it on the JS thread, so each such task lists a phone
  check.
- `domain/` imports nothing from React, Expo or SQLite.
- Acceptance tests in `tests/acceptance/002/` are never edited to match the code. A failing one is
  a bug or a spec/contract gap; gaps go to the developer, and the spec or contract is fixed first.
  While a story is in progress its acceptance file is listed in
  `tests/acceptance/002/pending.js` (T013), which `npm test` ignores; the story's closing task
  removes it from the list.
- After each task: `npm test`, `npm run lint` and `npm run typecheck` pass.

---

## Phase 1: Setup

**Purpose**: the one new dependency, working in Expo Go and in Jest.

- [x] T001 Install `react-native-svg` with `npx expo install react-native-svg` (plan,
  Dependencies). `npm ls react-native-svg` must show exactly `15.15.4` (SDK 57's
  `bundledNativeModules.json`); if npm resolves another version anywhere in the tree, pin it in
  `package.json` `overrides` and as the direct dependency, like `react-native-gesture-handler`.
  Check that a component rendering `<Svg><Path d="M0 0 L10 10" /></Svg>` renders in Jest (add one
  case to `tests/unit/smoke.test.ts`); if `jest-expo` cannot render it, add a mock in
  `tests/setup/svg.ts` registered in `jest.config.js` `setupFilesAfterEnv`, rendering each SVG
  element as a host `View` with its props. Phone check: a temporary SVG line renders in Expo Go;
  remove it before the commit.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: shared domain, formatting and data pieces every story uses, the acceptance-test
harness, and the visual design. **No story phase starts before T013 is done; no UI task except
T010's placeholder starts before T015.**

### Domain (pure TypeScript)

- [x] T002 [P] Add `addMonths(ym, delta)` (delta may be negative, crosses years), `daysInMonth(ym)`
  (28..31, leap years by the 001 rule in `lastDayOf`) and `compareMonths(a, b)` (<0, 0, >0) to
  `src/domain/month.ts` (contracts/insights-domain.md). Unit tests in `tests/unit/month.test.ts`:
  ±1, ±12, ±25 months across year ends; February 2000 (29), 2100 (28), 2024 (29), 2026 (28);
  equal, earlier and later months.
- [x] T003 [P] Implement `percentOf(partCents, wholeCents): Percent` in `src/domain/percent.ts`
  (research R4): `|rounded| = floor((200·|part| + whole) / (2·whole))` in integers, sign of `part`
  applied after, `sign` = sign of `part`, and "`rounded` is never -0". Unit tests in
  `tests/unit/percent.test.ts` with literal expectations: 37.5 % → 38, -37.5 % → -38, -7.5 % → -8,
  0.5 % → 1, -0.5 % → -1, 0.4 % → `{ rounded: 0, sign: 1 }`, -0.4 % → `{ rounded: 0, sign: -1 }`
  with `Object.is(rounded, 0)`, `percentOf(0, 5)` → `{ 0, 0 }`, 15 % exact, and FR-022's largest
  case (`percentOf(599_999_999_994, 599_999_999_994)` → 100, `percentOf(1, 599_999_999_994)` →
  `{ 0, 1 }`).
- [x] T004 [P] Create `src/domain/ledger.ts` with `LedgerRow`
  (`{ type: TransactionType; amountCents: number; date: IsoDate; category: string }`) and
  `rowsInMonth(rows, ym): LedgerRow[]` (rows whose date is in `ym`, order kept), used by
  `useInsights` to split one range read. Unit tests in `tests/unit/ledger.test.ts`: month edges
  (1st and last day in, neighbours out), December → January.

### Formatting (UI edge)

- [x] T005 [P] Add to `src/format/money.ts`: `formatSignedDifference(cents, tag)` (`+` above 0,
  minus below, no sign at 0: `+60,00 €`, `-30,00 €`, `0,00 €`, with the minus glyph `Intl` gives,
  as 001's `formatSignedMoney`) and `spokenSignedDifference(cents, tag)` ("plus 60,00 €", "minus
  30,00 €", "0,00 €"). The saved amount uses 001's `formatMoney` and `spokenMoney` (minus only).
  Unit tests in `tests/unit/money.test.ts` for `es-ES`, `en-GB`, `en-US` and `es-US` (always `€`),
  including 999.999.999,99 € and -5.999.999.999,94 €.
- [x] T006 [P] Create `src/format/percent.ts`: `formatChangePercent(p: Percent | 'new')`
  (`+30%`, `-38%`, `+<1%`, `-<1%`, `0%`, `New`), `formatRate(p: Percent | null)` (`15%`, `-8%`,
  `<1%`, `-<1%`, `0%`, `No income`), and their spoken forms `spokenChangePercent` and
  `spokenRate` exactly as contracts/ui-screens.md, Notation ("plus 30 percent", "minus less than 1
  percent", "new", "no income", …). Unit tests in `tests/unit/percentFormat.test.ts` cover every
  example in that table.

### Storage

- [x] T007 Add `listRange(from, to)` to `src/data/transactionRepository.ts` (and the
  `TransactionRepository` interface) per contracts/transaction-repository.md: the SQL given there,
  slim rows mapped to `LedgerRow`, `[]` when `from` is after `to`, failures thrown as
  `StorageError('list')` through `guard`. Integration tests in
  `tests/integration/transactionRepository.test.ts` for every guarantee in that contract (range
  edges, year end, February leap and non-leap, `from === to` equals `listByMonth` as slim rows,
  an update moving a row between months, a failing database). Add `listRange` to every test double
  that implements `TransactionRepository` (grep `tests/` and `src/dev/` for `listByMonth`).

### Reference data (SC-001)

- [x] T008 [P] Create `tests/fixtures/insightsReference.ts` (SC-001): at least 100
  `TransactionInput`s over seven consecutive months, April to October 2026, with a fixed `today`
  of `2026-10-12`, including: a 31-day month against a 30-day one (October/September), a month
  without data (June), a month with more expenses than income (August), a month with expenses but
  no income (July), an expense and an income dated after today (October 15 and 20), and a list of
  `edits` (`update`s by index) that move rows between months and from expense to income. Add a
  second, smaller set for January–March 2024 (February 2024 has 29 days) with its own `today` of
  `2024-03-30`. Write the expected results **by hand**, as literals worked out in a comment table
  (never computed with the code's formulas), for the data **after** the edits:
  - pace for October (current) and for September selected as a past month: both daily cumulative
    series day by day, `chartDays`, `comparisonDay`, the sentence kind and `differenceCents`, and
    `dayDetail` for days 8, 12, 14, 16, 20 and 31; for the 2024 set, March against February by day
    30;
  - category comparisons for October (by day 12) and September (whole months): every row's
    cents, change, percent (`rounded`, `sign` or `'new'`) and the row order;
  - the trend for October and for June 2026: each month's income, expenses, saved, rate,
    `hasData`, plus `monthsWithData`, `totalSavedCents` and the overall rate.
  The story tasks T017, T033 and T039 assert these literals; T055 checks them end to end through
  the repository.

### App shell and test harness

- [x] T009 [P] Implement `useScreenReader(): boolean` in `src/hooks/useScreenReader.ts` (research
  R6): `AccessibilityInfo.isScreenReaderEnabled()` on mount, then the `screenReaderChanged` event;
  `false` until the first answer. Unit tests in `tests/unit/useScreenReader.test.tsx` with a mocked
  `AccessibilityInfo` (initial true and false, a change event, unsubscribe on unmount).
- [x] T010 Add a placeholder Insights route: `src/app/insights.tsx` renders the screen header from
  contracts/ui-screens.md (**Back** button, `Insights` header label, the selected month's title
  text, unstyled beyond 001's tokens; design.md restyles it in T028) and nothing else yet; **Back**
  and Android's back call `router.back()`. Register `<Stack.Screen name="insights" />` in
  `src/app/_layout.tsx` with Android's default push, like `transactions`. Component test in
  `tests/component/insights.test.tsx` (header texts and roles, Back).
- [x] T011 Build the app harness `tests/helpers/app.tsx` exactly as contracts/test-harness.md
  (research R9). It installs on import the mocks every 001 component suite uses (see
  `tests/component/monthNavigation.test.tsx`: controllable `useToday`/`getToday` with
  foreground events, `expo-localization` region, `expo-font`, safe-area mock, `expo-sqlite`
  `openDatabaseAsync` returning a better-sqlite3 database migrated with `openAndMigrate`,
  `devLog`), a fake `expo-router` stack (`useRouter().push` for `/insights` and `/transactions`,
  `back`, `useFocusEffect` replayed on refocus, `useNavigation().addListener('transitionEnd')`
  firing right after a push) that renders **only the top screen**, a mocked `AccessibilityInfo`
  for `setScreenReader`, and a small consumer of `SelectedMonthContext` for `selectMonth` (calls
  the real `setSelected`). `add`, `update` and `remove` write through
  `createTransactionRepository` and then refocus the top screen; `failReads` wraps the
  repository's reads to throw `StorageError('list')`; `settle` flushes promises inside `act`.
  `paceChart.*` and `tapOutsidePicker` are declared now and throw "not wired yet" until T029 and
  T051 wire them; `paceChart.width` is 310.
- [x] T012 Harness self-tests in `tests/component/appHarness.test.tsx` for what exists now: the
  summary renders `today`'s month with seeded rows; `add` after render shows on the summary;
  `failReads(true)` and a refocus show "Couldn't load your data."; `setToday` across a month end
  moves the summary to the new month (001 rule); `selectMonth` shows that month on the summary;
  a push to Insights and `back()` switch `screen`; the stubs throw "not wired yet".
- [x] T013 Prepare acceptance tests: create `tests/acceptance/002/README.md` (black box, never
  edited to match code, gaps to the developer) and `tests/acceptance/002/pending.js`, a list of
  story files still in progress (empty at first). In `jest.config.js`, add the listed files to
  `testPathIgnorePatterns` so `npm test` (and CI) stays green while a story is open. Add the script
  `"test:acceptance": "jest tests/acceptance --testPathIgnorePatterns /node_modules/"` to
  `package.json`, which runs every acceptance file, pending or not. Confirm
  `.claude/agents/spec-tester.md` lets the agent read `tests/helpers/app.tsx` and
  `contracts/test-harness.md` (it allows `tests/helpers/` and `contracts/`).

### Visual design

- [x] T014 [P] Design for 002 (AGENTS.md): build HTML mockups in
  `specs/002-monthly-charts/design/mockups/`, following 001's design.md (glass surfaces, Manrope,
  palettes, 48 dp touch, large text), for: the summary with the Spending pace card (ready with two
  lines, one line, loading; light and dark), Insights (ready with a day detail open, the category
  table for the current month and for a past month, the trend with a negative month, a "No data"
  month and a month detail with **View month**; loading; error; "No data yet"), the month picker
  (light and dark), and the largest font size for the card and a category row. Publish them for
  the developer to review and **stop until the developer approves**. Then write
  `specs/002-monthly-charts/design.md`: line styles that differ without color (FR-002), chart
  colors for both palettes with contrast checked, the compact card chart vs the full chart, the
  day axis marks, how the selected day and month are marked, the bar form of the trend and
  below-zero drawing, the picker grid, motion (chart appearance, detail in and out, picker, and
  the month-change motion now that there are no arrows: plan, Open Items), large-text rules
  (research R11) and 002's performance rules. Run the `design-reviewer` agent on it (two rounds
  at most) and show the findings to the developer before approval.
- [x] T015 Add design.md's 002 tokens to `src/ui/theme.ts` (chart line and bar colors per palette,
  dash pattern, stroke widths, chart heights) and extend `tests/unit/contrast.test.ts` with each
  new color pair design.md says must meet contrast.

**Checkpoint**: domain, formatting, `listRange`, harness and design are ready; story phases can
start.

---

## Phase 3: User Story 1 - See my spending pace against last month (Priority: P1) 🎯 MVP

**Goal**: the Spending pace card on the summary and the Insights screen with the full pace chart,
tap or drag a day, screen reader days.

**Independent Test**: expenses on several days of the current and previous month → the card's
sentence and lines match a hand calculation; tap the card → Insights for the same month; tap or
drag a day → both amounts for that day.

- [x] T016 [US1] Run the `spec-tester` agent (`model: "sonnet"`) for `specs/002-monthly-charts/`
  and `US1`. Tell it that `paceChart.*` in the harness is not wired until T029 (its tests may call
  it; they fail until then) and that past months are reached with `selectMonth`. It writes
  `tests/acceptance/002/US1.test.tsx` from spec.md and contracts/ only; add the file to
  `pending.js`. Read its report; show any "Contract gaps" to the developer and fix the spec or
  contract first.
- [x] T017 [P] [US1] Implement `computePace` and `dayDetail` in `src/domain/pace.ts`
  (contracts/insights-domain.md, data-model.md "Pace"): cumulative expense series; line end
  "Past month: its last day. Current month: the later of today's day and the day of its latest row
  dated after today. Any type counts for the line's length; a later-dated income only extends the
  line flat"; `chartDays` always 31; comparison day and the previous month's
  `min(comparison day, its last day)`; FR-003's sentence rules in order; `previous: null` when the
  previous month has no data; `dayDetail` nulls and change (`'new'` when previous is 0 and selected
  above 0, `{0, 0}` when both 0). Unit tests in `tests/unit/pace.test.ts`: every US1 scenario's
  numbers (1-7, 9, 10), each spec Edge Case that touches the pace (30/31 March vs February,
  later-dated expense and later-dated income, January 2000, months of different lengths, a new
  `today` the next day changes the comparison day), and the T008 literals.
- [x] T018 [P] [US1] Implement `src/ui/charts/geometry.ts` (pure; every function carries the
  `'worklet'` directive so gesture callbacks can call it on the UI thread):
  `dayAtX(x, width, days)` per contracts/ui-screens.md (day N covers `[(N-1)·w/D, N·w/D)`, below 0
  → 1, at or beyond `w` → D; width 0 → day 1), `xOfDay`, `lineScale(maxCents, height)` (0..max, 0
  when both series are empty), the points of a series for an SVG path, and
  `barScale(values, height)` for the trend: baseline at 0 with room above for the largest positive
  value and below for the most negative. Unit tests in `tests/unit/geometry.test.ts`: `width = 310`,
  `days = 31` (x = 75 → 8, 79.99 → 8, 80 → 9, -5 → 1, 310 → 31), an all-zero series, and
  `barScale` for all-positive, all-negative, mixed and all-zero values.
- [x] T019 [P] [US1] Implement the `chartSelection` reducer in `src/ui/charts/selection.ts`
  (research R5): state `{ selected: number | null; touch: { downDay: number; dragging: boolean } |
  null }`, events `down(day)`, `move(day)`, `up()`, `cancel()`, `activate(day)`, `reset()`. Rules:
  `up()` without a move to another day is a tap on the touch-down day (select, or clear if already
  selected); a `move` to another day starts a drag, after which the selection follows each `move`
  and stays at `up()`, never cleared; `cancel()` changes nothing; `activate` acts as a tap (also
  used by the trend's month buttons); `reset` clears. Unit tests in
  `tests/unit/selection.test.ts`: US1 scenarios 11 and 13, a drag that returns to the touch-down
  day, a drag ending on the selected day, a cancel after down, a tap on a selected day after a
  drag, `activate` toggling.
- [x] T020 [P] [US1] Create `src/format/insights.ts` with the pace texts: `paceSentence(sentence,
  tag)` (FR-003's four rules; previous month names from 001's English month names),
  `dayDetailLines(detail, pace, tag)` (`Day 8`, `October: 120,00 €`, `September: 100,00 €`,
  `+20,00 € · +20%`), `daySpokenValue` (the lines after "Day N", spoken, joined by ", ") and the
  card label `Spending pace, <sentence>`. Unit tests in `tests/unit/insightsText.test.ts` with
  literal strings from contracts/ui-screens.md (es-ES), including negatives spoken as "minus".
  Depends on T017's types.
- [x] T021 [US1] Extend `src/hooks/useMonthSummary.ts` (research R3): in the same load, read
  `listByMonth(selected)` and `listRange(previous, previous)` with `Promise.all` (skip the second
  on January 2000, using `[]`); keep the previous rows under the same month key; compute `pace`
  with `computePace(selected, rows, previousRows, today)` in a `useMemo`, `today` from
  `useSelectedMonth()`. Status stays one value: ready only when both arrive, error when either
  fails; the same-rows check also compares the previous rows. Update
  `tests/component/useMonthSummary.test.tsx`: both reads in one load, an error in the second read
  shows the error state, overlapping month changes keep only the newest result, January 2000 makes
  one read, a new `today` (foreground) recomputes the pace.
- [x] T022 [P] [US1] Create `src/state/handedPace.ts` (like `openedTransaction.ts`):
  `handOffPace(pace, pressedAt: number)` stores the pace with its month and the press time (used
  by T054's timing); `takePace(month)` returns `{ pace, pressedAt }` only when the month matches,
  otherwise `null`; `dropPace()` clears it. Unit tests in `tests/unit/handedPace.test.ts`.
- [ ] T023 [US1] Implement `src/ui/charts/PaceChart.tsx` (design.md, research R5, R6): SVG lines
  for `pace.selected` and `pace.previous` (when not null) with design.md's line styles, the legend
  with each month name, and two variants: `compact` (card: no axis, no touch) and `full` (axis
  marks `1`, `8`, `15`, `22`, `29`; touch; selected-day mark). In `full`:
  - the touch view has `testID="pace-chart"`; its `onLayout` writes the width to a shared value;
  - one `Gesture.Pan().manualActivation(true)` tagged `withTestId('pace-chart')`, whose
    callbacks are worklets reading only shared values: `onTouchesDown` records the touch-down day
    (`dayAtX` with the shared width) and start point; `onTouchesMove` calls
    `stateManager.activate()` when the day under the finger differs from the touch-down day, and
    `stateManager.fail()` on a first move of more than 8 dp vertically and more vertical than
    horizontal while still on the touch-down day; `onTouchesUp` calls `stateManager.end()` when
    the pan is active and `stateManager.fail()` when it never activated (a tap), so the scroll is
    never left blocked; `onTouchesCancelled` calls `fail()`; it sends `down`, `move` (only on a
    day change), `up` and `cancel` to JS with `runOnJS`;
  - the pan coexists with the Insights scroll view (T028 uses `ScrollView` from
    `react-native-gesture-handler`): the pan is declared with `.blocksExternalGesture(scrollRef)`,
    so the scroll waits for the pan to fail (vertical move) and is blocked while it is active;
  - with `useScreenReader()` true, one `Pressable` per day over the chart: role `button`, label
    `Day N`, `accessibilityValue.text` from `daySpokenValue`, `selected` state, `onPress` →
    `activate(day)`; not rendered otherwise.
  Motion per design.md, through `useReduceMotion`. Tests in `tests/component/paceChart.test.tsx`:
  one or two lines and the legend, axis marks, the day elements only with the screen reader on and
  their labels, values and `selected` state, gesture events through
  `react-native-gesture-handler/jest-utils` after a layout event of width 310 (tap, drag across
  days, vertical cancel, and a tap that ends the gesture so the scroll is free again), touch area
  height ≥ 48 dp, no animation with reduce motion. Phone checks (Block 4b): the gesture runs
  without a worklet error; a vertical swipe that starts on the chart scrolls the screen without a
  visible delay; after a tap on the chart the screen still scrolls; a horizontal drag does not
  scroll. If the blocking
  relation delays scrolling noticeably, stop and bring it to the developer (alternatives: a
  `Gesture.Native()` scroll with `requireExternalGestureToFail`).
- [ ] T024 [P] [US1] (developer writes; Claude reviews) Implement `src/ui/ChartDetail.tsx`: the
  detail lines under a chart, one `Text` per line (contracts/ui-screens.md), an optional action
  button slot (US3's **View month**), appear and disappear motion per design.md with
  `useReduceMotion`. Tests in `tests/component/chartDetail.test.tsx`: lines as separate texts,
  the action button's role and 48 dp size, no motion with reduce motion.
- [ ] T025 [US1] Implement `src/ui/PaceCard.tsx` (design.md): loading (title `Spending pace` and
  an `ActivityIndicator` labelled `Loading`, not pressable); ready (title, compact `PaceChart`,
  sentence); one accessible `button` with label `Spending pace, <sentence>` and hint "Opens
  Insights"; children not focusable. Tests in `tests/component/paceCard.test.tsx`: both states,
  label and hint, each FR-003 sentence, pressable only when ready, ≥ 48 dp, dark palette, font
  scale 2 with a 999.999.999,99 € difference (the sentence wraps, nothing has `numberOfLines`).
- [ ] T026 [US1] Put the card on the summary in `src/app/index.tsx`: after the Totals card and the
  "Couldn't open this transaction." banner, before the breakdown; loading → loading card; error →
  no card; ready → ready card, including a month with no transactions (FR-001). On press:
  `handOffPace(pace, performance.now())` and `router.push('/insights')`. Entrance and month-change
  motion with 001's `Appear` per design.md. Extend `tests/component/summaryScreen.test.tsx`: card
  position, empty month, error hides it, press hands the pace and pushes `/insights`, a focus
  reload after an add updates the sentence (FR-018). In the same task, fix the 001 suites the card
  or the second read break (run `npm test`), only where 002's contracts changed the expectation,
  never by weakening a 001 rule.
- [ ] T027 [US1] Implement `src/hooks/useInsights.ts` (research R3): status
  `loading | error | ready`; one read `listRange(trendStart(selected), selected)` that starts on
  the navigator's `transitionEnd` for the first load (`useNavigation().addListener`), then on focus
  (FR-018), on a month change and on `retry` (which shows loading, and reopens the database if it
  failed, as 001's `retry`); only the newest read writes its result; a same-month reload keeps
  the data on screen. It splits rows with `rowsInMonth` and returns `pace` (from the read, or
  `takePace(selected)?.pace` until the read answers; a month change calls `dropPace()`). Errors go
  to `reportError` with the code only. `trendStart` arrives in T039; until then a local helper
  (`addMonths(selected, -5)` clamped to `MIN_MONTH`) that T039 replaces. Tests in
  `tests/component/useInsights.test.tsx`: no read before `transitionEnd` (controllable listener),
  handed pace only for its month, newest read wins over a slower older one, a same-month focus
  reload keeps data (no loading), a failed read gives `error` and `reportError('list')` only,
  `retry` shows loading then data, a failed database open is reopened by `retry`, a new `today`
  changes the comparison day on the next focus (spec Edge Cases, date change), and with Insights
  open on the current month, `setToday` to the next month moves Insights to the new month when
  the app returns to the foreground, while a past month stays (FR-031).
- [ ] T028 [US1] Build the Spending pace section in `src/app/insights.tsx` with design.md's
  header look: a vertical `ScrollView` from `react-native-gesture-handler` (the ref shared with
  `PaceChart`) under the header; the section title `Spending pace` (role `header`), the full
  `PaceChart`, the sentence, and `ChartDetail` for the selected day from the `chartSelection`
  reducer, which resets when the month changes (FR-031). Screen states from
  contracts/ui-screens.md: loading per section (the pace section shows the handed pace when there
  is one), error with `Couldn't load your data.` and **Try again** in place of the sections. No
  add, edit or delete anywhere (FR-015). Tests in `tests/component/insights.test.tsx`: loading,
  error and retry, the detail shown, replaced and hidden through the reducer, the selection reset
  after `selectMonth`, back to the summary shows the same month, no `Add`, `Edit` or `Delete`
  element on the screen, font scale 2, dark palette.
- [ ] T029 [US1] Wire the harness's pace chart in `tests/helpers/app.tsx`: on each Insights render
  fire the `pace-chart` view's layout event with width 310; implement `paceChart.touch`, `tapAt`
  and `dragVertically` with `react-native-gesture-handler/jest-utils` (`getByGestureTestId(
  'pace-chart')`, `fireGestureHandler` with touch events at the given x and a constant y). First
  check that the installed `jest-utils` drives `onTouchesDown/Move/Up` and the state manager of a
  manually activated pan; if it does not, `paceChart.touch` calls the gesture's touch callbacks
  directly with the same events and a fake state manager, and the harness self-tests say so. Add to
  `tests/component/appHarness.test.tsx`: card press → `screen === 'insights'`, `back()` →
  summary, a one-position touch is a tap, a two-day touch is a drag, `dragVertically` changes
  nothing.
- [ ] T030 [US1] Remove `US1.test.tsx` from `pending.js` and run `npx jest
  tests/acceptance/002/US1.test.tsx` until green. A failure is either a bug (fix the code) or a
  spec/contract gap (stop, show the developer, fix the spec or contract first, then the test).
  Record any accepted gap fix in the commit message.

**Checkpoint**: US1 works on its own: the card on every month, Insights with the full pace chart.

---

## Phase 4: User Story 2 - See which categories went up (Priority: P2)

**Goal**: the categories comparison section on Insights.

**Independent Test**: four categories over two months (one up, one down, one new, one gone) →
each row's amounts, change, percent and order match a hand calculation.

- [ ] T031 [US2] Run the `spec-tester` agent (`model: "sonnet"`) for `US2`
  (`tests/acceptance/002/US2.test.tsx`, past months through `selectMonth`); add it to
  `pending.js`; handle its report as in T016.
- [ ] T032 [P] [US2] Add the categories texts to `src/format/insights.ts`: column titles (`This
  month`/`Last month`/`Change` for the current month; the month names and `Change` for a past
  month), `Compared by day N`, the sentences, row cells and row labels exactly as
  contracts/ui-screens.md Section 2 (current and past month, `New`, "no data" rows). Unit tests in
  `tests/unit/insightsText.test.ts`. Depends on T033's types (write the type first).
- [ ] T033 [P] [US2] Implement `compareCategories` in `src/domain/categoryChanges.ts`
  (contracts/insights-domain.md, data-model.md "CategoryComparison"): kinds in order `noSpending`,
  `noPreviousData` (this month only, "by the comparison day for the current month", largest
  first, ties by label), `changes` (rows with current or previous above 0, `changeCents` =
  current − previous, percent `'new'` when previous is 0, ordered by change descending, ties by
  001 category label in plain code-unit order); for the current month every amount counts both
  months by the comparison day (previous month up to `min(day, its last day)`), rows after today
  left out; `comparisonDay` null for a past month. Unit tests in
  `tests/unit/categoryChanges.test.ts`: US2 scenarios 1-9 with literal cents and percents, a
  later-dated row excluded, February as previous month by day 30, and the T008 literals.
- [ ] T034 [US2] Return `categories: CategoryComparison | null` (null while loading) from
  `src/hooks/useInsights.ts`, computed from the same read. Extend
  `tests/component/useInsights.test.tsx`: categories ready with the pace, recomputed after a
  focus reload.
- [ ] T035 [US2] Implement `src/ui/CategoryChanges.tsx` (design.md): title `Categories vs last
  month` (role `header`), the three cases of contracts/ui-screens.md Section 2, one accessible
  element per row with the row label, rows that stack amounts under the name when they do not fit
  (research R11), not tappable, its own loading state. Add it below the pace section in
  `src/app/insights.tsx`. Tests in `tests/component/categoryChanges.test.tsx`: each case, the
  `Compared by day 12` label for the current month and its absence for a past month and in the
  no-data and no-spending cases, column titles for a past month, row labels with "minus" and
  "new", loading state, font scale 2 with 999.999.999,99 € rows, dark palette.
- [ ] T036 [US2] Remove `US2.test.tsx` from `pending.js` and run it until green (rules as T030).

**Checkpoint**: US1 and US2 work; Insights shows the pace and the categories.

---

## Phase 5: User Story 3 - See whether I am saving more over time (Priority: P3)

**Goal**: the six-month savings trend with headline, month details and **View month**.

**Independent Test**: six months of income and expenses (one negative, one empty) → every month's
values, the headline and the tapped details match a hand calculation.

- [ ] T037 [US3] Run the `spec-tester` agent (`model: "sonnet"`) for `US3`
  (`tests/acceptance/002/US3.test.tsx`, other selected months through `selectMonth`); add it to
  `pending.js`; handle its report as in T016.
- [ ] T038 [P] [US3] Add the trend texts to `src/format/insights.ts`: headline (`Saved <saved
  amount> in N months · <rate>`, `1 month`), its spoken label, short month names, month detail
  lines (`September`, `Income: …`, `Expenses: …`, `Saved: …`, `Savings rate: …`, or `No data`), and
  each month button's spoken value (contracts/ui-screens.md Section 3). Unit tests in
  `tests/unit/insightsText.test.ts`. Depends on T039's types (write the type first).
- [ ] T039 [P] [US3] Implement `trendStart` and `computeTrend` in `src/domain/trend.ts`
  (contracts/insights-domain.md, data-model.md "Trend"): months from `trendStart(selected)` (five
  before, never before January 2000) to `selected` in calendar order; per month `hasData`,
  income, expenses, saved, rate (`null` with no income); `monthsWithData`, `totalSavedCents`
  (no-data months add 0), overall `rate` (`null` when total income is 0). It ignores rows outside
  the range and does not depend on today (spec Assumptions). Replace T027's local helper with
  `trendStart`. Unit tests in `tests/unit/trend.test.ts`: US3 scenarios 1-9 with literal cents and
  percents, the FR-022 bound (six months of 99_999_999_999 cents each), all months without data,
  and the T008 literals.
- [ ] T040 [US3] Return `trend: Trend | null` from `src/hooks/useInsights.ts`. Extend
  `tests/component/useInsights.test.tsx` (trend ready with the rest, the range read starts at
  `trendStart`).
- [ ] T041 [US3] Implement `src/ui/charts/TrendChart.tsx` (design.md): one column per month with
  its short name, income, expenses and saved drawn in design.md's form with `barScale` and the
  T015 tokens, saved below zero when negative, a `No data` column instead of bars; each column a
  `Pressable` button (label the month name, `accessibilityValue.text` the spoken value, `selected`
  state, at least 48 dp wide) that sends `activate(index)` to a `chartSelection` reducer. Motion
  per design.md with `useReduceMotion`. Tests in `tests/component/trendChart.test.tsx`: six
  buttons with labels and values, a negative month drawn below the baseline, the `No data` column,
  ≥ 48 dp, no motion with reduce motion, dark palette.
- [ ] T042 [US3] Add the trend section to `src/app/insights.tsx`: title `Savings trend` (role
  `header`), its loading state, `No data yet` when `monthsWithData` is 0, otherwise the headline,
  `TrendChart` and `ChartDetail` for the selected month with **View month** (not on the selected
  month). **View month** calls `setSelected(month)`; both chart selections reset on any month
  change (FR-030, FR-031). Tests in `tests/component/trend.test.tsx`: loading, `No data yet`,
  headline cases (6 months, `1 month`, `No income`, negative), detail replace and hide (FR-014),
  no-data month detail, **View month** shows that month in every section with no detail open and
  is absent on the selected month, back to the summary shows that month (FR-029), font scale 2
  with a 5.999.999.999,94 € headline.
- [ ] T043 [US3] Remove `US3.test.tsx` from `pending.js` and run it until green (rules as T030).

**Checkpoint**: US1-US3 work; Insights is complete.

---

## Phase 6: User Story 4 - Jump to any month (Priority: P2)

**Goal**: the month control and picker on the summary and Insights, replacing 001's arrows.

**Independent Test**: transactions in several years → open the picker from the summary, change
year, pick a month; pick another on Insights and go back; tap a trend month's **View month**.

- [ ] T044 [US4] Run the `spec-tester` agent (`model: "sonnet"`) for `US4`
  (`tests/acceptance/002/US4.test.tsx`); tell it `tapOutsidePicker` is not wired until T051; add
  it to `pending.js`; handle its report as in T016.
- [ ] T045 [P] [US4] Implement `pickerYear(year, selected, today)` in `src/domain/month.ts`
  (data-model.md "Month picker"): twelve months January first, `selected` flag, `available` when
  not after the current month, `canGoPrevious` false on 2000, `canGoNext` false on today's year.
  Unit tests in `tests/unit/month.test.ts`: 2000, the current year (October 2026: November and
  December unavailable), a past year, a selected month in another year.
- [ ] T046 [US4] Implement `src/ui/MonthPicker.tsx` (research R7, design.md), built like 001's
  `ConfirmDialog` (React Native `Modal`, scrim, fade with `useReduceMotion`): title `Choose month`,
  the shown year, `Previous year` and `Next year` (disabled as `pickerYear` says), the 3 × 4
  month grid (visible short name, label `March 2024`, `selected` and `disabled` states), `This
  month` and `Close`; choosing an available month or `This month` calls `onChoose(month)`;
  `Close`, Android back (`onRequestClose`) and a scrim tap (scrim `testID="month-picker-scrim"`,
  not an accessibility element) call `onClose`; choosing the selected month only closes. Tests in
  `tests/component/monthPicker.test.tsx`: opens on the selected month's year, year buttons and
  their disabled states, unavailable months, choosing, `This month`, `Close`, back, scrim,
  choosing the selected month, every label and state of FR-032, ≥ 48 dp targets, no motion with
  reduce motion, font scale 2, dark palette.
- [ ] T047 [US4] Implement `src/ui/MonthControl.tsx` (role `button`, label `October 2026`, hint
  "Changes the month", chevron, ≥ 48 dp) that opens `MonthPicker` and applies `setSelected`. Tests
  in `tests/component/monthControl.test.tsx` (label, hint, opens, chooses, works in loading and
  error states).
- [ ] T048 [US4] Replace the arrows in `src/ui/MonthHeader.tsx` with `MonthControl`; remove
  `canGoPrevious`, `canGoNext`, `goPrevious` and `goNext` from
  `src/state/SelectedMonthContext.tsx` (FR-026); in `src/app/index.tsx` `useSummaryMotion`, derive
  the month-change direction with `compareMonths` (an earlier month comes from the left), unless
  design.md chose another month-change motion, which then replaces it. In the same task rewrite the
  001 tests that used the arrows (grep `tests/` for `Previous month`, `Next month`, `goPrevious`,
  `goNext`, `canGo`; e.g. `tests/component/monthNavigation.test.tsx`,
  `tests/component/accessibility.test.tsx`, `tests/component/summaryMotion.test.tsx`,
  `tests/unit/todayAndMonth.test.tsx`) so they reach months through the picker and still check
  001's rules that remain (January 2000 is the first month, the current month the last, the
  rollover after midnight, month change in every state).
- [ ] T049 [US4] Use `MonthControl` as the month title in `src/app/insights.tsx`'s header; changing
  the month there resets both chart selections and drops the handed pace (FR-031). Tests in
  `tests/component/insights.test.tsx`: a month chosen on Insights shows in every section with no
  detail open, and going back shows it on the summary (FR-029).
- [ ] T050 [P] [US4] Add a note at the top of `specs/001-monthly-summary/contracts/ui-screens.md`
  (Summary screen) that 002 replaced the month arrows with the month control (link to 002's
  contract), without rewriting 001's history.
- [ ] T051 [US4] Wire `tapOutsidePicker` in `tests/helpers/app.tsx` (press
  `month-picker-scrim`) and add its self-test to `tests/component/appHarness.test.tsx`.
- [ ] T052 [US4] Remove `US4.test.tsx` from `pending.js` (now empty) and run it until green (rules
  as T030); then run `npm run test:acceptance` and `npm test`.

**Checkpoint**: all four stories work; 001's arrows are gone.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T053 [P] Add "Seed 7 months" to the preview dev tools (research R10): `seedSevenMonths(db,
  today, random)` in `src/dev/seed.ts` inserts 1,000 random valid transactions in each of the
  current month (up to today) and the six previous months, in one SQL transaction; a button in
  `src/dev/DevTools.tsx` next to the existing seed. Tests in `tests/unit/seed.test.ts` (counts per
  month, valid rows, rollback on failure) and `tests/component/devTools.test.tsx`.
- [ ] T054 Add the `insights-ready` timing (research R10): allow-list it in `src/lib/devLog.ts`;
  in `src/app/insights.tsx`, log `performance.now() - pressedAt` (from `takePace`) once per open,
  at the first render where all three sections are ready; ms only, preview only. Tests in
  `tests/unit/logging.test.ts` (written in preview, silent in production) and
  `tests/component/insights.test.tsx` (logged once).
- [ ] T055 SC-001 end to end: `tests/integration/insightsReference.test.ts` stores the T008
  fixtures through `createTransactionRepository`, applies their `edits` with `update`, reads with
  `listRange`, runs `computePace`, `dayDetail`, `compareCategories` and `computeTrend`, and asserts
  the T008 literals.
- T056 Dropped (2026-10-09, lighter workflow in AGENTS.md): the implemented UI is checked on the
  phone, not by the `design-reviewer`.
- [ ] T057 Run Stryker (`npx stryker run`) over `src/domain/` and `src/data/`. Review every
  surviving mutant in the 002 files: add the missing test for each real gap, list the equivalent
  ones. Record before and after in `specs/002-monthly-charts/mutation-results.md`.
- [ ] T058 Update docs: `AGENTS.md` (Status: 002 implemented; testing mentions
  `tests/acceptance/`, `npm run test:acceptance` and `tests/helpers/app.tsx`), and
  `plan.md`/`research.md` for anything that changed during implementation (constitution
  principle I).
- [ ] T059 Phone pass in Expo Go (quickstart, Manual scenarios 1-8, and the T023 gesture checks),
  with the developer: record the results and any fine-tuning list in
  `specs/002-monthly-charts/device-checks.md`.
- [ ] T060 Preview APK (`npx eas-cli build --platform android --profile preview`): SC-002 with
  "Seed 7 months" (cold start timings and `insights-ready` ≤ 1000 ms, three runs) in
  `specs/002-monthly-charts/perf-results.md`; SC-005 network check; smoothness of the chart drag
  and Insights scroll; the production manifest still lacks `INTERNET`.
- [ ] T061 SC-003 and SC-006 usability sessions (at least three people, run by the developer on the
  preview APK with sample data over two years); results in
  `specs/002-monthly-charts/validation-results.md`.
- [ ] T062 When the developer asks, open the pull request from `002-monthly-charts` into `develop`
  and confirm CI is green (`npm test`, `npm run lint`, `npm run typecheck`,
  `npm audit --audit-level=critical`); the feature is done only then (constitution II).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: needs T001. T002-T006, T008, T009 and T014 can start at once.
  T007 → none. T010 → T001. T011 → T007, T010. T012 → T011. T013 → T011. T015 → T014. Blocks
  every story.
- **US1 (Phase 3)**: needs Foundational (UI tasks need T015). MVP.
- **US2 (Phase 4)**: needs T027 and T028.
- **US3 (Phase 5)**: needs T024, T027 and T028. Independent of US2 in code, but both edit
  `src/app/insights.tsx`, `src/hooks/useInsights.ts` and `src/format/insights.ts`: do them one
  after the other.
- **US4 (Phase 6)**: needs US1 (scenario 6) and US3 (scenario 7, **View month**).
- **Polish (Phase 7)**: T053 any time after T026; T054 after T042; the rest after all stories.

### Key task dependencies

- T017 → T002, T003, T004, T008. T018, T019 → none. T020 → T005, T006, T017.
- T021 → T007, T017. T023 → T009, T015, T018, T019, T020. T025 → T023. T026 → T021, T022, T025.
- T027 → T004, T007, T017, T022. T028 → T023, T024, T027. T029 → T026, T028. T030 → T016, T029.
- T032 → T006 (and T033's types). T033 → T002, T003, T008. T034 → T033. T035 → T032, T034.
  T036 → T031, T035.
- T038 → T006 (and T039's types). T039 → T002, T003, T008. T040 → T039. T041 → T015, T018, T019,
  T038. T042 → T024, T040, T041. T043 → T037, T042.
- T045 → T002. T046 → T045. T047 → T046. T048 → T047. T049 → T048. T051 → T046. T052 → T044,
  T049, T051.
- T055 → T017, T033, T039.

### Parallel Opportunities

- Foundational: T002, T003, T004, T005, T006, T008, T009 together, and T014 (design) alongside
  them.
- US1: T017, T018, T019 and T022 together; T024 alongside T023.
- US2: T032 and T033 together (types first). US3: T038 and T039 together (types first).
- US4: T050 any time in the phase.

## Parallel Example: Foundational and User Story 1

```bash
Task: "T002 [P] month helpers in src/domain/month.ts"
Task: "T003 [P] percentOf in src/domain/percent.ts"
Task: "T005 [P] signed difference in src/format/money.ts"
Task: "T006 [P] percent texts in src/format/percent.ts"

Task: "T017 [P] [US1] computePace in src/domain/pace.ts"
Task: "T018 [P] [US1] geometry in src/ui/charts/geometry.ts"
Task: "T019 [P] [US1] chartSelection in src/ui/charts/selection.ts"
```

## Delivery Blocks

After each block: run the block's reviewer where agreed, fix, propose the commit, and stop for the
phone check listed (unless the developer chooses to chain blocks, as in 001's Phase 8).

| Block | Tasks | What the developer checks |
| --- | --- | --- |
| 1 | T014–T015 | Approves the mockups and design.md (design-reviewer findings shown) |
| 2 | T001–T008 | `react-native-svg` line in Expo Go; domain, formatting and `listRange` tests green; review the money logic |
| 3 | T009–T013 | No phone check (no entry point yet); harness self-tests green |
| 4a | T016–T022 | US1 acceptance tests written (gaps resolved); pace logic, selection logic and summary reads tested |
| 4b | T023–T030 | MVP: card on the summary, Insights with the full pace chart, tap, drag and vertical scroll on the chart (T023 phone checks), TalkBack days |
| 5 | T031–T036 | Categories vs last month |
| 6 | T037–T043 | Savings trend, details, View month |
| 7 | T044–T052 | Month picker on both screens; arrows gone |
| 8 | T053–T058 | Seed, timing, SC-001 end to end, design review, Stryker, docs |
| 9 | T059–T062 | Phone pass, preview APK (SC-002, SC-005), usability sessions, PR with CI green |

Commits: one or more Conventional Commits per block, proposed to the developer and made only when
they ask.

## Implementation Strategy

### MVP first

1. Block 1, design first (developer, 2026-10-08): the mockups and design.md are where the
   developer decides most, and a design change found now only touches docs. Then blocks 2 and 3
   (Setup and Foundational), which do not depend on the design.
2. Blocks 4a and 4b (US1). **Stop and validate** on the phone: the card already tells the user
   whether they spend more or less than last month, and Insights shows the full pace.

### Incremental delivery

US2 → US3 → US4, one block each, checked on the phone before the next. Polish and the APK checks
come last, because they need the whole feature.

## Notes

- Money tests (T003, T017, T033, T039, T055 and the T008 reference set) are the constitution's
  non-negotiable part; never skip or weaken them to make a task pass.
- If a task cannot follow the spec, plan or contracts as written, stop and update the spec or plan
  first (constitution principle I).
