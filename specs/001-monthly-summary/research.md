# Research: Record Transactions and Monthly Summary

Phase 0 output for `plan.md`. Each entry records a decision, why it was taken and what was
rejected. Decisions marked *(developer)* were approved by the developer on 2026-10-05; the rest
are defaults that follow from them or from the spec.

Versions checked on 2026-10-05: Expo SDK 57 (`expo@57.0.x`, the `latest` tag on npm), React
Native 0.86, React 19.2 and TypeScript 6 (as pinned by the SDK 57 template), Node 22. SDK 58 is
in beta (`next` tag) and is not used.

## R1. Framework: Expo (managed, Continuous Native Generation) *(developer)*

- **Decision**: Expo SDK 57 with TypeScript. No committed `android/` folder: native projects are
  generated from `app.config.ts` when a build needs them (`npx expo prebuild`).
- **Rationale**: the React Native docs recommend a framework for new apps, and Expo removes most
  native setup (Gradle, Android SDK) while learning. All libraries chosen below run in Expo Go,
  so day-to-day testing on the phone needs no Android build. Feature 005 (notification listener)
  stays possible later through a local Expo module and a development build.
- **SDK upgrades**: the Expo Go app on Google Play runs only the latest stable SDK. If SDK 58
  becomes stable during 001, Expo Go stops opening an SDK 57 project. The plan then is to upgrade
  in its own `chore:` commit (`npx expo install expo@^58 --fix`, then run all tests). If the
  upgrade has to wait, the fallback is a development build of our own app made with EAS Build
  (free plan), installed once on the phone, which works like Expo Go for our SDK. It needs
  `expo-dev-client`, listed in the plan as a conditional dependency.
- **Alternatives**: React Native CLI (more native setup for no benefit in 001).

## R2. Starting template

- **Decision**: `create-expo-app --template blank-typescript`, then add Expo Router by hand.
- **Rationale**: the `default` template ships demo screens and extra packages (images, haptics,
  animations) that 001 does not need; principle IV asks for the smallest dependency set.
- **Alternatives**: `default` template (more dependencies to justify or remove).

## R3. Local storage: SQLite through `expo-sqlite` *(developer)*

- **Decision**: one SQLite database file in the app's private storage, opened with
  `openDatabaseAsync` inside our own `DatabaseProvider` (`src/data/DatabaseProvider.tsx`). The
  provider exposes `loading | error | ready` and a `retry` that opens the database again. We do
  not use `SQLiteProvider`, because it renders nothing until the database is open and migrated,
  and it throws if that fails. That would hide **Add** (FR-002) and turn a failed open into the
  generic crash screen instead of FR-024's message. Schema versioning uses `PRAGMA user_version`
  and WAL journal mode (data-model.md).
- **Rationale**: the summary reads one month at a time; an indexed `date` range query returns
  only that month's rows, which keeps SC-004 (1 s cold start with 1,000 rows in the month) safe.
  Writes are durable on disk (SC-003). Official Expo package, works in Expo Go.
- **Alternatives**: AsyncStorage and MMKV (key-value: every month view would load and filter all
  transactions in JavaScript).

## R4. Data access: hand-written SQL in one repository *(developer)*

- **Decision**: a `TransactionRepository` with five operations (see
  `contracts/transaction-repository.md`), written against a minimal `SqlDatabase` interface
  (`execAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`) that `expo-sqlite` already satisfies.
- **Rationale**: one table and five queries do not justify an ORM. The interface lets tests run
  the same SQL on Node (R10).
- **Alternatives**: Drizzle ORM (extra dependency and tooling for a single table).

## R5. Money calculations in TypeScript *(developer)*

- **Decision**: the repository returns the month's rows; pure functions compute totals, balance
  and the per-category breakdown with integer arithmetic.
- **Rationale**: principle II requires unit tests for all money calculations; pure functions are
  the easiest code to test. Summing 1,000 integers takes well under a millisecond.
- **Percent rounding (FR-016)** without floats: with `n = 200 × cat + total` and `d = 2 × total`,
  `percent = (n - n % d) / d`, an exact integer division, is "round half up" of
  `100 × cat / total`. A unit test checks the 12.5 % → 13 % boundary with a very large total. Show `<1%` when `cat > 0` and `percent = 0`. All
  values stay far below `Number.MAX_SAFE_INTEGER` (9 × 10^15).
- **Alternatives**: `SUM`/`GROUP BY` in SQL (money logic split between SQL and TypeScript).

