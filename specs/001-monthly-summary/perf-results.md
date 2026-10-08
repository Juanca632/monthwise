# Performance results (T052, SC-004)

Cold start of the `preview` APK with 1,000 seeded transactions in the current month, measured as
in quickstart.md (SC-004) on 2026-10-08.

- **Device**: Samsung Galaxy S24+ (SM-S926U1), Android 16, 12 GB RAM, over wireless `adb`. This
  phone is well above the SC-004 reference (Android 10+, 4 GB RAM), so these times are a lower
  bound; a 4 GB phone was not available.
- **Method**: `am force-stop`, then `screenrecord` while `am start -W` opens `.MainActivity`.
  Frames are timed by frame-to-frame pixel difference and checked by eye on run 8:
  - *Window*: the first frame where the app window replaces the launcher.
  - *Content*: the first frame where the summary (totals and first rows) starts drawing over the
    splash.
  - *Settled*: the last changing frame, when the entrance animation ends and everything is fully
    shown.
- **Pass rule**: every run ≤ 1,000 ms. Both *content* and *settled* pass on every run.

| Run | Window → content (ms) | Window → settled (ms) | `am start` TotalTime (ms) | bundle-ready | fonts-ready | db-open | first-query |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 523 | 908 | 486 | 204 | 261 | 72 | 14 |
| 2 | 442 | 824 | 404 | 175 | 219 | 45 | 22 |
| 3 | 466 | 849 | 452 | 172 | 216 | 9 | 18 |
| 4 | 484 | 866 | 469 | 174 | 221 | 10 | 24 |
| 5 | 466 | 849 | 456 | 175 | 218 | 11 | 22 |
| 6 | 467 | 832 | 438 | 178 | 229 | 64 | 27 |
| 7 | 459 | 841 | 403 | 179 | 222 | 12 | 19 |
| 8 | 409 | 791 | 396 | 172 | 217 | 9 | 22 |
| 9 | 490 | 866 | 446 | 177 | 227 | 10 | 44 |
| 10 | 466 | 841 | 449 | 180 | 225 | 11 | 22 |

Median: 466 ms to content and 845 ms to settled. Worst: 523 ms and 908 ms. **SC-004 passes.**
The log timings (ms, from the app's `timing` lines) show that bundle loading and fonts take most of
the start; opening the database and the first query of 1,000 rows take tens of milliseconds.
