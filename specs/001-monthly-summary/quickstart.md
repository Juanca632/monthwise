# Quickstart: Record Transactions and Monthly Summary

How to run 001 and prove it works. Behaviour details live in `spec.md`,
`contracts/ui-screens.md` and `data-model.md`; this guide only says how to check them.

## Prerequisites

- Node.js 22 LTS and npm.
- An Android phone (Android 10 or later) with **Expo Go** from Google Play, on the same Wi-Fi
  as the computer. On WSL2, start the dev server with `--tunnel` if the phone cannot reach it.
- For verification builds only: a free Expo account (`npx eas-cli login`).

## Setup and daily commands

```bash
npm install
npm start                 # APP_VARIANT=development expo start; scan the QR code with Expo Go
                          # (plain `npx expo start` runs as production: no logs)
npm test                  # Jest: unit, integration and component tests
npm run lint              # expo lint
npm run typecheck         # tsc --noEmit
```

## Automated checks

| Check                                   | Covered by                                            | Spec            |
| --------------------------------------- | ----------------------------------------------------- | --------------- |
| Amount parsing table                    | Unit tests, amount parsing                            | FR-004, FR-005  |
| Totals, balance, breakdown, percentages | Unit tests on a reference set of ≥ 50 transactions    | FR-015, FR-016, SC-002 |
| Totals after creates, edits and deletes | Integration test: ≥ 50 repository operations, then summary | SC-002, FR-019 |
| Note length with emojis                 | Unit tests, `countGraphemes`                          | FR-007          |
| Money and date formatting per region    | Unit tests with `es-ES`, `en-GB`, `en-US`; separator taken from the same formatter | FR-005, FR-029 |
| "Today", midnight and foreground        | Unit tests for `useToday` and `SelectedMonthContext` with a fake clock and `AppState` events | Spec edge case, FR-003 |
| Month after save, reload on focus       | Component tests: after save the summary shows the saved date's month; focus triggers a reload without the loading state | FR-019, FR-020  |
| Draft validation                        | Unit tests, `validation.ts`: date range 2000-01-01..today, category valid for type, note length | FR-006, FR-007, FR-008 |
| Form defaults                           | Component tests: new form has Expense, amount focused, no category, date per FR-003 | FR-003 |
| Note typing and paste                   | Component test: pasting more than 100 emoji keeps exactly 100 | FR-007 |
| Theme                                   | Component test: the palette follows a mocked `useColorScheme` (light and dark) | FR-030 |
| Opens on current month; month limits    | Component tests: first render shows the current month; previous hidden on January 2000, next hidden on the current month | FR-014, FR-021 |
| Database open fails / retry             | Component test with a failing `DatabaseProvider`      | FR-002, FR-024  |
| Screen reader labels                    | Component tests assert the labels in `contracts/ui-screens.md` (totals, minus, breakdown, list item) | FR-031 |
| Privacy config per variant              | Unit tests call `app.config.ts` for each `APP_VARIANT`: `allowBackup === false`; preview and production block `android.permission.INTERNET` | FR-027, SC-005 |
| Data extraction rules plugin            | Unit test runs `withNoDataExtraction` on a fixture manifest: `android:dataExtractionRules` set, the XML excludes every domain under `<cloud-backup>` and `<device-transfer>` | FR-027 |
| Release logging silenced                | Unit test: with the preview and production flags, `console.*` writes nothing; `devLog` writes only in preview | FR-027 |
| Month maths (ranges, last day, limits)  | Unit tests, month helpers                             | FR-003, FR-021  |
| SQL, constraints, ordering, migrations  | Integration tests on `better-sqlite3`                 | FR-017, FR-026  |
| Summary states and form behaviour       | Component tests (React Native Testing Library)        | FR-009 to FR-013, FR-022 to FR-025 |

All must pass, with lint and type check, before a PR is merged (CI).

## Manual scenarios on the phone (Expo Go, except where noted)

1. **First use**: fresh install → current month, totals at zero, empty message, **Add**.
2. **US1 core loop**: add 12,50 Food → it shows at the top, expenses +12,50. Add 2000 Salary
   income and 2150 of expenses → the balance shows −150,00 with a minus sign and the negative color.