## R6. Navigation: Expo Router *(developer)*

- **Decision**: file-based routes in `src/app/`: the summary (`index`) and a form presented as a
  modal (`transaction/new`, `transaction/[id]`). The month on screen lives in a small React
  context so the form can switch it after saving (FR-020).
- **Rationale**: standard in current Expo; built on React Navigation. React Navigation's
  `usePreventRemove` (imported from `expo-router/react-navigation`, the React Navigation copy
  bundled inside `expo-router` since SDK 56; installing `@react-navigation/native` separately
  would create a second navigation context that the hook cannot see) covers the "Discard changes?" prompt, including Android's back button
  (FR-010).
- **Alternatives**: React Navigation declared in code (more setup).

## R7. Region formatting: `expo-localization` + `Intl` *(developer)*

- **Decision**: `useLocales()` gives the phone's locale tag (`languageTag`) and re-renders when
  system settings change. The form's decimal separator also comes from `Intl`
  (`formatToParts(1.5)` on the same formatter), not from `decimalSeparator`, so the form and the
  display can never disagree. Every formatter uses `numberingSystem: 'latn'`, so digits are
  always 0–9, which the parser accepts. The form's separator is `,` when `Intl` gives `,`, and
  `.` in every other case (for example the Arabic `٫`). A unit test covers `ar-EG`. Display uses (dates: the form only; the list's
  day headers and spoken dates are English constants, FR-029) `Intl.NumberFormat(languageTag,
  { style: 'currency', currency: 'EUR' })` and `Intl.DateTimeFormat(languageTag,
  { day: '2-digit', month: '2-digit', year: 'numeric' })`. Month names (header and spoken dates)
  come from an English constant list, since they are interface text (FR-029).
- **Currency sign** (developer, 2026-10-06): a region outside the euro area formats EUR with
  the code (`es-US`: `EUR 1,234.00`). The formatter therefore replaces the `currency` part with
  `€`; when the sign comes before the number it also drops the space ICU inserts only between
  a letter code and digits, so `es-US` gives `€1,234.00` and `es-ES` keeps `1.234,00 €`. A
  plain string swap is used instead of `currencyDisplay: 'narrowSymbol'`, which Hermes support
  for was not checked on the device.
- **Formatting locale**: a typical user has English as the language and a European region,
  for example `en-ES`. Android's ICU data differs between OS versions, and older ones may not
  include `en_ES`, falling back to plain `en` (`€12.50`). So the result on one phone says nothing
  about another. `format/locale.ts` therefore **always** builds the formatting tag from the
  region: a table maps euro-area region codes to their main language (`ES→es-ES`, `DE→de-DE`, …).
  Regions not in the table, or a `null` region, use the phone's `languageTag`. This only changes
  number and date formatting; the UI stays English. One tag feeds every formatter (display, form
  and spoken text), so they always agree. The on-device check in the first task is informational:
  it records the Hermes output that the formatting tests must match.
- **Money without floats**: `Intl.NumberFormat.format` takes a number, and `cents / 100` would
  put money in a float. So `format/money.ts` splits the cents with integer maths
  (`euros = (abs - abs % 100) / 100`, `rest = abs % 100`; both exact for integers). It calls
  `formatToParts` on the integer `euros`, which gives the region's grouping, € position and
  decimal separator, and replaces the `fraction` part with `rest` padded to 2 digits. The sign is
  added from the parts of a negative format, so `-0,50 €` works even though `euros` is 0. The
  same split builds the form's amount text (FR-005, no grouping, no €) and the spoken text
  (FR-031, "minus"). Unit tests cover `0`, `-50`, `-15000`, `99999999` and month totals above
  999,999.99.
