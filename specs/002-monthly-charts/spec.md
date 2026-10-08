# Feature Specification: Monthly charts and insights

**Feature Branch**: `002-monthly-charts`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Monthly charts and insights that help the user save money, not just
see what is left. 1) On the existing monthly summary screen, below the current summary (Revolut
style), a compact 'spending pace' card: cumulative spending of the selected month day by day next
to the previous month's, plus a one-line comparison such as '€85 more than last month by day 12'.
Tapping the card opens a new Insights screen for the same month. 2) Insights screen, in priority
order (each one an independently testable user story): P1 Spending pace in full: current month vs
previous month cumulative spending by day; tapping a day shows both amounts for that day. P2
Categories vs last month: per expense category, this month's spend, last month's spend and the
change (+/- EUR), sorted by largest increase, so the user sees where to cut. (The 001 summary
already shows the per-category breakdown; the new value is the comparison.) P3 Six-month trend:
income, expenses and amount saved per month for the last six months, with the savings rate, so the
user sees whether they are improving. Tapping a bar, point or slice shows its detail (amount and
percentage) without leaving the screen. Read-only: no editing from charts. Money in integer cents,
EUR, English UI, on-device only. Out of scope: savings goals and budgets (feature 003), recurring
expenses (004)."

## User Scenarios & Testing *(mandatory)*

Terms used below:

- **Selected month**: the month shown on the summary (feature 001, FR-014 and FR-021).
- **Previous month**: the calendar month right before the selected month.
- **Spent by day N**: the sum of a month's expenses dated from its day 1 to its day N, inclusive.
  Income never counts as spending.
- **Comparison day**: only for the current calendar month: today's day of the month. The current
  month's spending by that day is compared with the previous month's spending by the same day, or
  through its last day when the previous month is shorter (for example 31 March against February
  compares with all of February). A past month is compared as a whole month against the whole
  previous month.
- **Saved**: a month's total income minus its total expenses, the same as the 001 balance
  (FR-015, FR-018); it can be negative.
- **Savings rate**: saved divided by total income for the same period, as a whole percent.
- **No data**: a month with no transactions at all (neither income nor expense). A month with
  transactions but no expenses has spending of 0, not "no data".

Amounts in this spec's examples use a neutral notation (`€85.00`, `+€60.00`, `-€30.00`); on screen
each amount, including where its `€` sign and its `+` or minus sign go, follows the phone's region
as in 001 (FR-029), for example `85,00 €` and `-30,00 €` in Spain. Quoted sentences are exact
except for that amount formatting.

### User Story 1 - See my spending pace against last month (Priority: P1)

On the summary, right below the month's totals, the user sees a compact **Spending pace** card: two
lines showing how spending built up day by day in the selected month and in the previous month, and
one sentence saying whether they are spending more or less than last month at the same point. If
they are ahead of last month mid-month, they can slow down before the month ends. Tapping the card
opens the **Insights** screen for the same month, where the pace chart is shown in full and the
user can tap any day to see both amounts for that day.

**Why this priority**: it is the only view that helps while the month is still running; the other
views explain the past. It also delivers the Insights screen and the way to reach it, which User
Stories 2 and 3 build on.

**Independent Test**: Record expenses on several days of the current and previous month, open the
summary and check the sentence and both lines against a hand calculation; tap the card, tap a day
and check both amounts for that day.

**Acceptance Scenarios**:

1. **Given** today is 12 October and the user spent 300.00 from 1 to 12 October and 215.00 from 1
   to 12 September, **When** they open the October summary, **Then** the card reads "€85.00 more
   than last month by day 12".
2. **Given** the same months but 150.00 spent from 1 to 12 October, **When** the user opens the
   summary, **Then** the card reads "€65.00 less than last month by day 12".
3. **Given** both months have spent the same amount by the comparison day, **When** the user opens
   the summary, **Then** the card reads "Same as last month by day 12".
4. **Given** the selected month is August (a past month) with 1,200.00 of expenses and July had
   1,000.00, **When** the user views the August summary, **Then** the card reads "€200.00 more
   than July" and both lines cover their whole month.
