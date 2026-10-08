# Validation results (T052–T053)

Device: Samsung Galaxy S24+ (SM-S926U1), Android 16, 12 GB RAM, over wireless `adb`.

## T052: `preview` APK (2026-10-08)

Build `ed194abe-5734-48bc-aa02-cdc4a8d14498` (EAS, profile `preview`, version 1.0.0).

| Check | Result |
| --- | --- |
| SC-004 cold start, 1,000 rows, 10 runs | Passed: median 466 ms to content, worst 908 ms to settled (perf-results.md) |
| FR-027 manifest | Passed: `allowBackup="false"`; `dataExtractionRules` excludes `root`, `file`, `database`, `sharedpref` and `external` for both `cloud-backup` and `device-transfer` (read from the APK with androguard, as `aapt` is not installed) |
| FR-027 `bmgr backupnow` | Passed: "Backup is not allowed" |
| SC-005 network | Passed: no `INTERNET` permission in the manifest; the app process is not in the `inet` group (3003), so the kernel refuses its sockets; `dumpsys netstats` holds no traffic entry for its uid after the cold-start runs and the 1,000-row seed |
| Unneeded permissions | **Finding**: the manifest also declares `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE`, added by Expo's Android template; none is granted and the app uses none. Fixed: every variant now blocks them (plan.md, research R11); the T053 APK verifies it |
| Dark mode (scenario 9) | Passed: switching the system theme (`cmd uimode night`) light → dark → light while the summary is open recolors it each time, with the same totals, breakdown and list (screenshots checked) |
| Logs with "Simulate storage error" | Passed for load and save: driven over `adb` (uiautomator and `input tap`), the summary showed "Couldn't load your data." on toggle, month change and Try again, and saving a 12.50 Food expense showed "Couldn't save. Your changes are still here."; `logcat` held only five `[monthwise] error simulated` lines, plus `timing` lines on cold starts, and no amount, note or category. After turning it off the month reloaded with the same balance. **Delete not reachable**: the flag fails every repository call, so no list loads to open a row, and an open sheet hides the switch; the failed-delete path stays covered by component tests (toast and edit-form tests) |

## T053: `production` APK (2026-10-08)

Build `e92c9c1e-ca8c-44af-a74a-8068d24fffb9` (EAS, profile `production`), installed over the
preview build with `adb install -r`, keeping the seeded data.

| Check | Result |
| --- | --- |
| No dev tools in the bundle | Passed: `assets/index.android.bundle` holds neither "Seed 1,000" nor "Simulate storage error" (the preview bundle holds both) |
| Unneeded permissions gone | Passed: the APK requests only `VIBRATE` and Android's internal `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`; `allowBackup="false"` and the data extraction rules are unchanged |
| No `ReactNativeJS` log lines | Passed in substance: across five cold starts, scrolling and See all, the app's own logger wrote nothing. Each start shows one `ReactNativeJS: Running "main"` line, written by React Native's `AppRegistry` when it mounts the root component; it holds only the component name, no user data |
| Cold start (not required, compared with T052) | First start after install 766 ms to content (Android optimizes a fresh install); then 522, 453, 472 and 449 ms to content, 795–888 ms to settled: the same as the preview build |
| Largest font (`font_scale` 2.0) | Passed: summary, breakdown, list and the Add form show no cut-off text; the totals and long chip labels shrink to fit by design (`adjustsFontSizeToFit`) |
| Region switch (scenario 9) | Passed: with the per-app locale (`cmd locale set-app-locales`), `es-ES` shows `23.456,13 €` and `en-GB` shows `€23,456.13`, with the same data; reset to follow the system afterwards |
| TalkBack (scenario 10, SC-007) | Labels checked in the accessibility tree (`uiautomator`): cards and rows read as one phrase each ("Balance, €252,871.48", "Transport, €23,456.13, 14 percent", "Today, net €50,214.62", "Expense, Bills, €53.00, 8 October 2026") and buttons are clickable; heading roles are not exposed there and stay covered by `accessibility.test.tsx`. Listening with TalkBack on: pending, the developer |
| SC-006 first use with ≥ 3 people | Pending: the developer runs it |
