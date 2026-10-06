# Implementation Plan: Record Transactions and Monthly Summary

**Branch**: `001-monthly-summary` | **Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-monthly-summary/spec.md`

## Summary

An Android app, built with Expo and React Native, that records income and expenses and shows a
monthly summary: totals, balance, expense breakdown by category and the month's transactions.
It can move back to any month since January 2000. Data lives only in a SQLite database on the
phone. Amounts are integer cents. Money calculations are pure TypeScript functions with unit
tests. The release build has no network permission and Android cloud backup is off. Decisions
and alternatives are in [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6 (`strict`), React 19.2 and React Native 0.86 through Expo SDK 57

**Primary Dependencies**: `expo`, `expo-router`, `expo-sqlite`,
`expo-localization`, `expo-system-ui`, `expo-status-bar`, `@react-native-community/datetimepicker`,
`expo-font`, `expo-splash-screen`, `@expo-google-fonts/manrope`, `@expo/vector-icons` (all runtime
packages are listed and justified in Dependencies below; visual design in [design.md](design.md))

**Storage**: SQLite on the phone (`expo-sqlite`), one table `transactions`; see
[data-model.md](data-model.md)

**Testing**: Jest with the `jest-expo` preset, React Native Testing Library, and `better-sqlite3`
for repository integration tests on Node

**Target Platform**: Android, with Expo SDK 57's default `minSdkVersion` (not raised, to avoid
an extra build-properties dependency). Android 10 (API 29) is the lowest version we test on
(SC-004 reference phone, 4 GB RAM). FR-027 holds on every version the app installs on:
`allowBackup: false` covers Android 11 and earlier, and the data extraction rules cover Android
12 and later (research R11).

**Project Type**: mobile app (single Expo project at the repository root)

**Performance Goals**: cold start to current month's totals and first list items in ≤ 1 s with
1,000 transactions in the month (SC-004); recording an expense in 4 interactions (SC-001)

**Constraints**: fully offline, with zero network requests (SC-005); no cloud backup (FR-027);
exact integer cents (FR-028); system largest font size and TalkBack (FR-031); light and dark
mode (FR-030)

**Scale/Scope**: single user per phone; 2 screens (summary, form) plus 2 confirmations; one
table; up to thousands of transactions per month

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
| --- | --- | --- |
| I. Spec-Driven Development | Approved spec with clarifications (including the 2026-10-05 planning clarification on phone-to-phone transfer, reflected in FR-027); this plan precedes tasks and code. | PASS |
| II. Tested Behavior | Jest unit tests for all money logic (parsing, totals, percentages); integration tests for SQL; component tests for screens; tests never use the network; CI runs everything on each PR. | PASS |
| III. Financial Data Integrity & Privacy | `amount_cents INTEGER` end to end, amounts formatted only in UI helpers, EUR only; no secrets needed in 001 (`.env.example` added when the first secret appears); `reportError` logs codes only; no analytics, crash reporting or OTA updates; cloud backup and phone-to-phone transfer off on every Android version; release build without the `INTERNET` permission. | PASS |
| IV. Simplicity First | Every package in `dependencies` and `devDependencies` is justified below; no ORM, no state library, no UI kit; one repository, pure domain functions. | PASS |
| V. Fast, Mobile-First UX | **Add** always visible; form opens with the amount focused (4 interactions, SC-001); loading, error and empty states defined for the summary and form ([contracts/ui-screens.md](contracts/ui-screens.md)); English UI. | PASS |

**Post-design re-check (after Phase 1)**: PASS. The design adds no dependencies beyond the list
below and no extra layers. The 2026-10-06 glass and motion revision adds `react-native-reanimated`
(direct), `react-native-gesture-handler` and `expo-haptics`, approved by the developer and
justified below. `expo-blur` was installed for it and is removed: the design review showed blur
adds nothing over the smooth glows (design.md, Glass surfaces).

### Dependencies (principle IV)

| Package | Kind | What it solves | Why the platform or existing code is not enough |
| --- | --- | --- | --- |
| `expo` (+ `react`, `react-native`) | runtime | Framework, build tooling, Expo Go | Base of the chosen stack (research R1). |
| `expo-system-ui` | runtime | Makes `userInterfaceStyle: "automatic"` work on Android builds (FR-030) | Expo's docs: without it Android ignores `userInterfaceStyle` and the app stays light. Expo Go bundles it, so the gap would only show on the APK. |
| `expo-status-bar` | runtime (template) | Status bar icons readable in light and dark mode (`style="auto"`) | React Native's own `StatusBar` does not follow the system theme on its own (FR-030). |
| `expo-router` (+ its required peers `react-native-screens`, `react-native-safe-area-context`, `expo-linking`, `expo-constants`, `@expo/metro-runtime`, `@expo/log-box`) | runtime | Screens, modal form, back handling; `usePreventRemove` for "Discard changes?" (FR-010) through `expo-router/react-navigation` | React Native has no built-in navigation (R6). Since SDK 56, `expo-router` bundles React Navigation, so `@react-navigation/native` is not installed: a second copy would have its own navigation context and the hook would not see the router (found in T003, 2026-10-05). Peers checked with `npm view expo-router peerDependencies` on 2026-10-05. |
| `expo-constants` (router peer, also imported directly) | runtime | Reads `extra.variant` from the app config at runtime | The only way for code to read values computed in `app.config.ts`. |
| `react-dom`, `react-native-worklets` *(npm `overrides` pins, not dependencies)*, and the pin on `react-native-reanimated` | transitive | Keep the dependency tree valid and matching Expo Go | Packages inside `expo-router` (Radix, vaul, `@expo/ui`, the drawer) require these as peers, and npm auto-installs their latest versions. `react-dom` 19.3 needs `react` 19.3 and breaks every later install; `reanimated` 4.7 and `worklets` 0.13 are native modules newer than the ones compiled into Expo Go. `overrides` pins them to SDK 57's `bundledNativeModules.json` (19.2.3, 4.5.1, 0.10.1). Our code never imports them. Found in T003 and T007 (2026-10-05). |
| `react-native-reanimated` (4.5.1, direct since 2026-10-06) | runtime | The motion in design.md (Motion): entering and exiting rows, the form sheet, press springs, counting totals, `useAnimatedKeyboard`, `useReducedMotion` | React Native's `Animated` cannot animate layout changes or follow the keyboard frame by frame on the UI thread. Already installed by `expo-router`; now imported directly, still pinned by the override above. |
| `react-native-gesture-handler` (2.32.0, SDK 57's `~2.32.0`, direct) | runtime | Drag down to close the form sheet (design.md, Motion) | React Native's responder system cannot coordinate a drag with the form's scroll view on the UI thread. `expo-router` already pulls in 3.3.0, newer than Expo Go's native module, so install it with `npx expo install` and pin it in `overrides` like reanimated (npm needs the direct dependency to match the override exactly, so both say `2.32.0`). |
| `expo-haptics` | runtime | Haptic feedback (design.md, Haptics) | React Native's `Vibration` only plays raw vibration patterns, not the system's tuned feedback types. |
| `expo-sqlite` | runtime | Durable, indexed local storage | React Native has no built-in database (R3). |
| `expo-localization` | runtime | Phone's locale tag, and a re-render when system settings change | `Intl` alone does not report region changes while the app runs (R7). |
| `@react-native-community/datetimepicker` | runtime | Native date dialog with min/max dates | React Native has no date picker (R8). |
| `expo-font` (already a dependency of `expo`, imported directly) | runtime | Loads the Manrope font files (`useFonts`) | Android only ships Roboto. Manrope is a purely visual choice, part of the design the developer approved (design.md). |
| `expo-splash-screen` | runtime | Keeps the splash screen up until the font is loaded, so text never flashes in the wrong font | Expo's documented way to wait for fonts at startup. |
| `@expo-google-fonts/manrope` | runtime | The Manrope font files (400, 500, 600, 700) | Bundles the font with the app, so nothing is downloaded at runtime (FR-027). |
| `@expo/vector-icons` | runtime | Feather icons used by the design (chevrons, plus, close, calendar, arrows, alert) | React Native has no icon set; drawing them by hand would need `react-native-svg` anyway. |
| `expo-dev-client` *(only if needed)* | runtime | Development build when Expo Go no longer runs SDK 57 (research R1) | Expo Go cannot load an older SDK; added only in that case. |
| `unicode-segmenter` *(only if needed)* | runtime | Counting a note's visible characters (FR-007) | Added only if Hermes lacks `Intl.Segmenter` (R13). |
| `jest`, `jest-expo`, `@testing-library/react-native` (v13) | dev | Test runner and component tests | Required by principle II (R10). v13, not v14: v14 renders through `react-reconciler` 0.34, which needs `react` 19.3, while SDK 57 pins `react` 19.2.3. |
| `react-test-renderer` (19.2.3) | dev | Renderer that `@testing-library/react-native` v13 requires as a peer | Must match `react` exactly; npm would otherwise pick 19.3. Found in T007 (2026-10-05). |
| `better-sqlite3`, `@types/better-sqlite3` | dev | Real SQLite for repository tests on Node | `expo-sqlite` cannot run inside Jest (R10). |
| `typescript`, `@types/react` | dev (template) | Type checking | Shipped by the `blank-typescript` template (R2). |
| `@types/jest` | dev | Types for `describe`/`expect` in tests | Needed for `tsc` to type-check the tests. |
| `eslint`, `eslint-config-expo` | dev | Lint | Installed by `npx expo lint` (R14). |

## Project Structure

### Documentation (this feature)

```text
specs/001-monthly-summary/
├── spec.md
├── decisions.md
├── plan.md              # This file
├── research.md          # Phase 0: decisions and alternatives
├── data-model.md        # Phase 1: table, categories, derived summary, form draft
├── design.md            # Visual design: palette, type, spacing, components (approved 2026-10-05)
├── design/mockups/      # HTML sources of the approved mockups
├── quickstart.md        # Phase 1: how to run and validate
├── contracts/
│   ├── transaction-repository.md
│   └── ui-screens.md
├── checklists/
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
app.config.ts                     # Expo config: name "Monthwise", Android package
                                  # io.github.juanca632.monthwise (permanent once published),
                                  # userInterfaceStyle "automatic" (FR-030), allowBackup false,
                                  # INTERNET blocked outside development builds