5. **Given** the selected month is the current month, **When** the user views the card, **Then**
   the selected month's line ends at today and the previous month's line covers its whole month.
6. **Given** the previous month has no data and the selected month (the current month) has
   expenses, **When** the user views the card, **Then** it shows only the selected month's line and
   the sentence "No data from last month to compare"; for a past month such as August the
   sentence is "No data from July to compare".
7. **Given** neither month has expenses (whether or not the previous month has data), **When** the
   user views the card, **Then** it reads "No spending to compare yet".
8. **Given** the summary for any month, **When** the user taps the card, **Then** the Insights
   screen opens for that same month.
9. **Given** the Insights screen for October (current month, today the 12th) with 120.00 spent
   from 1 to 8 October and 100.00 from 1 to 8 September, **When** the user taps "Day 8", **Then**
   it shows, without leaving the screen, "Day 8", "October: €120.00", "September: €100.00" and
   "+€20.00 · +20%".
10. **Given** the same screen with 450.00 spent from 1 to 20 September and no October expense
    dated after today, **When** the user taps "Day 20" (after today), **Then** it shows only "Day
    20" and "September: €450.00".
11. **Given** the user adds, edits or deletes a transaction, **When** they return to the summary
    or the Insights screen, **Then** the card and the chart reflect the change.

---

### User Story 2 - See which categories went up (Priority: P2)

On the Insights screen, below the pace chart, the user sees each expense category with this month's
spending, last month's spending and the change in euros and percent, the biggest increases first.
The categories that went up most are where cutting back would help.

**Why this priority**: it tells the user where to act, which the 001 per-category breakdown cannot
because it only shows one month.

**Independent Test**: Record expenses in four categories over two months (one up, one down, one
new, one gone), open Insights for the later month and check each row's amounts, change and order
against a hand calculation. Depends on the Insights screen from User Story 1.

**Acceptance Scenarios**:

1. **Given** Food went from 200.00 last month to 260.00 this month, **When** the user views the
   comparison, **Then** the Food row shows 260.00, 200.00, "+€60.00" and "+30%".
2. **Given** Transport went from 80.00 to 50.00, **When** the user views the comparison, **Then**
   the Transport row shows "-€30.00" and "-38%" (-37.5% rounded half away from zero).
3. **Given** Leisure had no expenses last month and 40.00 this month, **When** the user views the
   comparison, **Then** the Leisure row shows "+€40.00" and "New" instead of a percent.
4. **Given** Health had 25.00 last month and nothing this month, **When** the user views the
   comparison, **Then** the Health row shows 0.00 this month, "-€25.00" and "-100%".
5. **Given** rows with changes +60.00, +40.00, 0.00 and -30.00, **When** the user views the
   comparison, **Then** they appear in that order; rows with the same change are ordered
   alphabetically.
6. **Given** a category with no expenses in either month, **When** the user views the comparison,
   **Then** it is not listed.
7. **Given** the previous month has no data and the selected month (the current month) has
   expenses, **When** the user views the comparison, **Then** it shows this month's categories with
   their amounts, no changes, and the sentence "No data from last month to compare".
8. **Given** neither month has expenses, **When** the user views the comparison, **Then** it shows
   no rows and the sentence "No spending to compare yet".

---

### User Story 3 - See whether I am saving more over time (Priority: P3)

On the Insights screen, below the categories, the user sees the last six months ending with the
selected month: for each month, its income, its expenses and what was saved. A headline gives the
total saved over those months and the overall savings rate. Tapping a month shows its income,
expenses, saved amount and savings rate.

**Why this priority**: it shows the long-term picture (am I improving?), which matters less day to
day than the pace and the categories.

**Independent Test**: Record income and expenses across six months (including one month with more
expenses than income and one with no data), open Insights and check every month's values, the
headline and the tapped details against a hand calculation. Depends on the Insights screen from
User Story 1.

**Acceptance Scenarios**:

1. **Given** the selected month is October, **When** the user views the trend, **Then** it shows
   May to October in calendar order.
2. **Given** the six months had total income of 12,000.00 and total expenses of 10,200.00, **When**
   the user views the trend, **Then** the headline reads "Saved €1,800.00 in 6 months · 15%".
