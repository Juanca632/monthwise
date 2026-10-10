# Implementation Plan: Monthly charts and insights

**Branch**: `002-monthly-charts` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-monthly-charts/spec.md`

## Summary

A **Spending pace** card on the summary compares this month's cumulative spending with last
month's, and opens a new **Insights** screen with the full pace chart (tap or drag a day), a
per-category comparison with last month and a six-month savings trend. A month picker replaces
001's month arrows on both screens. Everything is derived on the phone from 001's
`transactions` table: one new slim range read in the repository, pure TypeScript functions in
`src/domain/` for every number, charts drawn with `react-native-svg` and driven by the gesture
and motion libraries already in the app. Nothing new is stored or sent. Decisions and
alternatives are in [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6 (`strict`), React 19.2 and React Native 0.86 through Expo SDK
57 (unchanged from 001)

**Primary Dependencies**: 001's stack, plus `react-native-svg` 15.15.4 (research R1, justified
below). Touch: `react-native-gesture-handler` 2.32; motion: `react-native-reanimated` 4.5.1;
navigation: `expo-router` (all already installed)

**Storage**: 001's SQLite `transactions` table, read only; no schema change, schema version stays
1 ([data-model.md](data-model.md))

**Testing**: Jest (`jest-expo`), React Native Testing Library v13, better-sqlite3 integration
tests, `react-native-gesture-handler/jest-utils` for the chart gestures, Stryker on
`src/domain/` and `src/data/`. From 002, black-box acceptance tests per story by the
`spec-tester` agent in `tests/acceptance/002/`, on the app harness of
[contracts/test-harness.md](contracts/test-harness.md)

**Target Platform**: Android 10+ (001's reference phone, 4 GB RAM), Expo Go for development,
preview and production APKs for checks

**Project Type**: mobile app (single Expo project at the repository root)

**Performance Goals**: Insights shows all three sections within 1 s of tapping the card with
1,000 transactions in each of seven months; 001's cold start (totals and 5 rows within 1 s) still
met with the card (SC-002); chart drag and screen scroll without visible stutter on the preview
APK (constitution V)

**Constraints**: fully offline, zero network requests (SC-005); integer cents end to end
(FR-016); no new stored data (FR-025); largest font and TalkBack (FR-022, FR-023); light and dark
(FR-021); "Remove animations" (FR-024)

**Scale/Scope**: one new screen (Insights), one new dialog (month picker), one new summary card,
four domain modules, one repository method; up to 6,000 rows read for Insights, and one extra month (up to 1,000 rows) on the summary

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
| --- | --- | --- |
| I. Spec-Driven Development | Spec approved with three clarifications (2026-10-08); this plan and tasks precede code. The spec replaces 001 FR-021 (arrows) explicitly. | PASS |
| II. Tested Behavior | Every number (pace, categories, trend, percents) is a pure domain function with unit tests and an SC-001 reference set; `listRange` has integration tests; screens have component tests; acceptance tests per story from the spec only; Stryker on `src/domain/` and `src/data/`. No test uses the network. | PASS |
| III. Financial Data Integrity & Privacy | Integer cents throughout; percents with integer maths (research R4); formatting only in `src/format/`; nothing new stored or sent; the only new log line is the `insights-ready` timing in ms, preview only. | PASS |
| IV. Simplicity First | One new dependency, `react-native-svg`, justified below; no chart library, no state library; one repository read; the picker reuses the dialog pattern and the existing month context. | PASS |
| V. Fast, Mobile-First UX | Loading, error and empty states for the card and each Insights section ([contracts/ui-screens.md](contracts/ui-screens.md)); the summary hands its pace to Insights and Insights reads only after its transition (research R3); gestures on the UI thread (R5); motion follows design.md's performance rules, which design.md for 002 extends. English UI. | PASS |

**Post-design re-check (after Phase 1)**: PASS. Phase 1 added no dependency beyond
`react-native-svg`, no stored data and no new layer. The test harness (research R9) is test code,
not app code.

### Dependencies (principle IV)

| Package | Kind | What it solves | Why the platform or existing code is not enough |
| --- | --- | --- | --- |
| `react-native-svg` (15.15.4, SDK 57's `bundledNativeModules.json`; install with `npx expo install`) | runtime | Draws the pace lines (paths) and trend bars (FR-002, FR-006, FR-011) | React Native cannot draw a line through arbitrary points; plain views would need rotated segments (research R1). Bundled in Expo Go, so no development build is needed. Approved by the developer on 2026-10-08. |

No other package changes. If `npx expo install` pulls a newer `react-native-svg` into the tree
than Expo Go ships, it is pinned like reanimated in 001 (`overrides`).

## Project Structure

### Documentation (this feature)

```text
specs/002-monthly-charts/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0: decisions and alternatives
├── data-model.md        # Phase 1: derived entities (nothing stored)
├── quickstart.md        # Phase 1: how to run and validate
├── contracts/
│   ├── insights-domain.md        # pure functions and types (module paths)
│   ├── transaction-repository.md # listRange
│   ├── ui-screens.md             # card, Insights, picker: texts, labels, states
│   └── test-harness.md           # tests/helpers/app.tsx for acceptance tests
├── design.md            # visual design, from approved mockups, before UI tasks (AGENTS.md)
├── checklists/
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

New files are marked `+`, changed files `~`, removed files `-`. Everything else stays as in 001's plan.