plugins/
└── withNoDataExtraction.js       # config plugin: data_extraction_rules.xml (Android 12+)
eas.json                          # build profiles (preview, production); APK output
package.json
tsconfig.json
jest.config.js

src/
├── app/                          # Expo Router routes (screens only, little logic)
│   ├── _layout.tsx               # providers: database, selected month, summary notice; fonts; error boundary
│   ├── index.tsx                 # monthly summary
│   └── transaction/
│       ├── new.tsx               # add form (modal)
│       └── [id].tsx              # edit/delete form (modal)
├── domain/                       # pure TypeScript, no React or SQLite
│   ├── categories.ts             # fixed category lists and labels
│   ├── days.ts                   # the month's rows grouped by day, with each day's net (FR-017)
│   ├── amount.ts                 # parse typed text → cents
│   ├── month.ts                  # YearMonth helpers, ranges, limits, last day
│   ├── note.ts                   # countGraphemes, cut at 100, trim rule
│   ├── summary.ts                # totals, balance, breakdown, percent
│   └── validation.ts             # TransactionDraft → errors or TransactionInput
├── data/
│   ├── DatabaseProvider.tsx      # open + migrate; loading | error | ready, retry
│   ├── errors.ts                 # StorageError, NotFoundError (codes only)
│   ├── sqlDatabase.ts            # SqlDatabase interface
│   ├── migrations.ts             # schema versions (PRAGMA user_version)
│   └── transactionRepository.ts  # contracts/transaction-repository.md
├── format/                       # UI edge: cents → "12,50 €", dates, spoken labels
│   ├── locale.ts                 # one formatting tag (research R7)
│   ├── money.ts                  # always the € sign (research R7)
│   └── date.ts                   # numeric (form), spoken, month and day names (FR-017, FR-029)
├── hooks/
│   ├── useMonthSummary.ts        # loading | error | ready, reload on focus
│   ├── useCountUp.ts             # animated amounts: throttled state, final value for screen readers
│   ├── useToday.ts               # today, refreshed on foreground; forms also read it on open and on save
│   └── useRegion.ts              # locale tag; decimal separator derived from the same Intl formatter
├── state/
│   ├── SelectedMonthContext.tsx
│   ├── SummaryNoticeContext.tsx  # one-off banner messages for the summary (FR-025), last row change
│   ├── SheetTransitionContext.tsx # shared value for the form sheet, summary scale and scrim
│   └── ToastContext.tsx          # "Saved" / "Deleted" confirmation (FR-032)
├── ui/                           # presentational components
│   ├── MonthHeader.tsx
│   ├── Totals.tsx
│   ├── Breakdown.tsx
│   ├── TransactionList.tsx
│   ├── TransactionForm.tsx
│   ├── StateMessage.tsx          # empty / error lines with optional action
│   ├── glass.tsx                 # GlassCard, AccentButton, AmbientBackground (design.md, Glass surfaces)
│   ├── motion.ts                 # curves, durations, reduce motion, PressableScale
│   ├── Toast.tsx
│   └── theme.ts                  # tokens from design.md: palettes, balance-card tones, type, spacing, large text
├── dev/
│   ├── DevTools.tsx              # preview-only dev tools UI: seed button and storage-error switch
│   ├── seed.ts                   # preview-only seed for SC-004
│   └── storageErrorFlag.ts       # preview-only flag for the simulated storage error
└── lib/
    ├── variant.ts                # getVariant(): extra.variant, missing = production
    ├── silenceLogs.ts            # preview/production: console no-op, silent global handler
    ├── haptics.ts                # one haptic per action (design.md, Haptics)
    ├── devLog.ts                 # allow-listed: error codes and timings, preview only
    └── reportError.ts            # codes only, no financial data; dev and preview only

