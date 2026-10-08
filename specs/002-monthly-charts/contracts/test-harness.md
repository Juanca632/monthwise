# Contract: App test harness (`tests/helpers/app.tsx`)

The public surface black-box tests (`tests/acceptance/002/`) use to drive the app without
reading `src/` (research R9). It renders the real summary, Insights and month picker over real
SQL (better-sqlite3 through `tests/helpers/betterSqliteAdapter.ts`), and owns every mock those
screens need (today, region, fonts, safe area, router, `expo-sqlite`). It is built in the Setup
phase and has its own tests, so it exists before any `spec-tester` run. Two members are wired
later, when what they drive exists: `paceChart.*` in US1 and `tapOutsidePicker` in US4. Until
then they throw "not wired yet", so a test that uses them fails until its story is built.

## Use

```ts
// Import the harness before any '@/...' module: it installs its mocks on import.
import { renderApp, type AppHandle } from '../../helpers/app';
import type { TransactionInput } from '@/domain/validation';
import type { YearMonth } from '@/domain/month';

const app = await renderApp({
  today: '2026-10-12',                 // the phone's date; the summary opens on its month
  region: 'es-ES',                     // optional, default 'es-ES'
  transactions: [                      // optional, stored before the first render
    { type: 'expense', amountCents: 30_000, date: '2026-10-05', category: 'food', note: null },
  ],
  screenReader: false,                 // optional, default false
});
```

`TransactionInput` is 001's form output: `{ type, amountCents, date, category, note }`, with the
category keys of 001's data model (`food`, `transport`, `housing`, `bills`, `health`,
`shopping`, `leisure`, `other`; income: `salary`, `freelance`, `gifts`, `other`).

`renderApp` resolves once the first screen has finished loading. Queries run against the
rendered tree with React Native Testing Library's `screen` as usual.

## `AppHandle`

| Member | What it does |
| --- | --- |
| `screen: 'summary' \| 'insights' \| 'transactions'` | The screen on top of the fake stack (getter) |
| `selectMonth(ym: YearMonth): Promise<void>` | Makes `ym` the selected month, as choosing it in the month picker would (shared by both screens, FR-029), without going through the picker UI. For stories that need a past month before the picker exists; picker behaviour itself is tested through the picker's elements |
| `back(): Promise<void>` | The system back action: closes the month picker if it is open, otherwise pops the top screen and focuses the one below |
| `tapOutsidePicker(): Promise<void>` | Taps the scrim outside the open month picker's dialog |
| `add(input): Promise<number>` | Stores a transaction through the real repository (as a saved form would) and returns its id; the screen on top then gets focus again, as when a form closes |
| `update(id, input): Promise<void>` | Same, for an edit (the row may move to another month or type) |
| `remove(id): Promise<void>` | Same, for a delete |
| `setToday(iso): Promise<void>` | Changes the phone's date and brings the app back to the foreground (midnight, new month) |
| `setScreenReader(on): Promise<void>` | Turns the screen reader on or off, firing the system's change event |
| `failReads(on): void` | While on, every repository read throws `StorageError` (the next load or **Try again** shows the error state) |
| `settle(): Promise<void>` | Waits until pending reads, transitions and state updates have finished |
| `paceChart.touch(xs: number[]): Promise<void>` | One finger on the pace chart: touches down at `xs[0]`, moves through each x in order and lifts at the last one; y stays constant. Whether it is a tap or a drag follows ui-screens.md (Touch) |
| `paceChart.tapAt(x): Promise<void>` | Same as `touch([x])` |
| `paceChart.dragVertically(x): Promise<void>` | Touches down at `x` and moves 40 dp down without changing day (a scroll) |
| `paceChart.width: number` | The chart's touch width in tests: `310` dp, so each of the 31 days is 10 dp wide (day 8 covers 70 to 80). The harness fires the chart's layout event with this width whenever Insights renders, since Jest has no real layout |
| `unmount(): void` | Unmounts and closes the database |

Only the screen on top of the fake stack is rendered (the month picker renders over it), so
queries never find a lower screen's texts. A popped-to screen mounts again and loads as on
focus, passing through its loading state; the real app keeps the summary mounted under Insights
and reloads it without that state, so tests do not assert on loading right after `back()`. Push
transitions end at once in the harness (the Insights read starts right after the
push); the "no read before the transition ends" rule is covered by a component test, not here.
Screen-reader day elements of the pace chart exist only after `setScreenReader(true)` or with
`screenReader: true`. Activating one with the screen reader is `fireEvent.press` on it (or
`fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } })`).

## Guarantees checked by the harness's own tests

- A summary renders for `today`'s month with the seeded rows.
- Pressing the Spending pace card switches `screen` to `'insights'`; `back()` returns to
  `'summary'`.
- `add` after render is reflected on the screen on top.
- `failReads(true)` followed by a refocus shows "Couldn't load your data.".
- `paceChart.touch` reaches the chart's gesture: one position is a tap, positions in two days are
  a drag, `dragVertically` changes nothing.
- `tapOutsidePicker` closes an open picker.