```text
src/
├── app/
│   ├── _layout.tsx              ~ registers the `insights` stack screen
│   ├── index.tsx                ~ Spending pace card under the totals; hands the pace to Insights
│   ├── insights.tsx             + Insights screen (contracts/ui-screens.md)
│   └── transactions.tsx         (unchanged: plain month line)
├── domain/
│   ├── ledger.ts                + LedgerRow
│   ├── percent.ts               + percentOf, half away from zero (research R4)
│   ├── pace.ts                  + computePace, dayDetail
│   ├── categoryChanges.ts       + compareCategories
│   ├── trend.ts                 + trendStart, computeTrend
│   └── month.ts                 ~ addMonths, daysInMonth, compareMonths, pickerYear
├── data/
│   └── transactionRepository.ts ~ listRange (contracts/transaction-repository.md)
├── format/
│   ├── percent.ts               + change percent and rate texts, spoken forms
│   ├── money.ts                 ~ signed difference (`+60,00 €`, `0,00 €`), spoken signed amounts
│   └── insights.ts              + sentences, detail lines, row and month labels
├── hooks/
│   ├── useMonthSummary.ts       ~ also reads the previous month; returns the pace (research R3)
│   ├── useInsights.ts           + one range read after the transition; pace, categories, trend
│   └── useScreenReader.ts       + screen reader on/off, follows the system event (research R6)
├── state/
│   ├── SelectedMonthContext.tsx ~ drops the arrow helpers (canGoPrevious/Next, goPrevious/Next)
│   └── handedPace.ts            + the pace the summary hands to Insights (like openedTransaction)
├── ui/
│   ├── MonthHeader.tsx          - removed in fine-tuning: the month control sits on the balance card
│   ├── Totals.tsx               ~ balance card with the month control (design.md, Summary layout)
│   ├── MonthControl.tsx         + the "October 2026" button that opens the picker
│   ├── CardTitle.tsx            + the small quiet card titles (fine-tuning)
│   ├── PaceSentence.tsx         + pace sentence and trend headline, answers in color (fine-tuning)
│   ├── MonthPicker.tsx          + year grid dialog (research R7)
│   ├── PaceCard.tsx             + the summary card
│   ├── CategoryChanges.tsx      + section 2 table
│   ├── ChartDetail.tsx          + detail lines under a chart (day or month)
│   └── charts/
│       ├── PaceChart.tsx        + lines, axis, gestures, screen reader day elements
│       ├── TrendChart.tsx       + one saved bar per month (below zero when negative), empty columns for months without data
│       ├── geometry.ts          + dayAtX, scales, path points (pure)
│       └── selection.ts         + chartSelection reducer: tap vs drag, FR-014 (pure)
├── dev/
│   ├── seed.ts                  ~ "Seed 7 months" (SC-002)
│   └── DevTools.tsx             ~ its button
└── lib/
    └── devLog.ts                ~ allow-lists the `insights-ready` timing

tests/
├── unit/                        + percent, pace, categoryChanges, trend, month additions,
│                                  geometry, selection, insight texts
├── integration/                 ~ transactionRepository: listRange
├── component/                   + paceCard, insights, monthPicker; ~ 001 suites that used the arrows
├── acceptance/002/              + US1..US4 (spec-tester only)
├── fixtures/insightsReference.ts + SC-001 reference set
└── helpers/app.tsx              + app harness (contracts/test-harness.md)
```

**Structure Decision**: unchanged from 001: one Expo project, dependencies pointing inward
(`app/` → `ui/` and `hooks/` → `data/` and `domain/`), `domain/` free of React, Expo and SQLite.
Chart geometry and selection rules are pure modules under `ui/charts/` so they can be unit-tested
without rendering.

## Key Design Notes

- **Money flow**: `listRange` slim rows → domain functions (cents, integer percents) → `format/`
  turns cents and `Percent` values into text only when rendering. Chart coordinates are the only
  floats, computed from cents in `geometry.ts` for drawing and never shown as amounts.
- **One state per screen** (research R3): the card shares the summary's `Promise.all` read, so
  it can never disagree with the totals, and the selected month's rows are 001's `listByMonth`
  result, reused; Insights has one read and one state. Only the newest
  read writes its result, as in 001.
- **No JS work during transitions** (constitution V): the summary hands its pace to Insights;
  the Insights read starts on the stack's `transitionEnd`. The pace chart animates with
  Reanimated on the UI thread and follows `useReduceMotion`.
- **Gestures**: one manually activated pan on the pace chart: it becomes a drag only when the
  finger reaches another day, and fails on vertical movement so the `ScrollView` scrolls
  (research R5). Only day events cross to JS; the `chartSelection` reducer decides tap or drag.
- **Month picker**: `pickerYear` holds the rules; the dialog sets the shared month. 001's
  month-change motion (content slides in from the side of the change) keeps its direction from
  comparing the months, now that there are no arrows (an open design.md item below).
- **001 changes**: the arrows go (FR-026), so 001's month navigation tests are rewritten to use
  the picker, and 001's `ui-screens.md` gets a note pointing to this feature's contract. 001
  FR-021's limits (January 2000, the current month) now live in the picker.
- **Design**: `design.md` (mockups approved by the developer) comes before the UI tasks, and the
  `design-reviewer` runs on it (AGENTS.md). It decides line styles, colors, the compact card
  chart, axis marks, the bar form of the trend and motion, within the contracts.

## Open Items Before Implementation

None. `design.md` was approved before the UI tasks; a month chosen in the picker keeps 001's
slide from the side of the change (design.md, Motion). Changes made during implementation and
phone fine-tuning (2026-10-09): one saved bar per month in the trend, empty columns for months
without data (spec FR-011), the Revolut-like summary and Insights cards (design.md, Direction and
Summary layout), and `MonthHeader.tsx` folded into the balance card.

## Complexity Tracking

No constitution violations to justify.