3. **Given** September had income 2,000.00 and expenses 1,700.00, **When** the user taps
   "September", **Then** it shows, without leaving the screen, "September", "Income: €2,000.00",
   "Expenses: €1,700.00", "Saved: €300.00" and "Savings rate: 15%".
4. **Given** August had income 2,000.00 and expenses 2,150.00, **When** the user taps "August",
   **Then** it shows "Saved: -€150.00" and "Savings rate: -8%" (-7.5% rounded half away from zero),
   and August's saved amount is drawn below zero.
5. **Given** July had expenses 400.00 and no income, **When** the user taps "July", **Then** it
   shows "Saved: -€400.00" and "Savings rate: No income".
6. **Given** a month in the range has no data, **When** the user views the trend, **Then** that
   month is marked "No data" rather than drawn as zero, and tapping it shows only its name and "No
   data".
7. **Given** the selected month is February 2000, **When** the user views the trend, **Then** it
   shows only January and February 2000, and the headline says "in 2 months"; with January 2000
   selected it says "in 1 month".

---

### Edge Cases

- The comparison day is past the previous month's last day (for example 30 or 31 March against
  February): the previous month is compared through its last day, and the sentence still names the
  selected month's day ("by day 30").
- The two months have different lengths: the pace chart spans day 1 to the last day of the longer
  month. A day the selected month does not reach (after today, or past its last day) shows only
  the previous month's amount; a day past the previous month's last day uses its whole month.
- A transaction dated after today in the current month (the phone's clock or time zone moved
  back; 001 keeps such transactions): it counts in the categories and the trend, as in the 001
  totals, and appears on the pace line on its own date, so the line extends to that date. The
  sentence still compares by today. Example: today is the 12th and a 30.00 expense is dated the
  15th; tapping "Day 14" shows the October amount by day 14 (which does not include the 30.00),
  and tapping "Day 16" shows only September's amount. A past month always uses its whole month,
  whatever its transactions' dates.
- The date changes while the app is open (past midnight, or a new month begins): the comparison
  day, the current month's line and the sentence update on the next view of the summary or Insights
  screen, as the 001 summary does for "today".
- The selected month is January 2000: the previous month can hold no data (dates before 2000 are
  not allowed), so the "No data from last month to compare" rules apply.
- Large amounts: a month can hold many transactions near the 999,999.99 maximum; totals,
  differences and percents stay exact to the cent and are not cut off at the largest text size
  (bounds in FR-022).
- Percents follow FR-017: 37.5% shows 38%, -37.5% shows -38%, and a non-zero value that rounds to
  0 shows "<1%" with its sign ("+<1%", "-<1%").
- Savings rate over the six-month headline when the six months have no income at all: the headline
  shows the total saved and "No income" instead of the percent.
- All six months have no data: the trend shows "No data yet" instead of the chart and no headline.
- The summary is loading or failed to load (001 FR-023, FR-024): the card follows the summary's
  state (loading or hidden behind the error), and never shows a sentence built from partial data.
- Stored data cannot be read on the Insights screen: it says the data could not be loaded and
  offers to try again; it never shows the month as empty.
- A transaction's date or type is edited so it moves to another month or stops being an expense:
  every view recalculates from the transactions as they are now.

## Requirements *(mandatory)*

### Functional Requirements

**Spending pace card (summary)**

- **FR-001**: Once the summary has loaded, it MUST show a **Spending pace** card right below the
  month's totals, for every month the summary can show, including months with no transactions.
- **FR-002**: The card MUST show two lines of cumulative daily spending: the selected month (up to
  today for the current month, or to a later-dated transaction's date as in Edge Cases; the whole
  month for a past month) and the previous month (whole month). The two lines MUST be told apart
  without relying on color alone.
- **FR-003**: The card MUST show one sentence, chosen by the first rule that applies:
  1. no expenses in either month: "No spending to compare yet";
  2. previous month has no data: "No data from last month to compare" for the current month, "No
     data from <previous month name> to compare" for a past month (only the selected month's line
     is drawn);
  3. current month, compared by the comparison day: "€X more than last month by day N", "€X less
     than last month by day N" or "Same as last month by day N";
  4. past month, compared as whole months: "€X more than <previous month name>", "€X less than
     <previous month name>" or "Same as <previous month name>".
  Here X is the absolute difference to the cent, formatted as in FR-021.
