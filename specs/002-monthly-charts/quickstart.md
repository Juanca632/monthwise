# Quickstart: Monthly charts and insights

How to run 002 and prove it works. Behaviour lives in [spec.md](spec.md) and
[contracts/](contracts/); this guide only says how to check it. Setup and daily commands are the
same as 001 ([../001-monthly-summary/quickstart.md](../001-monthly-summary/quickstart.md)).

## Setup

```bash
npm install                       # after the plan: adds react-native-svg 15.15.4 (npx expo install)
npm start                         # Expo Go (react-native-svg is bundled in it)
EXPO_PUBLIC_DEV_TOOLS=1 npm start # with the dev tools: seed 1,000 or 7 months, storage error
npm test && npm run lint && npm run typecheck
npm run test:acceptance          # every black-box acceptance test, including stories in progress
                                  # (npm test skips the files listed in tests/acceptance/002/pending.js)
```

## Automated checks

| Check | Covered by | Spec |
| --- | --- | --- |
| Percent rounding, signs, "<1%" | Unit tests, `percent.ts` and the percent formatters | FR-017 |
| Pace series, comparison day, line end, sentence rules | Unit tests, `pace.ts` (31 vs 28/29/30 days, later-dated rows, January 2000) | FR-002, FR-003, FR-007, Edge Cases |
| Category changes and order | Unit tests, `categoryChanges.ts` | FR-008 to FR-010 |
| Six-month trend and headline | Unit tests, `trend.ts` (no-data months, negative saved, no income, range clamped at 2000) | FR-011 to FR-013 |
| SC-001 reference set | Unit tests on `tests/fixtures/insightsReference.ts` against hand-written cents | SC-001, FR-016 |
| `listRange` edges and errors | Integration tests on better-sqlite3 | contracts/transaction-repository.md |
| Picker year rules | Unit tests, `pickerYear` | FR-027 |
| Day under the finger, selection rules | Unit tests, `geometry.ts` and `selection.ts` | FR-006, FR-014 |
| Card, Insights and picker states, texts, labels | Component tests, including font scale 2 with FR-022's largest values | FR-001 to FR-032 |
| No Insights read before its transition ends; handed pace only for its month | Component test with a controllable `transitionEnd` | Constitution V, FR-019 |
| Acceptance scenarios US1-US4 | `tests/acceptance/002/` (spec-tester, black box) | User stories |
| 001 still works without the arrows | Updated 001 suites (month navigation now through the picker) | FR-026 |
| Mutation score | `npx stryker run` over `src/domain/` and `src/data/`, compared with 001's | Principle II |

## Manual scenarios on the phone

Expo Go unless noted. Use made-up data only (001, Scope of FR-027).

1. **Card**: in the current month add expenses on a few days this month and last month → the
   card's sentence matches a hand sum by today; tap the card → Insights opens on the same month.
2. **Pace chart**: tap a day → its detail; tap it again → gone; drag across the chart → the detail
   follows the finger and stays where it lifts; a vertical swipe on the chart scrolls the screen.
3. **Categories**: two months with one category up, one down, one new and one gone → order and
   signs as in US2.
4. **Trend**: six months including one with more expenses than income and one empty → "No data"
   column, bar below zero, headline; tap a month → detail; **View month** → every section shows it.
5. **Month picker**: from the summary open the picker, go back two years, pick March → summary
   shows it; open Insights, pick another month, go back → the summary shows that month; "This
   month" returns; a tap outside closes without change. Count taps for SC-006 (≤ 4 and ≤ 2).
6. **Live updates**: with Insights open, add an expense from the summary and come back → card and
   charts include it.
7. **Dark mode, largest font, TalkBack**: switch dark mode; set the largest font and display size
   → nothing cut; turn TalkBack on → the card reads its sentence, each day reads "Day N" with its
   amounts, rows and months read their values, the picker is usable (SC-004).
8. **Remove animations**: on → charts appear without motion (FR-024).

## Preview APK checks

```bash
npx eas-cli build --platform android --profile preview
```

1. **SC-002**: dev tools → "Seed 7 months" (1,000 transactions in each of the current and six
   previous months). Cold start the app: `adb logcat | grep monthwise` shows 001's startup timings
   (totals and 5 rows within 1 s). Tap the card: `insights-ready` must be ≤ 1000 ms. Repeat three
   times, record the results in `perf-results.md`.
2. **SC-005**: a full session over all stories with a network monitor (as 001) → zero requests;
   the preview and production manifests still lack `INTERNET`.
3. **Smoothness**: scroll Insights and drag the pace chart on the preview APK; no visible
   stutter (constitution V).
4. **SC-003 and SC-006**: the usability sessions with at least three people, run on this build
   with sample data; results in `validation-results.md`.
