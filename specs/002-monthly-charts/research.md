# Research: Monthly charts and insights

Phase 0 output for [plan.md](plan.md). Each entry gives the decision, why, and what else was
considered. Entries marked *(developer)* were chosen by the developer on 2026-10-08. Decisions
from 001 ([../001-monthly-summary/research.md](../001-monthly-summary/research.md)) still hold
unless an entry here changes them.

## R1. Drawing the charts: `react-native-svg`, charts drawn by hand *(developer)*

- **Decision**: add `react-native-svg` 15.15.4 (the version in SDK 57's `bundledNativeModules.json`,
  installed with `npx expo install`). The pace lines are SVG paths and the trend bars SVG
  rectangles, drawn by our own components in `src/ui/charts/`. Touch uses the
  `react-native-gesture-handler` and motion the `react-native-reanimated` already in the app.
- **Rationale**: React Native has no way to draw a line through arbitrary points. SVG is the
  standard, small answer, and Expo Go already ships it, so no development build is needed. Drawing
  the charts ourselves keeps FR-006's tap-or-drag rule, FR-014's one-detail rule and FR-023's
  per-day screen reader elements under our control.
- **Alternatives**: a chart library (`victory-native` needs `@shopify/react-native-skia`, several
  MB in the APK; `react-native-gifted-charts` needs `react-native-svg` plus
  `react-native-linear-gradient`): more dependencies, and their touch and accessibility models do
  not match FR-006 and FR-023. Plain `View`s: no new dependency, but lines become rotated
  segments, fragile to draw and animate.

## R2. Where the numbers are computed: pure TypeScript in `src/domain/` *(developer)*

- **Decision**: one new repository read, `listRange(from, to)`, returns slim rows (`type`,
  `amountCents`, `date`, `category`; no note) for whole months, and pure functions in
  `src/domain/` compute the pace, the category changes and the trend
  ([contracts/insights-domain.md](contracts/insights-domain.md)). Nothing is stored (FR-025).
- **Rationale**: it is how 001 computes its summary, so all money logic stays in plain functions
  with unit tests and Stryker mutation runs (principle II). The largest read is six months (Insights); at
  SC-002's 1,000 transactions per month that is 6,000 rows of four columns, read through the
  `date` index. The cost is measured on the preview APK (quickstart), not assumed.
- **Alternatives**: SQL `SUM ... GROUP BY` returning per-day, per-category and per-month totals:
  fewer rows, but part of the money logic would live in SQL and be tested only through
  integration tests.

## R3. Loading: the card rides on the summary's query; Insights reads once, after its transition

- **Decision**:
  - **Card**: `useMonthSummary` also reads the previous month (`listRange(previous, previous)`)
    in the same `Promise.all` as 001's `listByMonth` for the month on screen, and returns the pace
    with the summary. `computePace` takes the selected month's rows from that same `listByMonth`
    result (a `Transaction` has every `LedgerRow` field, and the domain functions do not depend on
    row order), so the only extra read is the previous month's: at most 1,000 slim rows. The
    card therefore has exactly the summary's states (FR-019, FR-020: loading together, hidden
    behind the same error) and never a sentence from half the data. January 2000 skips the second
    read (nothing can exist before it).
  - **Insights**: one `listRange(trendStart, selected)` read covers the six months, which always
    include the previous month (except before January 2000, where there is none). The summary
    hands its pace to Insights when the card is tapped (`src/state/handedPace.ts`, like 001's
    `openedTransaction.ts`), so the pace section is drawn while the screen slides in. The handed
    pace carries its month and is used only while that month is selected; a month change drops it.
    The read
    starts when the push transition ends (constitution V: no JS work during a transition, data on
    screen is handed over); until then the categories and trend sections show their loading
    state (FR-019). A month change, a focus (FR-018) or **Try again** reads again.
  - Results follow 001's rules: only the newest query writes its result, a same-month reload
    keeps what is on screen until the new data arrives, and a failed read shows the error state.
- **Rationale**: one state per screen keeps FR-019 and FR-020 simple to honour and to test. The
  second summary read is at most 1,000 slim rows; SC-002 requires 001's cold start to stay within
  1 s with it, measured on the preview APK.
- **Alternatives**: a separate hook and state for the card (it could disagree with the summary,
  e.g. totals shown and the card in error); one two-month read for the summary (changes 001's list
  query and its ordering); reading again on Insights before the transition (visible jank in the
  001 phone review).

