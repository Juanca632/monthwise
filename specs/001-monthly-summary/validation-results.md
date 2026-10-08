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

## T053: `production` APK

Pending.