- **FR-004**: Tapping the card MUST open the Insights screen for the selected month.

**Insights screen**

- **FR-005**: The Insights screen MUST show, top to bottom, the full spending pace chart (FR-006),
  the categories comparison (FR-008) and the six-month trend (FR-011), with the month's name as
  its title and a way back to the summary.
- **FR-006**: The full pace chart MUST show the same two lines and sentence as the card (FR-002,
  FR-003) at a size where single days can be told apart. It spans day 1 to the last day of the
  longer of the two months, with day numbers marked, and each day is a tap target named "Day N".
- **FR-007**: Tapping a day on the pace chart MUST show, without leaving the screen:
  - "Day N";
  - "<selected month name>: €A", the selected month's spending by that day, unless the day is
    after the end of the selected month's line (FR-002: the later of today and its latest
    later-dated transaction for the current month) or past the month's last day;
  - "<previous month name>: €B", the previous month's spending by that day (its whole month when
    the day is past its last day), unless the previous month has no data;
  - when both amounts are shown, "<signed difference A - B> · <signed percent of B>", where the
    percent is "New" when B is 0 and A is above 0, and "0%" when both are 0.
- **FR-008**: The categories comparison MUST list every expense category with spending in the
  selected month or the previous month, each with: its name, this month's amount, last month's
  amount, the change in euros with a sign ("+" above 0, a minus below, none for 0) and the change
  as a percent of last month's amount ("New" when last month's amount is 0). When neither month has
  expenses, it shows no rows and "No spending to compare yet" (this rule wins over FR-010).
- **FR-009**: Category rows MUST be ordered by change in euros, largest increase first, ties
  ordered alphabetically by category name.
- **FR-010**: When the previous month has no data, the categories comparison MUST show this month's
  categories with their amounts only (ordered largest first, ties alphabetically), no change
  columns, and the same "No data from ... to compare" sentence as FR-003 rule 2.
- **FR-011**: The six-month trend MUST show the selected month and the five months before it, in
  calendar order, never before January 2000. For each month it shows income, expenses and saved; a
  negative saved amount is shown below zero with a minus sign. Months with no data are marked "No
  data". Each month is a tap target named by its month name (for example "September").
- **FR-012**: The trend MUST show a headline "Saved €X in N months · P%" ("1 month" when N is 1),
  where X is the total saved over the months shown (negative with a minus sign), N the number of
  months shown including months with no data, and P the overall savings rate (total saved / total
  income); "No income" replaces P when total income is 0. When every month shown has no data, the
  trend shows "No data yet" instead of the chart and the headline.
- **FR-013**: Tapping a month in the trend MUST show, without leaving the screen, its name and
  "Income: €I", "Expenses: €E", "Saved: €S" and "Savings rate: P%" ("Savings rate: No income" when
  its income is 0). For a month with no data it shows its name and "No data" only.
- **FR-014**: No detail is shown when a chart first appears. Each chart shows at most one detail
  (FR-007 or FR-013); tapping another day or month replaces it, and tapping the same one again
  hides it.
- **FR-015**: The Insights screen MUST be read-only: it MUST NOT offer adding, editing or deleting
  transactions.

**Calculations**

- **FR-016**: Spending by day, monthly totals, differences and saved amounts MUST be exact to the
  cent for any combination of valid transactions, using the same month rules as 001 (calendar
  month in the phone's local time, a transaction belongs to the month of its date, no balance
  carries over between months).
- **FR-017**: Every percent in this feature MUST be a whole percent rounded half away from zero; a
  non-zero value that rounds to 0 shows "<1%". Change percents (FR-007, FR-008) show "+" above 0
  and a minus below; savings rates show only a minus when negative; 0 shows "0%". "<1%" carries
  the same sign as its value ("+<1%", "-<1%").
- **FR-018**: Every view in this feature MUST reflect the stored transactions as they are when the
  view is shown, including adds, edits and deletes made since it was last shown.

**States**