## R4. Percents: integers only, half away from zero

- **Decision**: `percentOf(part, whole)` in `src/domain/percent.ts` returns the whole percent of
  `part / whole` rounded half away from zero, plus the exact sign, using integer maths:
  `|p| = floor((200·|part| + whole) / (2·whole))`, with the sign of `part` applied after. The
  sign is kept separately so a non-zero value that rounds to 0 shows "<1%" with its sign (FR-017).
  `whole` is always positive at the call sites (last month's amount for changes, income for
  rates); 0 is handled before the call ("New", "No income").
- **Rationale**: the 001 helper (research R5 there) rounds half up for non-negative values only;
  changes and savings rates can be negative, where half up would give -37 for -37.5. The largest
  numerator is 200 × 599,999,999,994 cents (FR-022's six-month bound) ≈ 1.2 × 10¹⁴, well under
  `Number.MAX_SAFE_INTEGER` (≈ 9 × 10¹⁵), so plain numbers stay exact.
- **Alternatives**: `Math.round` on a float ratio (rounds -37.5 to -37, and floats near .5 can
  land on the wrong side); `BigInt` (not needed at these sizes).

## R5. Pace chart touch: one manual Pan, a pure touch reducer

- **Decision**: the pace chart's touch area is one `GestureDetector` with one
  `Gesture.Pan().manualActivation(true)`, so FR-006's rule is followed exactly instead of
  approximated with a fixed distance:
  - Days are evenly spaced across the touch area's measured width: day N spans
    `[(N-1)·w/D, N·w/D)`, and a point beyond either edge clamps to day 1 or day D
    (`dayAtX` in `src/ui/charts/geometry.ts`). D is always 31: any two consecutive months include
    a 31-day one, and with no previous month the chart still spans 31 days (data-model.md).
  - On touch down the gesture records the day under the finger. On each move it computes the day
    under the finger; when that day differs from the touch-down day, it activates (the touch is now
    a drag). If the finger first moves more than 8 dp vertically, and more vertically than
    horizontally, while still on its touch-down day, the gesture fails and the `ScrollView`
    scrolls; nothing is selected.
  - The Insights screen scrolls in `react-native-gesture-handler`'s `ScrollView`, and the pan
    declares `.blocksExternalGesture(scrollRef)`: the scroll waits until the pan fails (a vertical
    move) and is blocked while it is active. Whether that wait is noticeable is a phone check; if
    it is, the fallback is a `Gesture.Native()` scroll with `requireExternalGestureToFail`.
  - Callbacks run on the UI thread and send only events to JS (`runOnJS`): `down(day)`,
    `move(day)` (only when the day changes), `up()` and `cancel()`. They are worklets: `dayAtX`
    carries the `'worklet'` directive and the measured width is a shared value set in `onLayout`.
  - A pure reducer, `chartSelection` (`src/ui/charts/selection.ts`), holds every rule:
    `up()` without any `move` to another day is a **tap on the touch-down day** (selects it, or
    hides it if it was already selected); once a `move` reached another day it is a **drag**: the
    selection follows each `move` and stays on the last day at `up()`, never hidden; `cancel()`
    (vertical scroll) changes nothing; `activate(day)` (screen reader) acts as a tap; `reset()`
    on a month change (FR-014, FR-031).
- **Rationale**: one gesture and one reducer give one behaviour, with FR-006 and FR-014 fully
  unit-tested without gestures. The same library as 001's sheet; the test harness drives the real
  gesture through `react-native-gesture-handler/jest-utils`.
- **Alternatives**: `Gesture.Exclusive(pan, tap)` with an 8 dp `activeOffsetX` (reviewer,
  2026-10-08: with 10 dp days a drag can start inside the touch-down day, or a tap can end on
  another day, so the result would differ from FR-006); React Native's responder system (cannot
  cooperate with the scroll view on the UI thread, the reason 001 adopted gesture handler); one
  `Pressable` per day (each day would be ~10 dp wide, under FR-023's minimum touch size).

## R6. Screen reader access to the charts

- **Decision**: with the screen reader on (`AccessibilityInfo.isScreenReaderEnabled` and its
  change event, read by a small `useScreenReader` hook), the pace chart draws one accessible
  element per day over the chart, named "Day N", with the day's detail text as its value and
  `selected` state; activating it acts as a tap (FR-006, FR-023). With the screen reader off they
  are not rendered, so they never steal touches from the gesture. Trend months are always
  buttons (six fit the width at ≥ 48 dp). Category rows are single accessible elements with one
  spoken label. Exact texts are in [contracts/ui-screens.md](contracts/ui-screens.md).
- **Rationale**: TalkBack moves through elements, not pixels; a chart without them is silent.
  Rendering 31 extra views only when they are useful keeps the chart cheap.
- **Alternatives**: one element for the whole chart with a long summary (FR-023 needs each day);
  always rendering the day elements with `pointerEvents="none"` (Testing Library then cannot
  press them, and TalkBack's touch exploration gets harder to predict).

## R7. Month picker: the app's own dialog, shared month state

- **Decision**: `MonthPicker` (`src/ui/MonthPicker.tsx`) is a React Native `Modal`, built like
  001's `ConfirmDialog` (fade, scrim, Android back and a tap outside close it). It shows one year
  as a 3 × 4 grid. Its rules are a pure function, `pickerYear(year, selected, today)` in
  `src/domain/month.ts`, which lists the twelve months with `selected` and `available` flags and
  whether "Previous year" and "Next year" are enabled (FR-027). Choosing calls the existing
  `setSelected` of `SelectedMonthContext`, which already makes the month shared by both screens
  (FR-029) and already moves the current month forward after midnight (FR-031). The context drops
  `canGoPrevious`, `canGoNext`, `goPrevious` and `goNext` with 001's arrows (FR-026).
- **Rationale**: no new dependency; the dialog pattern, its motion and its accessibility are
  already proven in 001. The selected month stays app state, not a route parameter, as in 001.
- **Alternatives**: a route with `transparentModal` presentation (more navigation states for a
  small dialog); the native date picker in month mode (Android's has no month-only mode).

## R8. The Insights route

- **Decision**: `/insights` (`src/app/insights.tsx`), a stack screen pushed with Android's own
  animation, like 001's `/transactions`, which follows "Remove animations" (FR-024). A
  `ScrollView` holds the three sections; the header has **Back** and the month control.
- **Rationale**: same pattern as `/transactions`; the system back action works without extra code.
- **Alternatives**: a tab or a section on the summary (the spec asks for a separate screen).

## R9. Acceptance tests from 002: a shared app harness

- **Decision**: `tests/helpers/app.tsx` renders the real summary and Insights screens with real
  SQL (better-sqlite3), a fixed "today", a chosen region and a fake router stack, and exposes a
  small API to seed transactions, navigate back, refocus, change the date and turn the screen
  reader or a storage failure on ([contracts/test-harness.md](contracts/test-harness.md)). It is
  built and unit-tested in the Setup phase, before any `spec-tester` run.
- **Rationale**: `spec-tester` may read `tests/helpers/` but not `src/` or other tests (AGENTS.md).
  Every 001 component suite repeats the same mocks inline; the black-box tests need them in one
  documented place.
- **Alternatives**: letting each acceptance test copy the mocks (it would have to read 001's test
  files, which the agent must not do).

## R10. Measuring SC-002

- **Decision**: the preview-only seed gains a seven-month mode, "Seed 7 months" (1,000
  transactions in each of the current and six previous months, one SQL transaction), next to
  001's "Seed 1,000 transactions". `devLog` adds an `insights-ready` timing (from the card tap to
  all three sections shown, in ms only) in preview builds. The quickstart says how to read both
  on the reference phone.
- **Rationale**: SC-002 is about the phone, not Jest; the same allow-listed logger as 001's
  SC-004 keeps it free of financial data (FR-025).
- **Alternatives**: timing by eye (not repeatable).

## R11. Large text and long amounts

- **Decision**: as in 001 (design.md there, Large text): sentences, labels and rows wrap instead
  of being cut; the category table stacks its amounts under the name when the row does not fit;
  the headline and details wrap. Only single-value amounts that sit in a fixed slot (chart axis
  labels, if design.md uses any) shrink to fit on one line. FR-022's bounds (999,999,999.99 per
  month, 5,999,999,999.94 over six months) are in the component tests at the largest font scale.
- **Rationale**: FR-022 forbids cutting; wrapping is the 001 rule and keeps amounts readable.
- **Alternatives**: fixed-width columns (cut long amounts at large sizes).
