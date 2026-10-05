---
description: "Task list for 001 — Record Transactions and Monthly Summary"
---

# Tasks: Record Transactions and Monthly Summary

**Input**: Design documents from `/specs/001-monthly-summary/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md, design.md

**Tests**: Required. Constitution principle II says every behavior change ships with automated
tests and all money calculations are unit-tested. Domain, format, storage and logging tasks
include their own tests. UI tasks are covered by the test task at the end of their phase (marked
"Tests: see T0xx"). Every block ships with its tests.

**Organization**: tasks are grouped by user story. Within the project's way of working, work goes
in **blocks** (see Delivery Blocks below). After each block, implementation stops so the developer
can test on the phone.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: user story from spec.md (US1–US4)
- Paths are relative to the repository root (single Expo project, see plan.md)

## Conventions for every task

- Money is integer cents; never divide cents to get a float (plan "Money flow").
- No `console.*` with amounts, notes or categories; errors go through `reportError(code)`.
- UI text exactly as in `contracts/ui-screens.md`.
- Colors, type, spacing, radii and component looks come from `design.md`, through `src/ui/theme.ts`
  tokens; no hard-coded values that have a token.
- After each task: `npm test`, `npm run lint` and `npm run typecheck` pass (from T008 on).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: an Expo SDK 57 project at the repository root that runs in Expo Go, with tests, lint,
CI and the privacy-related build config.

- [X] T001 Scaffold the Expo app at the repository root. Run `npx create-expo-app@latest` with
  `--template blank-typescript@sdk-57` in a temporary directory outside the repo (for example `/tmp/monthwise-scaffold`), because
  the root is not empty.
  Copy `package.json`, `tsconfig.json`, `assets/` and the template's `.gitignore` entries into the
  repo root, merging with the existing `.gitignore`. Do not copy `App.tsx`, `index.ts` or
  `app.json`. Set `"name": "monthwise"` and `"private": true` in `package.json`. Keep all existing
  files (`specs/`, `.specify/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`). Run `npm install`.
- [X] T002 Add Expo Router as in research R6. Run `npx expo install expo-router
  react-native-screens react-native-safe-area-context expo-linking expo-constants
  @expo/metro-runtime @expo/log-box`. Set `"main": "expo-router/entry"` in `package.json`. In
  `tsconfig.json`, set `"strict": true` and the path alias `"@/*": ["./src/*"]`. Create a
  placeholder `src/app/_layout.tsx` (a `Stack`) and `src/app/index.tsx` (text "Monthwise").
- [X] T003 Install the runtime dependencies from the plan's Dependencies table:
  `npx expo install expo-sqlite expo-localization expo-system-ui expo-status-bar
  @react-native-community/datetimepicker expo-font expo-splash-screen
  @expo-google-fonts/manrope @expo/vector-icons`. Do not install `@react-navigation/native`:
  `usePreventRemove` comes from `expo-router/react-navigation` (research R6). First add
  `"overrides": { "react-dom": "19.2.3" }` to `package.json` (plan, Dependencies), then
  `npm ls react-dom` must show only 19.2.3. Do not install `unicode-segmenter` (conditional, see
  T011) or `expo-dev-client` (conditional, only if Expo Go stops running SDK 57; research R1).
- [X] T004 [P] Create the config plugin `plugins/withNoDataExtraction.js` (research R11), using
  only `expo/config-plugins`. It exports two pure helpers for tests: `buildRulesXml()` and
  `applyToManifest(manifest)`. It writes `android/app/src/main/res/xml/data_extraction_rules.xml`
  with `<cloud-backup>` and `<device-transfer>` sections. Each section excludes every domain:
  `root`, `file`, `database`, `sharedpref`, `external`. It also sets
  `android:dataExtractionRules="@xml/data_extraction_rules"` on `<application>`.
- [X] T005 Create `app.config.ts` (plan, Key Design Notes):
  - `name: "Monthwise"`, `slug: "monthwise"`, `scheme: "monthwise"`,
    `android.package: "io.github.juanca632.monthwise"`, `userInterfaceStyle: "automatic"`,
    `android.allowBackup: false`.
  - Plugins: `expo-router`, `./plugins/withNoDataExtraction`, and the plugins `npx expo install`
    registered in T002–T003 (it writes them to an `app.json`, which is then deleted).
  - `icon` and the adaptive icon point to the template's files in `assets/`. The splash is
    configured through the `expo-splash-screen` plugin (Expo's current way), with
    `assets/splash-icon.png` on the design.md `background` colors.
  - Variant: read `process.env.APP_VARIANT`, where unset or unknown means `"production"`. Set
    `extra.variant` to the result. For `preview` and `production`, set
    `android.blockedPermissions: ["android.permission.INTERNET"]`.
  Depends on T004.
- [X] T006 [P] Create `eas.json` with two profiles. Each sets `android.buildType: "apk"` and an
  `env` block. There is no `development` profile until `expo-dev-client` is needed (research R1).
  - `preview`: `APP_VARIANT=preview` and `EXPO_PUBLIC_DEV_TOOLS=1`.
  - `production`: `APP_VARIANT=production` and `EXPO_PUBLIC_DEV_TOOLS=0`.
- [X] T007 Set up tests and scripts:
  - `npx expo install jest-expo jest @testing-library/react-native -- --save-dev`.
  - `npm i -D @types/jest better-sqlite3 @types/better-sqlite3`.
  - `jest.config.js`: `preset: "jest-expo"`, `roots: ["<rootDir>/tests"]`, a moduleNameMapper
    for `@/`.
  - `package.json` scripts: `"start": "APP_VARIANT=development expo start"`, `"test": "jest"`,
    `"lint": "expo lint"`, `"typecheck": "tsc --noEmit"`.
  - Add a smoke test in `tests/unit/smoke.test.ts`.
  - If npm reports a missing peer (for example `react-test-renderer`), stop. Add it to the plan's
    Dependencies table with a justification, then install it.
- [X] T008 Run `npx expo lint` once to generate the ESLint config (`eslint.config.js` with
  `eslint-config-expo`). Fix any findings.
- [X] T009 Create `.github/workflows/ci.yml` (after T007 and T008). On push and pull requests it uses Node 22 and
  runs `npm ci`, `npm run lint`, `npm run typecheck` and `npm test`. No secrets and no network in
  tests.
- [X] T010 Config tests:
  - `tests/unit/appConfig.test.ts` calls the `app.config.ts` export with `APP_VARIANT` unset,
    `development`, `preview`, `production` and `bogus`. Checks: `allowBackup === false` in all
    cases. INTERNET is blocked for unset, `preview`, `production` and `bogus`, and not for
    `development`. `extra.variant` is `production` when unset or unknown.
  - `tests/unit/withNoDataExtraction.test.ts` tests the pure helpers. `applyToManifest` sets the
    attribute on a fixture manifest object. `buildRulesXml()` excludes all five domains under
    both sections.
  Depends on T005 and T007.
- [X] T011 On-device checks (research R7 and R13, quickstart scenario 11):
  1. In `src/app/index.tsx`, temporarily render `typeof Intl.Segmenter` and the phone's
     `getLocales()[0].languageTag` and `regionCode`. For the tags `es-ES`, `en-GB`, `en-US`,
     `en-ES`, `ar-EG` and the phone's own tag, also render:
     - `new Intl.NumberFormat(tag, { style: 'currency', currency: 'EUR', numberingSystem:
       'latn' }).formatToParts(n)` for `n` = `0`, `-1`, `1234`, `-1234`, `999999` and
       `12345678`;
     - the same with `useGrouping: false` and no currency, for `1234`;
     - a `DateTimeFormat` 2-digit date of 2026-09-30.
  2. Run it in Expo Go with `npm start`.
  3. Record the outputs and the one decision in `specs/001-monthly-summary/device-checks.md`:
     the `countGraphemes` implementation (`Intl.Segmenter`, or install `unicode-segmenter`). The
     `Intl` outputs are the expectations for T019 and T020. The formatting tag always comes from
     the region table (research R7), so it needs no decision here.
  4. Remove the temporary code.
  The developer runs this on their phone. Depends on T002, T003, T005 and T007.

**Checkpoint — Block 1 🛑**: the placeholder app opens in Expo Go on the phone; tests, lint and
type check pass; `device-checks.md` records the outputs and the `countGraphemes` decision.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: domain logic, formatting, storage, logging and app shell that every story uses.

**⚠️ CRITICAL**: no user story work starts before this phase is complete.

### Domain (pure TypeScript, no React or SQLite)

- [X] T012 [P] Implement `src/domain/categories.ts`, following data-model.md "Fixed data:
  Category":
  - `TransactionType = 'income' | 'expense'`.
  - Expense keys `food, transport, housing, bills, health, shopping, leisure, other`.
  - Income keys `salary, freelance, gifts, other`.
  - Labels as in the table. `categoriesFor(type)`, `labelFor(type, key)`,
    `isValidCategory(type, key)`.
  - "A category is identified by `type + key`".
  Tests in `tests/unit/categories.test.ts`.
- [X] T013 [P] Implement `src/domain/month.ts`:
  - `YearMonth = { year, month }` (month 1..12) and `IsoDate` (`YYYY-MM-DD`).
  - `monthOf(iso)`, `monthRange(ym)`, which returns `[start, endExclusive)` as ISO days, for
    example `2026-09-01` and `2026-10-01`.
  - `lastDayOf(ym)`, `previous(ym)`, `next(ym)`, `MIN_MONTH = 2000-01`, `isMinMonth`,
    `isCurrentMonth(ym, today)`.
  - `defaultFormDate(selected, today)`: today on the current month, otherwise the last day of the
    selected month (FR-003).
  - `toIsoDate(localDate)` uses local time.
  Tests in `tests/unit/month.test.ts`: leap and non-leap February, December → January, the
  January 2000 limit, and FR-003 defaults.
- [X] T014 [P] (FR-004, FR-005) Implement `src/domain/amount.ts` `parseAmount(text): { ok: true, cents } | { ok:
  false, error }`:
  - The error codes map to the messages in contracts/ui-screens.md.
  - It works on digit strings only ("integer part × 100 + decimal part padded to 2 digits"), with
    no float.
  - The rules are the data-model.md amount table: `12,50`→1250, `12.50`→1250, `.5`→50, `12.`→1200,
    `1.250,00`→more than one separator, `1.250`→more than 2 decimals, `0`/`0,00`→must be greater
    than 0, `-5`→invalid, empty→required, `1000000`→over maximum. Valid range "1 to 99,999,999".
  Tests in `tests/unit/amount.test.ts` cover every row of the table, plus whitespace and non-digit
  input.
- [X] T015 [P] Implement `src/domain/note.ts`:
  - `countGraphemes(text)`, using the implementation chosen in T011 (no runtime feature
    detection). If T011 chose `unicode-segmenter`, install it with `npm i unicode-segmenter`.
  - `cutToGraphemes(text, 100)`.
  - `normalizeNote(text)`: "leading and trailing whitespace is removed; if nothing is left, the
    note is stored as `NULL`".
  Tests in `tests/unit/note.test.ts`: plain text, accented letters, a flag, a skin-tone emoji, a
  family emoji, cutting 150 emoji to 100, and whitespace-only → `null`.
- [X] T016 Implement `src/domain/validation.ts` `validateDraft(draft, today)`:
  - `draft = { type, amountText, date, category, note }`.
  - It returns `{ ok: true, input: TransactionInput }` or `{ ok: false, errors: Partial<Record<
    'amount'|'date'|'category'|'note', code>>, firstInvalid }`, with the field order amount, date,
    category, note.
  - Rules: amount via `parseAmount`; date "between `2000-01-01` and today (FR-006)"; category "not
    `null` and valid for `type` (FR-008)"; note "≤ 100 visible characters", normalized with
    `normalizeNote`.
  Tests in `tests/unit/validation.test.ts`, including a stored date after today (error on date).
  Depends on T012–T015.
- [X] T017 (FR-016, FR-028) Implement `src/domain/summary.ts` `computeSummary(rows)`:
  - Returns `incomeCents`, `expenseCents`, `balanceCents`, and `breakdown` with
    `{ category, amountCents, percent, percentLabel }`.
  - "With `n = 200 × amountCents + expenseCents` and `d = 2 × expenseCents`, `percent = (n - n %
    d) / d`".
  - `percentLabel` is `"<1%"` when amountCents > 0 and percent = 0, otherwise `"{percent}%"`.
  - Order: amount descending, then label alphabetically. Categories with no expenses are omitted.
  Add a reference set of ≥ 50 transactions with hand-calculated totals in
  `tests/fixtures/referenceTransactions.ts`. Tests in `tests/unit/summary.test.ts`: the reference
  set (SC-002), the spec examples (60/30/10, a −150,00 balance), the 12.5 % → 13 % boundary with a
  very large total, `<1%`, ties, and no expenses. Depends on T012 (labels for tie order).

### Formatting (UI edge)

- [X] T018 [P] Implement `src/format/locale.ts` `pickFormattingTag(languageTag, regionCode)`,
  following research R7, "Formatting locale". It returns the table entry for `regionCode`, or
  `languageTag` if the region is `null` or not in the table. The complete table, the euro area in
  2026:
    `AT→de-AT`, `BE→nl-BE`, `BG→bg-BG`, `CY→el-CY`, `DE→de-DE`, `EE→et-EE`, `ES→es-ES`,
    `FI→fi-FI`, `FR→fr-FR`, `GR→el-GR`, `HR→hr-HR`, `IE→en-IE`, `IT→it-IT`, `LT→lt-LT`,
    `LU→fr-LU`, `LV→lv-LV`, `MT→en-MT`, `NL→nl-NL`, `PT→pt-PT`, `SI→sl-SI`, `SK→sk-SK`.
  Tests in `tests/unit/locale.test.ts`: `en`+`ES` → `es-ES`, `en`+`GB` → the phone tag, and a
  `null` region → the phone tag.
- [X] T019 (FR-028, FR-029) Implement `src/format/money.ts` (research R7, "Money without floats"):
  - `formatMoney(cents, tag)`: split with `euros = (abs - abs % 100) / 100` and
    `rest = abs % 100`. Take `formatToParts` of the integer euros (currency EUR,
    `numberingSystem: 'latn'`). Replace the `fraction` part with `rest` padded to 2 digits. The
    sign comes from the parts of a negative format, so `-0,50 €` works.
  - `formatAmountForInput(cents, tag)`: no grouping and no €. It uses the form separator rule:
    `,` if `Intl` gives `,`, otherwise `.`.
  - `formSeparator(tag)` and `spokenMoney(cents, tag)`, which says "minus" for negatives.
  - `formatSignedMoney(cents, type, tag)` for list amounts: `+` for income and `−` for expense,
    using the sign parts `Intl` gives with `signDisplay: 'always'`, never a hard-coded glyph.
  - `currencyPosition(tag)`: `'before' | 'after'`, from where the `currency` part sits, used by
    the form's `€` (design.md).
  Tests in `tests/unit/money.test.ts`: `0`, `-50`, `-15000`, `99999999`, totals above 999,999.99,
  and the tags `es-ES`, `en-GB`, `en-US`, `en-IE`, `ar-EG` (Latin digits, `.` separator), plus
  `formatSignedMoney` and `currencyPosition` for `es-ES` (after) and `en-IE` (before). Expected strings
  come from `device-checks.md`, the Hermes output. If Node's output (Jest) differs for a case, the
  device output wins. Stop, record the difference in `device-checks.md`, and tell the developer
  before changing a test or the code. Depends on T018.
- [X] T020 [P] Implement `src/format/date.ts`:
  - `formatNumericDate(iso, tag)`: `Intl.DateTimeFormat` with 2-digit day and month, a numeric
    year and `numberingSystem: 'latn'`.
  - `formatSpokenDate(iso)`: English month names, for example "30 September 2026".
  - `monthTitle(ym)`: "October 2026". Month names come from an English constant list (FR-029).
  Tests in `tests/unit/date.test.ts`. Numeric dates follow the same rule as T019: the device
  output in `device-checks.md` wins.

**Checkpoint — Block 2a 🛑**: all domain and formatting tests pass (`npm test`). Nothing new to
see on the phone yet; the developer reviews the tests and the money logic.

### Logging and variant

- [X] T021 Implement the logging modules (plan, "Production builds log nothing"):
  - `src/lib/variant.ts`: `getVariant()` reads `Constants.expoConfig?.extra?.variant`, where a
    missing or unknown value means `'production'`.
  - `src/lib/silenceLogs.ts`, in `preview` and `production` only:
    - every `console` method becomes a no-op;
    - it installs `ErrorUtils.setGlobalHandler`, which prints nothing; only when
      `isFatal === true` does it call a registered `onFatal` listener; non-fatal errors go to
      `reportError('js_nonfatal')`.
    In `development` it does nothing, so the default console and error screens (LogBox) stay.
  - `src/lib/devLog.ts`: keeps the original `console.log`; it writes only in `preview` (codes and
    `timing <name> <ms>` lines) and in `development`.
  - `src/lib/reportError.ts`: `reportError(code)` → `devLog`, in development and preview only.
  Tests in `tests/unit/logging.test.ts` mock `getVariant` per case:
  - With the variant unset, `production` and `preview`, `console.*` writes nothing.
  - `devLog` writes in `preview` and not in `production`.
  - The handler calls `onFatal` only for fatal errors.
  - In `development`, the console and the global handler are left untouched.

### Storage

- [X] T022 [P] Create `src/data/sqlDatabase.ts`, the `SqlDatabase` interface from
  contracts/transaction-repository.md, and `src/data/errors.ts` with `StorageError(code)` and
  `NotFoundError`. Neither error carries the original message.
- [X] T023 Create `tests/helpers/betterSqliteAdapter.ts`: it implements `SqlDatabase` over an
  in-memory or temp-file `better-sqlite3` database, returning promises, with `runAsync` returning
  `{ lastInsertRowId, changes }`. Depends on T022.
- [X] T024 Implement `src/data/migrations.ts` `openAndMigrate(db)`:
  - It runs `PRAGMA journal_mode = WAL` outside any transaction.
  - Then, in one transaction, it applies the migrations above `PRAGMA user_version` and sets the
    new version.
  - Version 1 is exactly the `CREATE TABLE transactions` (with all CHECKs as written) and
    `CREATE INDEX idx_transactions_date ON transactions (date)` from data-model.md.
  Tests in `tests/integration/migrations.test.ts`, using a temp file so WAL applies:
  - `user_version = 1`; opening twice does not re-run; `journal_mode` returns `wal`.
  - Each CHECK rejects a bad row, including `2026-02-30` and `2026-13-45`.
  Depends on T022 and T023.
- [X] T025 (FR-026, FR-028, SC-003) Implement `src/data/transactionRepository.ts` from
  contracts/transaction-repository.md:
  - `listByMonth` (ordered `date DESC, id DESC`), `getById`, `create(input, now)`,
    `update(id, input)`, which keeps `created_at`, and `remove(id)`.
  - `update` and `remove` throw `NotFoundError` when `changes === 0`. Other failures are wrapped
    in `StorageError`.
  - Column ↔ field mapping is `amount_cents` ↔ `amountCents`, and so on.
  Tests in `tests/integration/transactionRepository.test.ts`, covering every "Guarantees checked
  by integration tests" item:
  - Round trip; month boundaries (1st, last day, February in leap and non-leap years,
    December → January).
  - Same-day ordering with an older `created_at`; `update` keeps `created_at`; a date change moves
    the row to the other month.
  - Constraint violations store nothing.
  - SC-002: ≥ 50 creates, updates and removes, then `computeSummary(listByMonth)` matches
    hand-calculated cents.
  - FR-026: create rows on a temp file, close the database, reopen it with `openAndMigrate`, and
    the rows are still there.
  Depends on T013, T017 and T024.
- [X] T026 Implement `src/data/DatabaseProvider.tsx`:
  - It opens `openDatabaseAsync('monthwise.db')` and calls `openAndMigrate`.
  - It exposes `status: 'loading' | 'error' | 'ready'`, `retry()` (reopen), `repository` (when
    ready) and `whenReady(timeoutMs = 10000)`. `whenReady` resolves **with the repository**
    (including the dev-tools wrapper) when the database is open, and rejects with
    `StorageError('db_open')` on failure or timeout. Save, update and delete always use the value
    it resolves with, never a repository captured at render time. Inside the dev-tools branch
    only, it also exposes the raw `db` for the seed (T049).
  - It logs the `timing db-open <ms>` line via `devLog`.
  - Create `src/dev/storageErrorFlag.ts` with `setSimulateStorageError(on: boolean)` and
    `isSimulatingStorageError()`, an in-memory flag defaulting to `false`. When
    `process.env.EXPO_PUBLIC_DEV_TOOLS === '1'`, the provider wraps the repository so every call
    throws `StorageError('simulated')` while the flag is on. The wrapper and the `require` of the
    flag module stay inside that `if` branch. T049 only adds the switch UI.
  Tests in `tests/component/DatabaseProvider.test.tsx`, mocking `expo-sqlite` with the
  better-sqlite3 adapter:
  - ready, failing open → error → retry → ready, and the `whenReady` timeout;
  - with `EXPO_PUBLIC_DEV_TOOLS=1` and the flag on, every call throws `StorageError('simulated')`;
    with the flag off, calls work. The test sets `process.env.EXPO_PUBLIC_DEV_TOOLS = '1'` and
    loads the provider inside `jest.isolateModules`. If babel inlines the variable at transform
    time, use a separate Jest project with that env in `setupFiles` instead.
  - `whenReady()` called while opening resolves with the repository once open.
  Depends on T021 (`devLog`), T024 and T025.

### App shell and shared state

- [X] T027 [P] (FR-030) Implement `src/ui/theme.ts` with every token in design.md, exactly as
  written there:
  - the light and dark color tables;
  - the four balance-card tones and `balanceTone(balanceCents)`: `'negative'` when < 0,
    otherwise `'positive'`;
  - the type scale, mapped to the Manrope font family names per weight, with
    `fontVariant: ['tabular-nums']` on numeric tokens. It checks `Font.isLoaded('Manrope_400Regular')`
    from `expo-font` when it renders, and if that is false it falls back to the system font with the
    same numeric `fontWeight`;
  - spacing, radii, `minTouch = 48`, the ripple colors, and `isLargeText`
    (`useWindowDimensions().fontScale >= 1.3`).
  `useTheme()` returns the palette for `useColorScheme()`. Tests in
  `tests/component/theme.test.tsx`: light and dark with a mocked color scheme, and
  `balanceTone` for −1, 0 and 1, the font fallback, and `isLargeText` at 1.0 and 1.3.
- [X] T028 Implement `src/hooks/useToday.ts` and `src/state/SelectedMonthContext.tsx`:
  - `useToday()` returns today's ISO date and recomputes on `AppState` → `active`. A `getToday()`
    function also exists for forms on open and on save.
  - The context starts at the current month (FR-014). It exposes `selected`, `setSelected` and
    `goPrevious`/`goNext`, which respect the limits. On foreground, if `selected` was the old
    current month and the month changed, it moves to the new current month; a past month stays.
  Tests in `tests/unit/todayAndMonth.test.tsx` with fake timers and `AppState` events.
  Depends on T013.
- [X] T029 Implement `src/hooks/useRegion.ts`: it uses `useLocales()` from
  `expo-localization`, then `pickFormattingTag`. It returns `{ tag, formSeparator }` and
  re-renders on settings changes. Tests in `tests/unit/useRegion.test.tsx` with mocked locales.
  Depends on T018 and T019.
- [X] T030 Implement `src/state/SummaryNoticeContext.tsx`: it holds one optional notice code,
  `'open_failed'`, the only summary banner in the contract. It exposes `show(code)` and
  `dismiss()`. The provider sits inside `SelectedMonthProvider` and clears itself whenever
  `selected` changes to a different year or month (compared by value), whatever the reason: navigation, a save (FR-020) or the foreground
  rollover. This is the only place the month-change rule lives. Tests in
  `tests/component/summaryNotice.test.tsx`: show, dismiss, cleared on a month change from
  `setSelected`. Depends on T028.
- [X] T031 Implement `src/app/_layout.tsx`:
  - The first line is `import '@/lib/silenceLogs'`. It wraps `DatabaseProvider`,
    `SelectedMonthProvider` and `SummaryNoticeProvider`.
  - Fonts: `SplashScreen.preventAutoHideAsync()` at module level. `useFonts` loads Manrope
    400/500/600/700 from `@expo-google-fonts/manrope`, plus the Feather icon font
    (`Feather.font` from `@expo/vector-icons`), so icons do not pop in late. The splash is hidden once the fonts are
    loaded or have failed; on failure the app continues with the system font. The providers
    (database included) mount right away, so the database opens while the fonts load. Only the
    `Stack` waits for the fonts. It logs `timing fonts-ready <ms>`.
  - A `Stack` with `headerShown: false` on all routes (the screens draw their own headers,
    design.md), `index`, plus `transaction/new` and `transaction/[id]` with
    `presentation: 'modal'`, and `<StatusBar style="auto" />`. Screens use
    `useSafeAreaInsets()` from `react-native-safe-area-context` for the insets in design.md.
  - It exports `ErrorBoundary`, which renders "Something went wrong." and **Try again** and never
    shows error text. Its content is centered inside all safe-area insets (design.md, Insets). The `onFatal` listener sets a `fatal` flag that renders the same screen.
  - It logs `timing bundle-ready <ms>` in the layout's first effect, and `fonts-ready` when
    the fonts settle, both as milliseconds since the React Native runtime started:
    `performance.now() - performance.rnStartupTiming.startTime`. `performance.now()` alone is
    not that: on the phone it counts from a system clock that runs for days (found in Block 3b,
    2026-10-05). If the startup time is not available, the two lines are skipped.
  Tests in `tests/component/errorHandling.test.tsx`, with `getVariant` mocked: a render error shows the generic screen
  without the error message; a fatal global error shows the same screen; a non-fatal one does not.
  Tests in `tests/component/rootLayout.test.tsx`, with `useFonts` and `expo-splash-screen`
  mocked:
  - the app renders after a successful font load, and also after a failed one;
  - `SplashScreen.hideAsync` is called in both cases;
  - the database starts opening before the fonts finish.
  Depends on T021, T026, T027, T028 and T030.

**Checkpoint — Block 2b 🛑**: all storage and logging tests pass; the app opens in Expo Go with
the new shell (placeholder summary).

---

## Phase 3: User Story 1 - Record a transaction and see the month's totals (Priority: P1) 🎯 MVP

**Goal**: open on the current month, add a transaction in 4 interactions, see the list, totals
and balance update, and keep them after a restart.

**Independent Test**: from no data, record two expenses and one income in the current month. The
list shows all three, and income, expenses and balance match a hand calculation to the cent.

- [X] T032 [P] [US1] Implement `src/ui/StateMessage.tsx` (look: design.md, Summary screen items 5–6): a short line plus an optional action
  button, used for the empty, error and "No expenses" lines. It also has a `banner` variant with a
  **Dismiss** button. Touch targets are ≥ 48 × 48 dp. Tests: see T040 and T050.
- [X] T033 [P] [US1] Implement `src/ui/Totals.tsx`, the balance card from design.md (Summary
  screen item 1):
  - It has a `header` slot where `MonthHeader` renders.
  - It takes `content: { kind: 'loading' } | { kind: 'error', onRetry } | { kind: 'values',
    incomeCents, expenseCents, balanceCents }`, and always renders the header row.
  - Values use `formatMoney` in the tone from `balanceTone`; the negative color is the tone's
    `cardAmount` (there is no separate `negative` token). Loading and error use the positive
    tone, with the looks in design.md.
  - The balance and stat amounts use `numberOfLines={1}`, `adjustsFontSizeToFit` and
    `maxFontSizeMultiplier` 1.3. The stat pills stack when `isLargeText`. "Balance" plus the
    amount form one accessible element.
  - The decorative circle and the icon circles are hidden from the screen reader. A negative balance shows the minus sign plus the negative tone (`cardAmount`), never color alone.
  The accessibility labels are "Income, …", "Expenses, …" and "Balance, minus …"
  (contracts/ui-screens.md). Amounts follow design.md, Large text; other text wraps. Tests: see T040.
- [X] T034 [P] [US1] Implement `src/ui/TransactionList.tsx`, a `FlatList` styled as design.md
  (Summary screen item 3):
  - Each item shows the type, category label, amount, numeric date and note.
  - The accessibility label is "Expense, Food, 12,50 €, 30 September 2026, note: lunch".
  - `ListHeaderComponent` is a slot. Bottom padding is at least the Add button height plus its
    margin. `onPressItem(id)`. Tests: see T040.
- [X] T035 [P] [US1] Implement `src/ui/MonthHeader.tsx` with the month title only (`monthTitle`),
  rendered inside the balance card's header row (design.md).
  Navigation buttons come in T047. Tests: see T040.
- [X] T036 [US1] Implement `src/hooks/useMonthSummary.ts`:
  - It loads `listByMonth(selected)` when the database is ready and on every screen focus
    (`useFocusEffect`).
  - The `loading` state appears only when there is no data yet for that month: first load, a
    month change or a retry. A same-month reload keeps the data on screen.
  - It discards results for a month that is no longer selected.
  - It maps `StorageError` and a database `error` status to `error`. `retry()` reopens the
    database if needed, then reloads.
  - It returns `{ status, summary: computeSummary(rows), rows, retry }` and logs
    `timing first-query <ms>` once.
  Tests in `tests/component/useMonthSummary.test.tsx`: no loading on a same-month reload,
  overlapping queries, and error and retry. Depends on T017, T025, T026 and T028.
- [X] T037 [US1] Implement `src/app/index.tsx`, the summary screen:
  - Layout: the balance card (`Totals` with `MonthHeader` in its header slot), then the states
    from contracts/ui-screens.md. In loading and error, the card shows its loading or error
    content (T033) and the list is not rendered. In error, "Couldn't load your data." with **Try again**.
    In empty, totals at 0 and "No transactions this month yet.". In ready, totals and the list.
  - The floating **Add** button (design.md, Summary screen item 4) is always visible (FR-002) and
    navigates to `/transaction/new`. The empty state also shows the helper line from the
    contract.
  - Strings exactly as in the contract.
  Tests: see T040. Depends on T032–T036.
**Checkpoint — Block 3a 🛑** (after T037 and T040, which can be written now for the summary
states): on the phone, the summary shows the current month and its empty and loading states.
**Add** is visible; its route (`/transaction/new`) is added in T039, so tapping it does nothing
useful yet.

- [X] T038 [US1] (FR-001, FR-011) Implement `src/ui/TransactionForm.tsx` (shared by new and edit):
  - **Fields**:
    - Type toggle; changing the type clears the category (FR-012).
    - Amount `TextInput` with `keyboardType="decimal-pad"`, autofocused on new.
    - Date field that opens the native `DateTimePicker`, with `minimumDate` 2000-01-01 and
      `maximumDate` = `getToday()` at open time. For a stored date after today, the date dialog
      opens on today; the field value keeps the stored date and is flagged on Save.
    - Category chips for the type.
    - Note input; `onChangeText` cuts the text to 100 graphemes with `cutToGraphemes`, without
      `maxLength`.
  - **Insets**: header top padding `8 + insets.top`; keyboard-open layout and fallback as in
    design.md.
  - **Look**: design.md, Transaction form: segmented control with the selected border, centered
    amount with its underline states, the `€` placed by `currencyPosition`, chips, date and note
    (one column when `isLargeText`), per-field error styles, and the footer (failure message,
    Delete, Save) pinned above the keyboard with `KeyboardAvoidingView`.
  - **Screen reader**: as in design.md, a radiogroup labelled "Type" whose segments are radios
    with `accessibilityState={{ checked }}`, and chips as buttons with
    `accessibilityState={{ selected }}`.
  - **Layout**: a `ScrollView` with `keyboardShouldPersistTaps="handled"`. Amount, chips and
    **Save** stay visible above the keyboard at default text size.
  - **Save**: always enabled. It runs `validateDraft(draft, getToday())`; on errors it shows the
    contract messages next to each field and focuses the first invalid one, using the mechanism in
    contracts/ui-screens.md: `focus()` for amount and note; scroll plus
    `AccessibilityInfo.setAccessibilityFocus` for date and category. While an operation is
    in progress, extra taps are ignored and back/close waits.
  - **Discard guard**: `usePreventRemove` from `expo-router/react-navigation` while dirty. Dirty means
    amount and note differ as raw text, or type, date or category differ by value. It asks
    "Discard changes?" with **Discard** and **Keep editing**. The guard is turned off before
    navigating away after a successful save or delete.
  - **Errors**: "Couldn't save. Your changes are still here." and "Couldn't delete."; form content
    is kept.
  - **Accessibility**: every field labelled "label, value, error"; touch targets ≥ 48 dp.
  Tests: see T041 and T046. Depends on T016, T019, T020, T027 and T029.
- [X] T039 [US1] (FR-001) Implement `src/app/transaction/new.tsx`:
  - It renders `TransactionForm` with the defaults: type Expense, empty amount, no category, and
    `defaultFormDate(selected, getToday())`.
  - On Save: `const repo = await whenReady(); await repo.create(input, Date.now())`. Then it
    sets the selected month to `monthOf(input.date)` (FR-020) and closes.
  - If it fails, the form shows the save error and keeps its content.
  Tests: see T041. Depends on T037 and T038.
- [X] T040 [US1] Component tests for the summary in `tests/component/summaryScreen.test.tsx`,
  with the repository on the better-sqlite3 adapter:
  - It opens on the current month (FR-014). Loading shows the indicator and **Add** with no zeros
    (FR-023). Error shows the message, **Try again** and **Add** (FR-024).
  - Empty shows zero totals and the line (FR-022). Ready shows totals, a negative balance with
    "minus" in its label, and list order (FR-015, FR-017).
  - Focusing again after a change updates the screen without the loading state (FR-019, FR-023).
  - The database still opening keeps **Add** visible (FR-002).
- [X] T041 [US1] Component tests for the new form in `tests/component/transactionFormNew.test.tsx`:
  - Defaults (FR-003). Recording an expense takes 4 interactions: open, type, chip, Save. The
    scroll container has `keyboardShouldPersistTaps="handled"`; the real keyboard behavior is
    checked on the phone (quickstart scenario 12, SC-001).
  - The date picker gets `minimumDate` 2000-01-01 and `maximumDate` today (FR-006).
  - The selected segment exposes `accessibilityState.checked` and the selected chip
    `accessibilityState.selected`. With `useSafeAreaInsets` mocked, the header applies
    `insets.top`. The `€` goes before the
    number for an `en-IE` tag and after it for `es-ES`.
  - Every validation message, and focus on the first invalid field: `focus()` for amount,
    `setAccessibilityFocus` for category (FR-009). A type change clears
    the category (FR-012).
  - "Discard changes?" when dirty, none when not dirty, none after a successful save (FR-010).
    Pasting 150 emoji keeps 100 (FR-007).
  - A failed save keeps the content (FR-025). A double tap on Save inserts once. After saving,
    the summary shows the saved date's month (FR-020).
  - A Save while the database is opening waits, then succeeds, or fails after 10 s.

**Checkpoint — Block 3b 🛑 (MVP)**: on the phone, run quickstart scenarios 1, 2, 3, 7 and 8 and
the SC-001 stopwatch check (scenario 12) in Expo Go.

---

## Phase 4: User Story 2 - See where the money went (Priority: P2)

**Goal**: show the expense breakdown per category with amount and share, largest first.

**Independent Test**: record expenses in three categories in one month. Each category shows the
right amount and percentage, ordered from largest to smallest.

- [X] T042 [US2] (FR-016) Implement `src/ui/Breakdown.tsx`, styled as design.md (Summary screen item 2):
  - Rows from `summary.breakdown`: label, `formatMoney` and `percentLabel`. The accessibility
    label is "Food, 150,00 €, 30 percent", or "…, less than 1 percent" for `<1%`.
  - With expenses at 0 and income > 0, it shows "No expenses this month.".
  - Render it in `src/app/index.tsx` between `Totals` and the list (list header) in the ready
    state only. It is hidden in the empty state. Tests: see T043.
- [X] T043 [US2] Component tests in `tests/component/breakdown.test.tsx`:
  - The spec example 300/150/50 → 60 %, 30 %, 10 % in order; ties alphabetical; `<1%`.
  - Income only → "No expenses this month."; categories with no expenses are not listed; the
    breakdown is hidden when the month is empty.

**Checkpoint — Block 4 🛑**: quickstart scenario 4 on the phone.

---

## Phase 5: User Story 3 - Fix or remove a transaction (Priority: P2)

**Goal**: open a transaction from the list to edit any field or delete it.

**Independent Test**: record a transaction, edit its amount and category, and check that totals
and the breakdown update. Then delete it and check that it disappears and the totals return to
their previous values.

- [X] T044 [US3] (FR-011, FR-013) Implement `src/app/transaction/[id].tsx`:
  - **Loading** (`getById` in progress): title plus indicator, no fields; closing is allowed with
    no prompt.
  - **Load fails** (`getById` throws or returns null): `notice.show('open_failed')`, then close.
  - **Ready**: `TransactionForm` with the stored values. The amount uses `formatAmountForInput`
    and the region separator.
  - **Save**: `const repo = await whenReady(); await repo.update(id, input)`, then set the
    selected month to `monthOf(date)` and
    close. On `NotFoundError` the form stays open with "This transaction no longer exists.". On
    any other error, the save error.
  - **Delete**: confirm "Delete this transaction?" with **Delete** and **Cancel**, then
    `(await whenReady()).remove(id)`. `NotFoundError` counts as done: close and the summary reloads. On any
    other error, "Couldn't delete.".
  - Declare `<Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />` in
    `src/app/_layout.tsx`. It was left out until this file exists, because Expo Router warns
    about a declared screen with no route file (found in Block 3b, 2026-10-05).
  - Wire `onPressItem` in `src/app/index.tsx` to `/transaction/[id]`. Opening a transaction
    calls `notice.dismiss()`.
  Tests: see T046.
- [X] T045 [US3] Show the summary banner in `src/app/index.tsx`, using `SummaryNoticeContext` and
  the `StateMessage` banner variant:
  - "Couldn't open this transaction." for `open_failed`.
  - **Dismiss** clears it. A month change clears it (T030), and so does opening another
    transaction (T044).
  - It is announced once with `AccessibilityInfo.announceForAccessibility`.
  Tests: see T046.
- [X] T046 [US3] (FR-011, FR-013) Component tests in `tests/component/transactionFormEdit.test.tsx`:
  - Edit 12.50 → 21.50 updates the list, totals and breakdown. Changing to income clears the
    category and requires a new one.
  - Moving the date to the previous month makes the summary show that month (FR-020).
  - Delete confirm removes the transaction; cancel changes nothing.
  - A load failure closes the form and shows the banner. `update` with `NotFoundError` keeps the
    form and shows the message.
  - A stored date after today flags the date field on save, and the stored date is unchanged
    until the user picks another.
  - A stored date after today: Save calls `setAccessibilityFocus` on the date label.
  - FR-005: open an existing transaction and Save without changes → same cents, no error. FR-010:
    closing it without changes shows no prompt, even though the amount was pre-formatted.
  - `update` throwing `StorageError` shows "Couldn't save. Your changes are still here." and
    keeps the content. `remove` throwing `StorageError` shows "Couldn't delete." and keeps the
    content. `remove` throwing `NotFoundError` closes the form and the summary reloads.
  - Banner: **Dismiss** clears it, opening another transaction clears it, and
    `announceForAccessibility` is called once.

**Checkpoint — Block 5 🛑**: quickstart scenario 5 on the phone.

---

## Phase 6: User Story 4 - Work with previous months (Priority: P3)

**Goal**: move back month by month to January 2000 and forward to the current month. Each month
shows only its own data, and **Add** adds to the month on screen.

**Independent Test**: record transactions in two different past months. Each month shows only its
own transactions and totals. Add one from a past month and check that it lands in that month.

- [X] T047 [US4] Add the month navigation to `src/ui/MonthHeader.tsx` (round 48 dp buttons on the
  balance card, design.md):
  - Previous and next buttons; previous is hidden on January 2000, next on the current month
    (FR-021).
  - Accessibility labels "Previous month, September 2026" and "Next month, …". The header is
    announced as "October 2026". Touch targets ≥ 48 dp.
  - It calls `goPrevious`/`goNext` from `SelectedMonthContext`, and works in every summary state.
  Tests: see T048.
- [X] T048 [US4] Component tests in `tests/component/monthNavigation.test.tsx`:
  - The limits at January 2000 and the current month. A past empty month shows zeros and the empty
    line. Moving back and forward reaches the current month again.
  - No balance carries over (FR-018). On September 2026, **Add** defaults to 2026-09-30, and after
    saving the app shows September (FR-003, FR-020).
  - A slow reply for the previous month is discarded after navigating. Changing the month clears
    the summary banner. A foreground return in a
    new month moves only the current-month view.

**Checkpoint — Block 6 🛑**: quickstart scenario 6 on the phone; all four stories work together.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T049 Implement the preview developer tools in `src/dev/seed.ts`:
  - `seedCurrentMonth(db: SqlDatabase, today)` (with `db` from the dev-tools branch of T026)
    inserts 1,000 random valid transactions dated
    from the 1st of the current month to today. It wraps the inserts in `BEGIN`/`COMMIT` through
    `execAsync`, so they form one SQL transaction.
  - After seeding, the summary reloads through `retry()`.
  - A "Simulate storage error" switch calls `setSimulateStorageError` from T026.
  - Render both at the bottom of the summary only inside
    `if (process.env.EXPO_PUBLIC_DEV_TOOLS === '1')`, loading `seed.ts` with `require` inside that
    branch. The button text is "Seed 1,000 transactions".
  Tests in `tests/unit/seed.test.ts`: 1,000 rows, all dates within range, all valid.
- [ ] T050 (FR-031) Accessibility pass across `src/ui/` and `src/app/`:
  - Every tappable element has `accessibilityRole`, `accessibilityLabel`, ≥ 48 × 48 dp and
    `android_ripple` (design.md).
  - Decorative elements are hidden from the screen reader, and each row and pill is one accessible
    element (design.md).
  - Nothing sets `allowFontScaling={false}`. The balance and stat amounts have
    `numberOfLines={1}`, `adjustsFontSizeToFit` and `maxFontSizeMultiplier` 1.3; all other text
    wraps.
  - With `fontScale` mocked at 1.3, the stat pills, the breakdown and list rows, and Date/Note
    switch to their one-column layouts (design.md, Large text).
  Tests in `tests/component/accessibility.test.tsx` assert the example announcements from
  contracts/ui-screens.md: month header, previous button, the three totals including "minus", a
  breakdown row, a list item and a form field with an error.
- [ ] T051 [P] Update `AGENTS.md`: replace the "Status" and "Setup and commands" TBDs with the
  stack (Expo SDK 57), `npm start` (and why not `npx expo start`), `npm test`, `npm run lint`,
  `npm run typecheck`, the project structure summary from plan.md and the EAS build commands.
- [ ] T052 Verification on the `preview` APK. First time only: `npx eas-cli login` and
  `npx eas-cli init`, then add the returned `extra.eas.projectId` to `app.config.ts`, merged with
  `extra.variant`. Then run `npx eas-cli build --platform android --profile preview`; the
  developer installs it.
  - SC-004 cold start measured as in quickstart.md, 10 runs, results in
    `specs/001-monthly-summary/perf-results.md`.
  - Dark mode on the APK (scenario 9).
  - Logs with "Simulate storage error": only codes and timings.
  - SC-005 network monitor.
  - FR-027 manifest check (`aapt dump xmltree`, `bmgr backupnow`).
  - Record results in `specs/001-monthly-summary/validation-results.md`.
- [ ] T053 Verification on the `production` APK (`--profile production`):
  - No `ReactNativeJS` log lines.
  - Run `unzip -p app.apk assets/index.android.bundle | strings | grep 'Seed 1,000'`; expect no
    output.
  - Quickstart scenarios 9 (region switch) and 10 (largest font and TalkBack, SC-007).
  - SC-006 first-use test with ≥ 3 people.
  - Record results in `specs/001-monthly-summary/validation-results.md`.
- [ ] T054 Final check: `npm test`, `npm run lint` and `npm run typecheck` green locally; every
  checkbox in this file done; open the PR from `001-monthly-summary` to `develop` (only when the
  developer asks) and wait for green CI.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. T011 needs T002, T003, T005 and T007 (the app runs in Expo Go
  with `npm start`).
- **Foundational (Phase 2)**: needs Setup. T015 needs the T011 grapheme decision; T019 and T020 use the
  T011 outputs as test expectations. Blocks all
  user stories.
- **US1 (Phase 3)**: needs Foundational. It is the MVP.
- **US2 (Phase 4)**: needs US1's summary screen (T037), because the breakdown is rendered inside
  it.
- **US3 (Phase 5)**: needs US1's form (T038) and summary (T037).
- **US4 (Phase 6)**: needs US1's summary and header (T035, T037). It is independent of US2 and
  US3.
- **Polish (Phase 7)**: needs all stories. T051 can run any time after Phase 1.

### Key task dependencies

- T005 → T004. T010 → T005, T007. T011 → T002, T003, T005, T007.
- T016 → T012–T015. T017 → T012. T019 → T018. T023 → T022. T024 → T022, T023. T025 → T013, T017, T024. T026 → T021, T024, T025.
- T028 → T013. T029 → T018, T019. T030 → T028. T031 → T021, T026, T028, T030.
- T036 → T017, T025, T026, T028. T037 → T032–T036. T038 → T016, T019, T020, T027, T029.
  T039 → T037, T038.
- T044 → T038, T039. T045 → T030, T032, T044. T047 → T035, T028. T040 → T037. T041 → T039. T048 → T047 (the banner case also needs
  T045; if US4 is done before US3, that case moves to T046).

### Parallel Opportunities

- Setup: T004 and T006 together, after T003.
- Foundational: T012, T013, T014 and T015 (domain); then T018 and T020; T022; T027.
- US1: T032, T033, T034 and T035 together before T036 and T037.
- After US1: US2 (T042–T043) and US4 (T047–T048) touch different files except
  `src/app/index.tsx`, so do them one after the other to avoid conflicts.

## Parallel Example: User Story 1

```bash
Task: "T032 [P] [US1] StateMessage in src/ui/StateMessage.tsx"
Task: "T033 [P] [US1] Totals in src/ui/Totals.tsx"
Task: "T034 [P] [US1] TransactionList in src/ui/TransactionList.tsx"
Task: "T035 [P] [US1] MonthHeader (title) in src/ui/MonthHeader.tsx"
```

## Delivery Blocks (stop after each so the developer can test on the phone)

| Block | Tasks | What the developer checks on the phone |
| --- | --- | --- |
| 1 | T001–T011 | Placeholder app opens in Expo Go; device checks recorded |
| 2a | T012–T020 | Domain and formatting tests green; review the money logic |
| 2b | T021–T031 | App shell opens; storage and logging tests green |
| 3a | T032–T037, T040 | Summary screen and its states for the current month |
| 3b | T038, T039, T041 | MVP: add expenses and income, totals, persistence, validation, discard |
| 4 | T042–T043 | Breakdown per category |
| 5 | T044–T046 | Edit and delete |
| 6 | T047–T048 | Previous months |
| 7 | T049–T054 | Dev tools, accessibility, APK verification, docs |

Commits: one or more Conventional Commits per block, proposed to the developer and made only
when they ask.

## Implementation Strategy

### MVP first

1. Blocks 1, 2a and 2b (Setup and Foundational).
2. Blocks 3a and 3b (US1). **Stop and validate** on the phone: it is already a usable expense tracker for
   the current month.

### Incremental delivery

US2 → US3 → US4. Each block adds one story and is checked on the phone before the next. Polish and
APK verification come last, because they need the whole feature.

## Notes

- Tests for money (T014, T017, T019, T025) are the constitution's non-negotiable part; they must
  never be skipped or weakened to make a task pass.
- If a task cannot follow the spec, plan or contracts as written, stop and update the spec or
  plan first (constitution principle I).
