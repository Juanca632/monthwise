# Contract: Screens, texts and accessibility (002)

What 002 adds to or changes in 001's screens
([../../001-monthly-summary/contracts/ui-screens.md](../../001-monthly-summary/contracts/ui-screens.md)),
which still holds where this file says nothing. The look (colors, sizes, line styles, motion) is
design.md's; the texts, roles, labels and states here are fixed. Quoted sentences from spec.md
are exact.

## Notation

Examples use the `es-ES` region, as the 001 contract and the test harness do. Amount formats
come from 001 (FR-029, `formatMoney`): `85,00 €`, `1.234,00 €`.

| Name | Rule | Examples |
| --- | --- | --- |
| **amount** | `formatMoney` of the absolute value | `85,00 €` |
| **signed amount** | `+` above 0, minus below, none at 0 (as 001's day headers) | `+60,00 €`, `-30,00 €`, `0,00 €` |
| **saved amount** | Minus only when negative | `300,00 €`, `-150,00 €` |
| **change percent** | `+` above 0, minus below; `<1%` keeps its sign; `New` (FR-007, FR-017) | `+30%`, `-38%`, `+<1%`, `-<1%`, `0%`, `New` |
| **rate** | Minus only when negative; `No income` when income is 0 | `15%`, `-8%`, `<1%`, `-<1%`, `0%`, `No income` |
| **month name** | English, no year | `September` |

**Spoken forms** (FR-023: negatives as "minus"), used in accessibility labels and values:
signed amount `+60,00 €` → "plus 60,00 €", `-30,00 €` → "minus 30,00 €", `0,00 €` → "0,00 €"; saved amount
`-150,00 €` → "minus 150,00 €"; change percent `+30%` → "plus 30 percent", `-38%` → "minus 38
percent", `+<1%` → "plus less than 1 percent", `-<1%` → "minus less than 1 percent", `0%` →
"0 percent", `New` → "new"; rate `15%` → "15 percent", `-8%` → "minus 8 percent", `<1%` → "less
than 1 percent", `-<1%` → "minus less than 1 percent", `0%` → "0 percent", `No income` → "no
income".

## Routes

| Route | File | Presentation | Purpose |
| --- | --- | --- | --- |
| `/` | `src/app/index.tsx` | Main screen | Summary, now with the Spending pace card and the month control |
| `/insights` | `src/app/insights.tsx` | Stack screen (Android's push and pop, like `/transactions`) | Insights for the selected month (US1-US4) |
| `/transactions`, `/transaction/new`, `/transaction/[id]` | as in 001 | as in 001 | Unchanged; `/transactions` keeps its plain month line, not a control |

The selected month stays shared app state (`SelectedMonthContext`), not a route parameter
(FR-029).

## Month control (FR-026, FR-032)

On the summary (in the balance card's header row, where 001's arrows and title were) and on
Insights (under its title). 001's "Previous month, …" and "Next month, …" buttons are removed.

- Visible text: the selected month, `October 2026`, with a chevron.
- Role `button`; accessibility label `October 2026`; hint "Changes the month".
- Tapping it opens the month picker. It works in every state (loading, error, ready).
- `/transactions` keeps its plain month line (not a control): the month is chosen on the summary.

## Month picker (FR-027, FR-028, FR-032)

An in-app dialog over the screen that opened it.

| Element | Visible text | Role / label / state |
| --- | --- | --- |
| Title | `Choose month` | `header` |
| Shown year | `2026` | text, label `2026` |
| Previous year | chevron | `button`, label `Previous year`, `disabled` on 2000 |
| Next year | chevron | `button`, label `Next year`, `disabled` on the current year |
| Each month (12, grid) | short name, `Mar` | `button`, label `March 2024`; `selected` state on the selected month; `disabled` when after the current month |
| This month | `This month` | `button`, label `This month` |
| Close | `Close` | `button`, label `Close` |

- Opens on the selected month's year. "Previous year" and "Next year" change the shown year by
  one and do not close the picker or change the month.
- Choosing an available month, or "This month", closes the picker and sets the selected month on
  the screen it was opened from (both screens share it). Choosing the selected month only closes.
- "Close", Android's back action and a tap outside the dialog (on the scrim) close it with the
  month unchanged. The scrim is not a screen reader element ("Close" serves that purpose); tests
  reach it through the harness's `tapOutsidePicker()`.
- Changing the month hides any open chart detail (FR-031).

## Summary screen (`/`)

Order, top to bottom: balance card (month control, totals), the 001 "Couldn't open this
transaction." banner when shown, **Spending pace card**, breakdown, "Transactions" + **Add**, the
5 most recent, **See all**.

### Spending pace card (FR-001 to FR-004)

| Summary state | Card |
| --- | --- |
| loading | Shown with its title "Spending pace" and a loading indicator (label `Loading`); no lines, no sentence; not tappable |
| error | Not shown; the summary's own error ("Couldn't load your data." + **Try again**) covers it |
| ready (including a month with no transactions) | Title, the two lines (or one, FR-003 rule 2), a legend naming each line by its month name (`October`, `September`), and the sentence |

- Sentences (FR-003), first rule that applies:
  1. `No spending to compare yet`
  2. `No data from last month to compare` (current month) or `No data from July to compare`
     (past month, previous month's name)
  3. `85,00 € more than last month by day 12`, `65,00 € less than last month by day 12`,
     `Same as last month by day 12`
  4. `200,00 € more than July`, `200,00 € less than July`, `Same as July`
- The whole card is one element: role `button`, label `Spending pace, <sentence>` (e.g.
  `Spending pace, 85,00 € more than last month by day 12`), hint "Opens Insights". Its lines and
  legend are not separately focusable.
- Tapping it opens `/insights` for the selected month (FR-004).
- It is recomputed with the summary on every focus reload (FR-018) and follows the month control.

## Insights screen (`/insights`)

Header: **Back** (role `button`, label `Back`, as `/transactions`), a small `Insights` label
(role `header`, the screen's name) and, under it, the month control in the title style: the month
control is the screen's visual title (FR-005), the label only names the screen, as "Transactions"
does above the month on `/transactions`. Then three sections in a vertical scroll, each with a title
(role `header`): `Spending pace`, `Categories vs last month`, `Savings trend`. Nothing on the
screen adds, edits or deletes a transaction (FR-015).

| Screen state | Shows |
| --- | --- |
| loading | Header; each section's title with a loading indicator (label `Loading`). The pace section may already show the pace handed over by the summary |
| error | Header; `Couldn't load your data.` and **Try again** (label `Try again`) in place of the three sections; never an empty month (FR-020) |
| ready | Header and the three sections below |

The screen reads its data again when it gets focus, when the month changes and on **Try again**
(FR-018). Android's back action and **Back** return to the summary, which shows the same month
(FR-029).

### Section 1: Spending pace (FR-006, FR-007)

- The legend, the two lines (or one), day numbers along the bottom (`1`, `8`, `15`, `22`, `29`)
  and the same sentence as the card. The pace handed over by the summary is shown only while its
  month is the selected month; after a month change the section loads like the others.
- The chart always spans 31 days (any two consecutive months include a 31-day one). For the
  current month, the selected month's line ends at the later of today and its latest transaction
  dated after today, of any type; a later-dated income only makes the line run on flat (it is
  never spending).
- **Touch**: the whole chart area is one touch target. Days are evenly spaced over its width
  `w`: day N covers x from `(N-1)·w/31` to `N·w/31`; x below 0 is day 1 and x at or beyond `w` is
  day 31. A touch is:
  - a **tap** while the finger stays within the day where it touched down: on lift, that day is
    selected, or its detail hidden if it was already selected;
  - a **drag** from the moment the finger reaches another day: the selection follows the day under
    the finger, and on lift the day where it lifted stays selected (never hidden);
  - a **scroll** when the finger first moves more than 8 dp vertically, and more vertically than
    horizontally, while still on its touch-down day: the screen scrolls and the selection does not
    change.
- **Screen reader on**: one element per day, role `button`, label `Day 8`, `selected` state when
  its detail is shown, and as accessibility value the detail's lines after "Day N", spoken and
  joined by ", ": `October: 120,00 €, September: 100,00 €, plus 20,00 €, plus 20 percent`.
  Activating it acts as a tap. With the screen reader off these elements are not rendered.
- **Day detail** (one Text per line, under the chart):
  - `Day 8`
  - `October: 120,00 €` (omitted when the day is after the selected month's line or past its last
    day)
  - `September: 100,00 €` (omitted when the previous month has no data)
  - `+20,00 € · +20%` (signed amount `·` change percent; only when both lines above are shown)
- Selection rules (FR-014): none on open; a tap on another day replaces the detail; a tap on the
  selected day hides it; a drag ends with the day where the finger lifted selected, and never
  hides it; a scroll changes nothing.

### Section 2: Categories vs last month (FR-008 to FR-010)

| Case | Shows |
| --- | --- |
| Neither month has expenses | `No spending to compare yet`, no rows |
| Previous month has no data | `No data from last month to compare` (current month) or `No data from July to compare` (past month); one row per category with that month's amount, largest first |
| Otherwise | For the current month `Compared by day 12` above the rows (none for a past month); one row per category |

No column titles: each row says what it compares (developer, 2026-10-09, a compact list).

- A row shows, each as its own Text: the category label (001's labels, e.g. `Food`), this
  month's amount (`260,00 €`), the change line `+60,00 € vs last month` (current month) or
  `+60,00 € vs July` (past month: the previous month's name), and the change percent (`+30%`,
  `New`). In the "no data" case only the label and this month's amount. Last month's amount is
  not shown; the accessible label gives it.
- Each row is one accessible element. Current month: `Food, this month 100,00 €, last month
  90,00 €, plus 10,00 €, plus 11 percent`. Past month (August against July): `Food, August
  260,00 €, July 200,00 €, plus 60,00 €, plus 30 percent`; with `New`: `Leisure, August 40,00 €,
  July 0,00 €, plus 40,00 €, new`. The "no data" case: `Food, this month 260,00 €` or `Food,
  August 260,00 €`.
- Rows are not tappable.
- At large text sizes the row's texts wrap; nothing moves to another layout.

### Section 3: Savings trend (FR-011 to FR-013)

| Case | Shows |
| --- | --- |
| Every month shown has no data | `No data yet`; no chart, no headline |
| Otherwise | Headline, then one column per month in calendar order with its short name (`May`) under it |

- Legend under the headline: `Income`, `Expenses`, `Saved`, one Text each, naming the three
  marks design.md draws per month. It is hidden from the screen reader: each month's value already
  names them.
- Headline: `Saved 1.800,00 € in 6 months · 15%`; `in 1 month` for one; the saved amount
  takes a minus when negative (`Saved -400,00 € in 1 month · No income`). Accessibility label:
  `Saved 1.800,00 € in 6 months, 15 percent` (spoken forms, `·` read as a comma).
- Each month is a button (role `button`, label the month name, e.g. `September`, `selected` state
  when its detail is shown), at least 48 dp wide. Its accessibility value is `Income 2.000,00 €,
  expenses 1.700,00 €, saved 300,00 €, savings rate 15 percent` (spoken forms; `savings rate no
  income` when income is 0), or `No data`.
- A month with no data is drawn with the visible text `No data` instead of bars (never as zero).
- **Month detail** (one Text per line, under the chart), shown on tap:
  - `September`
  - `Income: 2.000,00 €`, `Expenses: 1.700,00 €`, `Saved: 300,00 €` (saved amount),
    `Savings rate: 15%` (rate, e.g. `Savings rate: -8%`, `Savings rate: No income`)
  - or, for a month with no data, `No data`
  - **View month** (role `button`, label `View month`), except on the selected month. It sets the
    selected month; Insights then shows that month in every section with no detail open (FR-030).
- Selection rules as the pace chart (FR-014): none on open, another month replaces, the same month
  hides.

## Interface strings (new in 002)

| Where | Text |
| --- | --- |
| Summary card | `Spending pace`; the FR-003 sentences |
| Month control hint | "Changes the month" |
| Month picker | `Choose month`, `Previous year`, `Next year`, `This month`, `Close`; short month names `Jan` … `Dec` |
| Insights | `Insights`, `Back`, `Spending pace`, `Categories vs last month`, `Savings trend`, `Try again`, `Couldn't load your data.` |
| Pace detail | `Day N`, `<Month>: <amount>`, `<signed amount> · <change percent>` |
| Categories | `<signed amount> vs last month`, `<signed amount> vs <Month>`, `Compared by day N`, `New`, `No spending to compare yet`, `No data from last month to compare`, `No data from <Month> to compare` |
| Trend | `Saved <saved amount> in N months · <rate>`, legend `Income`, `Expenses`, `Saved`, `No data`, `No data yet`, `Income: `, `Expenses: `, `Saved: `, `Savings rate: `, `View month` |
| Card hint | "Opens Insights" |

## Accessibility and large text (FR-022, FR-023)

- Every tappable element is at least 48 × 48 dp; the pace chart's touch area is the whole chart.
- At the largest font scale, sentences, rows, the headline and details wrap; nothing is cut or
  overlaps for FR-022's largest amounts. Component tests render each section at font scale 2 with
  values up to `999.999.999,99 €` (monthly totals and differences) and six-month totals up to `5.999.999.999,94 €`.
- The app follows light and dark mode (001 FR-030); lines and bars are told apart by line style or
  shape, not only color (FR-002).
- Chart motion follows "Remove animations" through 001's `useReduceMotion` (FR-024).