- **FR-019**: While data loads, the card and each Insights section MUST show a loading state, never
  zeros or sentences that look like real results.
- **FR-020**: If stored data cannot be read, the Insights screen MUST say the data could not be
  loaded and offer to try again, and MUST NOT show the month as empty. On the summary, the card
  follows the summary's own error state (001 FR-024).

**Display, accessibility and privacy**

- **FR-021**: Amounts, numbers and dates MUST follow 001 FR-029 (phone's region format, `€` sign,
  English text and month names), and signed amounts use the same "+" and minus sign as the 001 day
  headers (001 FR-017). The app MUST follow the phone's light or dark setting (001 FR-030).
- **FR-022**: At the largest text size, no amount, percent, label or sentence in this feature may
  be cut off or overlap, for monthly totals and differences up to 999,999,999.99 and six-month
  totals up to 5,999,999,999.94.
- **FR-023**: With the screen reader on, the card MUST be announced as a button with its sentence;
  every value a chart shows MUST be reachable and announced without seeing the chart (each day's
  amounts on the pace chart, each category row, each trend month with its income, expenses, saved
  and savings rate), with negative values announced as "minus". Every tappable element MUST be at
  least the platform's recommended minimum touch size.
- **FR-024**: Chart motion MUST respect the phone's "Remove animations" setting, as the rest of the
  app does.
- **FR-025**: This feature MUST NOT send any data off the device or log any financial data, as in
  001 FR-027; it stores nothing new.

### Key Entities

All derived from the transactions of feature 001 when a view is shown; nothing new is stored.

- **Daily spending series**: for one month, the spending by day N for each day of the month (or up
  to today for the current month).
- **Pace comparison**: the selected month's and the previous month's spending by the comparison
  day, their difference, and whether the previous month has data.
- **Category change**: for one expense category, its spending in the selected and previous month,
  the change in euros and the change as a percent (or "New").
- **Monthly totals**: for one month, total income, total expenses, saved, savings rate, and whether
  it has data.
- **Trend**: the monthly totals of up to six months ending with the selected month, plus their
  total saved and overall savings rate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every sentence, daily amount, category change, percent, monthly total and headline in
  this feature matches a hand calculation to the cent for 100% of a reference set spanning at least
  seven months and 100 transactions, including month-length mismatches (31 vs 28/30 days), months
  with no data, negative savings and edits that move transactions between months.
- **SC-002**: On the 001 reference phone (Android 10 or later, 4 GB of RAM) with 1,000
  transactions in each of seven consecutive months, the Insights screen shows all three sections
  within 1 second of tapping the card, and the 001 cold-start target (SC-004: totals and 5 most
  recent transactions within 1 second) is still met with the card on the summary.
- **SC-003**: In a test with at least 3 people who have two months of sample data, each one answers
  "Are you spending more or less than last month so far, and which category went up the most?"
  correctly within 30 seconds of opening the app, without help.
- **SC-004**: On the reference phone at the largest text size, nothing in the card or the Insights
  screen is cut off; with the screen reader on, a user can hear the pace sentence, any day's
  amounts, every category row and every trend month.
- **SC-005**: During a full test session covering all user stories, the app makes zero network
  requests, as checked with a network monitor.

## Assumptions

- Single user per phone, Android only, English UI, EUR only, as in 001.
- "Spending" means expenses only. Income is used only for saved amounts and savings rates.
- The Insights screen shows the month it was opened for; changing months happens on the summary.
  Insights has no month navigation of its own in this feature.
- The categories comparison and the six-month trend do not depend on today: for the current month
  they use all of the month's stored transactions, like the 001 totals.
- Exact on-screen labels and screen-reader texts beyond the sentences quoted here are fixed in this
  feature's UI contract during planning.
- The pace compares by day of the month (day 12 with day 12), not by weekday.
- Out of scope: savings goals, budgets and "on track" forecasts (003), recurring expenses (004),
  choosing other comparison periods or ranges, per-category pace, filtering transactions from a
  chart, exporting or sharing charts, and home-screen widgets.
- The visual form of each chart (line, bars, colors, motion) is decided in this feature's
  `design.md`, approved from mockups, within these requirements.