- **Rationale**: Android keeps language and region separate; the locale tag carries the region.
  Hermes (React Native's JavaScript engine) supports these `Intl` APIs on Android.
- **Risk**: `Intl` output on a few uncommon regions must be checked on the device; the
  formatting functions are tested with fixed locales (`es-ES`, `en-GB`, `en-US`).

## R8. Date picker: `@react-native-community/datetimepicker` *(developer)*

- **Decision**: Android's native date dialog with `minimumDate` = 1 Jan 2000 and `maximumDate` =
  today, recomputed every time it opens (FR-006, midnight edge case).
- **Rationale**: the native dialog is accessible, follows dark mode and language, and is part of
  Expo Go. Writing a calendar by hand would be large and error-prone.

## R9. State and data refresh

- **Decision**: no state-management library. A `useMonthSummary(month)` hook loads the month on
  focus (`useFocusEffect`) and exposes `loading | error | ready` plus `retry`. `AppState` events
  recompute "today" when the app returns to the foreground; the forms also compute it when they
  open and when the user saves.
- **Rationale**: there is one screen of shared state; React state and context are enough
  (principle IV). Re-reading on focus satisfies FR-019 with no cache to keep in sync.

## R10. Testing *(developer)*

- **Decision**: Jest with the `jest-expo` preset and React Native Testing Library for component
  tests. Repository tests run real SQL on Node through `better-sqlite3` (dev dependency only)
  behind the same `SqlDatabase` interface.
- **Rationale**: `expo-sqlite` is native and cannot run inside Jest; mocking it would leave the
  SQL, constraints and ordering untested. `better-sqlite3` never ships in the app.
- **Layers**: unit (amount parsing, money, percent, month maths, validation), integration
  (repository + migrations on a temporary database), component (summary states, form behaviour).
- **No network**: no test touches the network; nothing in the code under test makes requests.

## R11. Privacy at build level (FR-027, SC-005) *(developer)*

- **Decision**:
  - No cloud backup and no phone-to-phone transfer on any Android version (spec clarification,
    2026-10-05). Two settings are needed, because Android changed the rules in version 12:
    - `android.allowBackup: false` in `app.config.ts`. On Android 10 and 11 this turns off both
      cloud backup and phone-to-phone transfer.
    - On Android 12 and later, `allowBackup: false` no longer stops phone-to-phone transfer. A
      `data_extraction_rules.xml` excludes every data domain under both `<cloud-backup>` and
      `<device-transfer>`, and the manifest points to it with `android:dataExtractionRules`.
      Expo generates the Android project, so a small local config plugin
      (`plugins/withNoDataExtraction.js`) writes that file and attribute at build time. It uses
      only `expo/config-plugins`, which ships with Expo, so there is no new dependency.
  - The release variant blocks the `INTERNET` permission (`android.blockedPermissions`), so the
    published app physically cannot make network requests. Development builds keep it, because
    they need it to talk to the dev server.
  - No `expo-updates`, analytics or crash reporting packages are installed.
  - Errors go through one `reportError(code)` helper that writes only an error code to logcat, in
    development and preview builds only, and never amounts, notes or categories. In preview and
    production every other `console` call is a no-op (plan, Key Design Notes). Production builds
    log nothing.
- **Alternatives**: `allowBackup: false` alone (phone-to-phone transfer stays open on Android 12
  and later, which breaks FR-027).

## R12. Builds and CI *(developer: EAS Build free plan)*

- **Decision**:
  - Day-to-day: Expo Go on the developer's phone (`npm start`, which sets `APP_VARIANT=development`); no Android Studio needed.
  - Verification builds (allowBackup, blocked permission, SC-004 performance, SC-005 network
    check): a release APK built with **EAS Build on the free plan**. It needs a free Expo account
    and costs nothing; a local Gradle build is the fallback.
  - CI: GitHub Actions running lint, type check and tests on every PR. It is free for public
    repositories, and private ones get a free monthly allowance.
- **Not in 001**: Play Store listing, signing for release and store publishing.

## R13. Note length in visible characters (FR-007) *(developer)*

- **Decision**: count grapheme clusters (what a person sees as one character, so a flag or a
  family emoji counts as 1) behind one function, `countGraphemes(text)` in `src/domain/note.ts`.
  - The implementation is chosen once, after the device check in the first task, with no
    runtime feature detection, so the tested path is the shipped path.
  - If Hermes on Expo SDK 57 provides `Intl.Segmenter`, the function uses it and no package is
    added.
  - If it does not, the function uses `unicode-segmenter` (pre-approved; maintained, last release
    July 2026, small and with no dependencies of its own).
  Either way FR-007 holds as written. Unit tests cover plain text, accented letters, a flag, a
  skin-tone emoji and a family emoji.
- **Alternatives**: counting code points with `Array.from` (breaks FR-007 for combined emojis);
  `graphemer` and `grapheme-splitter` (no releases since 2023 and 2022).

## R14. Lint and formatting

- **Decision**: `npx expo lint` (ESLint with `eslint-config-expo`) and `tsc --noEmit` with
  `strict: true`. No separate formatter in 001.
- **Rationale**: catches common React mistakes (hook rules) with Expo's own config and no extra
  choices.