tests/
├── unit/                         # domain/, format/, lib/, app config, hooks and state with fake clock
├── integration/                  # repository + migrations on better-sqlite3
├── component/                    # summary states, form behaviour
├── fixtures/                     # reference transaction set (SC-002)
└── helpers/
    └── betterSqliteAdapter.ts    # SqlDatabase over better-sqlite3

.github/workflows/ci.yml          # install, lint, typecheck, test
```

**Structure Decision**: one Expo project at the root, Android only. Dependencies point inward:
`app/` → `ui/` and `hooks/` → `data/` and `domain/`. `domain/` imports nothing from React,
Expo or SQLite, so all money logic is testable as plain functions. Tests live in `tests/` by
layer instead of next to the code, so the tests of each layer are easy to find.

## Key Design Notes

- **Money flow**: text input → `parseAmount` (cents) → stored as `INTEGER` → summed in
  `summary.ts` → formatted by `format/money.ts` only when rendering. That helper splits euros and
  cents with integer maths and lets `Intl` format only the integer euro part (research R7), so no
  float ever holds money.
- **Month on screen**: `SelectedMonthContext` holds a `YearMonth`. The forms set it to the
  saved transaction's month (FR-020). The foreground handler moves it forward if it was the
  current month and the month changed (spec edge case).
- **Errors**: the repository throws `StorageError` and `NotFoundError` with codes only. Hooks
  turn them into the error states in `contracts/ui-screens.md`. `reportError` writes only the
  error code to logcat in development and preview builds, so the developer can inspect errors on
  a test device (spec clarification).
- **Production builds log nothing**: React Native still sends `console.*` output to logcat in
  release builds, and React logs caught render errors (message and component stack) through
  `console.error`. So the first module loaded (`src/lib/silenceLogs.ts`, imported at the top of
  `_layout.tsx`) replaces every `console` method with a no-op in `preview` and `production`
  builds. **One source of truth, failing closed**: only `app.config.ts` reads `APP_VARIANT`,
  and an unset or unknown value means `production`. It passes the result to the code as
  `extra.variant`, which the code reads through `expo-constants`, and a missing value there also
  means `production`. `development` is set explicitly by the `npm start` script
  (`"start": "APP_VARIANT=development expo start"`). `eas.json` has no `development` profile
  until `expo-dev-client` is needed (research R1). The `preview` profile sets `APP_VARIANT=preview` and `production` sets `APP_VARIANT=production`. So a forgotten setting can only make a build *more*
  locked down. Unit tests cover the unset case in both `app.config.ts` and `silenceLogs.ts`. The
  module also installs a global JS error handler (`ErrorUtils.setGlobalHandler`) that prints
  nothing. Only when `isFatal` is true does it set a root-level `fatal` flag, and `_layout.tsx`
  then renders the same "Something went wrong." screen as the error boundary. Non-fatal errors
  go to `reportError` as a code. A component test covers both paths. Only one allow-listed logger
  (`src/lib/devLog.ts`) keeps a reference to the original `console.log`. In `preview` it writes
  error codes and the SC-004 timings (`bundle-ready`, `fonts-ready`, `db-open`, `first-query`,
  durations in ms only; `bundle-ready` and `fonts-ready` count from the React Native runtime
  start, `performance.rnStartupTiming.startTime`, because `performance.now()` on the phone
  counts from a system clock, not from app start); in `production` it writes nothing. Development builds keep normal console output.
- **Scope of FR-027**: the guarantees apply to `preview` and `production` builds. Development
  and Expo Go sessions stream console output to the dev server, and Expo Go has its own backup
  settings, so they use made-up data only.
- **Build variants**: `app.config.ts` reads `APP_VARIANT` (`development`, `preview`,
  `production`; unset means `production`). Every variant sets `allowBackup: false` and uses the
  `withNoDataExtraction` plugin (research R11). `preview` and `production` block
  `android.permission.INTERNET`. The `preview` profile in `eas.json` also sets
  `EXPO_PUBLIC_DEV_TOOLS=1` (seed for the SC-004 check, simulated storage error). The
  `production` profile sets it to `0` explicitly, so the dev-tools branch is always compiled out.
- **Performance (SC-004)**: indexed range query for one month; `FlatList` renders the list with
  totals and breakdown as its header, so only visible rows are drawn. The 1 s budget also
  includes bundle load and opening the database. It is measured on the `preview` build with the
  method in [quickstart.md](quickstart.md), not assumed from the query alone.

## Open Items Before Implementation

None. The first implementation task checks on the phone whether `Intl.Segmenter` exists; both
outcomes are already decided (research R13). It also records the Hermes `Intl` output that the
formatting tests must match (research R7).

## Complexity Tracking

No constitution violations to justify.