3. **Persistence**: close the app from recents, reopen → data is there. Restart the phone →
   data is there (SC-003).
4. **US2 breakdown**: 300 Housing, 150 Food, 50 Transport → 60%, 30%, 10% in that order.
5. **US3 edit/delete**: edit 12,50 → 21,50; change the date to last month → the app shows last
   month; delete with confirm and with cancel.
6. **US4 months**: go back to a past month, add a transaction → its date defaults to that
   month's last day; next is hidden on the current month.
7. **Validation**: try `1.250,00`, `0`, an empty amount and no category → messages, nothing lost.
8. **Discard**: change a field, press Android back → "Discard changes?".
9. **Region and theme**: switch the phone region (Spain ↔ United Kingdom) and dark mode → amounts,
   dates and colors follow without losing data. Repeat the dark mode part on the preview APK.
10. **Accessibility**: largest font size and TalkBack on → record an expense and hear the totals
    (SC-007). Scroll to the end of a long list: the last row is not covered by **Add**. With
    `999.999,99 €`, a month total above 10 million and a 100-character note, nothing is cut off;
    the stat pills, rows and Date/Note switch to one column (design.md, Large text).
11. **Intl on Hermes** (first task, then once per SDK upgrade): on the device, check the output of
    the money and date formatters for `es-ES`, `en-GB` and `en-ES` (English UI, Spanish region)
    against the unit test expectations, and check whether `Intl.Segmenter` exists.
12. **SC-001 speed**: from the summary, record an expense with a stopwatch: tap **Add**, type the
    amount, tap a category, tap **Save**. Pass: 4 interactions and under 10 s in 5 of 5 tries.
13. **SC-006 first use** (production-profile APK, which has no seed button, installed from the
    EAS download link on a phone with no dev server): give the app to at least 3 people with no instructions and ask
    them to "record that you spent 8 euros on lunch". Pass: all of them do it without help. Write
    down where anyone hesitated.

## Verification build (release APK)

Needed for the checks that Expo Go cannot show: backup and phone-to-phone transfer off,
`INTERNET` permission blocked, performance.

```bash
npx eas-cli build --platform android --profile preview      # free plan, APK
npx eas-cli build --platform android --profile production   # free plan, APK (log check)
```

`eas.json` sets `android.buildType: "apk"` for both profiles, so each one installs with
`adb install` or from the EAS download link. Store bundles (AAB) are out of scope for 001.

- **SC-004**: load 1,000 transactions in the current month with the seed action. That action
  exists only when `EXPO_PUBLIC_DEV_TOOLS=1`, which only the `preview` profile sets; production
  builds leave it out. Measure the cold start like this:
  1. `adb shell am force-stop io.github.juanca632.monthwise`
  2. Start screen recording (`adb shell screenrecord`), then
     `adb shell am start -W -n io.github.juanca632.monthwise/.MainActivity`.
  3. In the recording, measure from the first frame where the app's window (splash) appears to
     the first frame that shows the totals and the first list rows.

  Repeat 10 times. Pass: every run ≤ 1 s (SC-004). Write the 10 times down in
  `specs/001-monthly-summary/perf-results.md`. If it fails, profile before changing the design.
  The preview build logs bundle-ready, fonts-ready, database-open and first-query durations as
  numbers only.
- **Logs (FR-027)**: run `adb logcat --pid=$(adb shell pidof io.github.juanca632.monthwise)`
  during the manual scenarios.
  - On the `preview` APK, turn on "Simulate storage error" and try to load, save and delete. Only
    error codes and timing lines appear, and no amounts, notes or categories.
  - On the `production` APK, no lines with the `ReactNativeJS` tag appear. Native framework lines
    can appear and are not part of this check.
  - The production bundle does not contain "Seed 1,000".
- **SC-005**: run all manual scenarios with a network monitor (for example PCAPdroid) → zero
  requests from Monthwise. The release manifest has no `INTERNET` permission.
- **FR-027**: the merged manifest of the APK has `android:allowBackup="false"` and
  `android:dataExtractionRules` pointing to rules that exclude everything for both
  `cloud-backup` and `device-transfer`. Check it with `aapt dump xmltree` on the APK, and with
  `adb shell bmgr backupnow io.github.juanca632.monthwise`, which must report that the app does not allow
  backup.
