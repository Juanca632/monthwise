# Feature Specification: Record Transactions and Monthly Summary

**Feature Branch**: `001-monthly-summary`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "Record income and expenses and see the monthly summary."

## Clarifications

### Session 2026-10-05

- Q: Should 001 include a remote crash/error reporting service, or does no technical data leave
  the phone? → A: No remote reporting in 001; the developer inspects errors locally on a test
  device, and users only see the messages defined in FR-024 and FR-025. Remote reporting can be
  added later.
- Q: What accessibility level must 001 meet? → A: System large text without cut-off information,
  screen reader labels on every button and amount, and comfortable touch targets; no formal audit.
- Q: (from planning) Turning off cloud backup on Android 10–11 also blocks the system's
  phone-to-phone transfer. Should 001 allow that transfer at all? → A: No. In 001 app data stays
  out of both cloud backup and phone-to-phone transfer on every Android version; how data moves
  to a new phone is decided in 006.

### Session 2026-10-06 (developer's phone review)

- Q: A long month reads as one endless list. Should it be split by day? → A: Yes. The list is
  grouped by day, newest first; each day has a header ("Today", "Yesterday", or "Mon 5 Oct")
  with that day's net amount (income minus expenses) on the right, and its rows in their own
  card below.
- Q: On a phone whose region does not use the euro (for example `es-US`), amounts showed as
  `EUR 1,234.00`. Should the currency be the region's code or the `€` sign? → A: Always the `€`
  sign; the region still decides the separators and where the sign goes (`€1,234.00`,
  `1.234,00 €`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record a transaction and see the month's totals (Priority: P1)

The user opens the app and lands on the current month's summary. They tap **Add**, type an
amount, pick a category and save. The new transaction appears in the month's list, and the
month's total income, total expenses and balance update straight away. Recording an expense takes
only a few seconds.

**Why this priority**: This is the core loop of the app. Without fast recording and up-to-date
totals there is nothing else to show; with only this story the user can already track a month.

**Independent Test**: Start with no data, record two expenses and one income in the current month,
and check that the list shows all three and that income, expenses and balance match a hand
calculation to the cent.

**Acceptance Scenarios**:

1. **Given** the app has no transactions, **When** the user opens it, **Then** they see the
   current month with total income, total expenses and balance all at zero, a short line saying
   there are no transactions yet, and the **Add** button.
2. **Given** the user is on the current month, **When** they tap **Add**, **Then** a form opens
   with type set to Expense, the amount field focused with a numeric keyboard shown, date set to
   today and no category
   selected.
3. **Given** the form is open, **When** the user enters 12.50, picks Food and saves, **Then** the
   form closes, the transaction appears at the top of the month's list and total expenses grow by
   12.50.
4. **Given** the form is open, **When** the user switches the type to Income, **Then** only income
   categories are offered.
5. **Given** the month has 2,000.00 of income and 2,150.00 of expenses, **When** the user views the
   summary, **Then** the balance shows -150.00 with a minus sign and the negative color.
6. **Given** the user saved transactions and closed the app, **When** they reopen it (also after a
   phone restart), **Then** all transactions and totals are still there.
7. **Given** the month's data is still loading, **When** the user looks at the summary, **Then**
   they see a loading state (not zeros), and **Add** is available.
8. **Given** stored data cannot be read, **When** the summary is shown, **Then** the user sees a
   message that the data could not be loaded and a way to try again, and the month is not shown
   as empty.

---

### User Story 2 - See where the money went (Priority: P2)

On the same summary the user sees how the month's expenses split across categories: the amount
and the share of total expenses for each category, largest first.

**Why this priority**: "Where does my money go" is one of the three questions the app exists to
answer, but it builds on recorded transactions from Story 1.

**Independent Test**: Record expenses in three categories in one month and check that each
category shows the right amount and percentage, ordered from largest to smallest.

**Acceptance Scenarios**:

1. **Given** the month has expenses of 300.00 Housing, 150.00 Food and 50.00 Transport, **When**
   the user views the summary, **Then** the breakdown shows Housing 300.00 (60%), Food 150.00
   (30%), Transport 50.00 (10%), in that order.
2. **Given** the month has income but no expenses, **When** the user views the summary, **Then**
   the breakdown shows a short line saying there are no expenses this month instead of an empty
   area.
3. **Given** a category has no expenses this month, **When** the user views the breakdown,
   **Then** that category is not listed.

---

### User Story 3 - Fix or remove a transaction (Priority: P2)

The user taps a transaction in the list to correct a mistake (wrong amount, category, date, type
or note) or to delete it.

**Why this priority**: Mistakes happen when recording fast; without a way to fix them the totals
become wrong and the user loses trust in the numbers.

**Independent Test**: Record a transaction, edit its amount and category, check that totals and
breakdown update; then delete it and check that it disappears and totals return to their previous
values.

**Acceptance Scenarios**:

1. **Given** a saved transaction, **When** the user taps it, **Then** a form opens with its current
   values and options to save changes or delete it.
2. **Given** the user changes the amount from 12.50 to 21.50 and saves, **When** they return to the
   summary, **Then** the list, totals and breakdown reflect 21.50.
3. **Given** the user is editing an expense, **When** they switch the type to Income, **Then** the
   category is cleared and they must pick an income category before saving.
4. **Given** the user changes the date of a transaction to a day in the previous month, **When**
   they save, **Then** the current month's list, totals and breakdown no longer include it (the app
   then shows the previous month, as described in User Story 4).
5. **Given** the user taps delete, **When** the confirmation "Delete this transaction?" appears and
   they confirm, **Then** the transaction is removed and totals update; **When** they cancel
   instead, **Then** nothing changes.

---

### User Story 4 - Work with previous months (Priority: P3)

From the current month the user moves back to earlier months, sees each month's own summary and
transactions, adds a transaction they forgot in a past month, and returns to the current month.

**Why this priority**: Useful for reviewing and catching up on forgotten entries, but the app
delivers value with the current month alone.

**Independent Test**: Record transactions dated in two different past months and check that each
month shows only its own transactions and totals; then add one from a past month and check it
lands in that month.

**Acceptance Scenarios**:

1. **Given** the user is on the current month, **When** they move to the previous month, **Then**
   they see that month's name and year, its totals, breakdown and transactions only.
2. **Given** the user is on the current month, **When** they look for a way to move forward,
   **Then** none is offered; likewise, on January 2000 no way to move back is offered.
3. **Given** the user is on a past month with no transactions, **When** they view it, **Then**
   totals show zero and a short line says there are no transactions for that month.
4. **Given** the user is on a past month, **When** they return forward, **Then** they can reach the
   current month again.
5. **Given** a past month ended with a positive balance, **When** the user views the following
   month, **Then** that month's balance does not include it.
6. **Given** the user is viewing September 2026, **When** they tap **Add**, **Then** the form's
   date defaults to 30 September 2026, and after saving the app shows September 2026 with the new
   transaction in it.
7. **Given** the user edits a transaction and moves its date to another month, **When** they save,
   **Then** the app shows the month of the new date, with the transaction in it.

---

### Edge Cases

- Amount of 0, negative, empty, with more than 2 decimals or above 999,999.99: saving is blocked
  and the form explains what to fix; nothing typed is lost.
- Amount typed with either separator: in any region, `12,50` and `12.50` both mean twelve euros
  fifty. An amount with more than one separator (for example `1.250,00`) is blocked with a message
  asking for the amount without thousands separators; it is never guessed. An amount with three
  digits after the separator (for example `1.250`) is blocked with the same hint. `.5` is accepted
  as 0.50 and `12.` as 12.00.
- No category picked: saving is blocked and the form points to the category field.
- Date in the future or before 1 January 2000: it cannot be chosen.
- Note longer than 100 visible characters: input stops at 100 (an emoji counts as one); pasted
  text is cut at 100.
- Leaving a form that has unsaved changes: the app asks "Discard changes?"; confirming discards
  them, cancelling returns to the form. Leaving a form with no changes closes it without asking.
- Several transactions on the same day: the most recently recorded one is listed first.
- Two categories with the same expense total: they are ordered alphabetically.
- Percentages that do not add up to exactly 100%: accepted, because each one is rounded on its
  own as defined in FR-016.
- Midnight passes while the app is in use: "today" (the form's default and latest allowed date)
  is worked out again each time a form or the date picker opens and each time the app returns to
  the foreground. If the summary on screen was the current month, it moves to the new month when
  the app returns to the foreground; a past month on screen stays.
- A transaction cannot be saved or deleted (for example, the phone's storage is full): the user
  sees an error saying the action did not happen, and the form keeps what they typed.
- A stored transaction dated after "today" (the phone's clock or time zone moved back): it keeps
  its date and is shown normally. Saving any edit to it requires a valid date; the form flags the
  date field as the one to fix.
- Largest system text size or screen reader on: every screen stays complete and readable, and
  everything is announced as defined in FR-031.
- The phone's region or light/dark setting changes: amounts, dates and colors follow the new
  setting without losing data.

## Requirements *(mandatory)*

### Functional Requirements

**Recording**

- **FR-001**: Users MUST be able to record a transaction with: type (income or expense), amount in
  EUR, date, category and an optional note.
- **FR-002**: The **Add** action MUST be visible on the summary at all times, including while data
  loads and when loading fails.
- **FR-003**: A new transaction form MUST open with type Expense, the amount field ready for
  input (focused, numeric keyboard shown) and no category selected. The date defaults to today
  when the current month is on screen,
  and to the last day of the month on screen when a past month is shown.
- **FR-004**: Amounts MUST be greater than 0, have at most 2 decimals and be at most 999,999.99.
- **FR-005**: Amounts MUST accept either `,` or `.` as the decimal separator, regardless of
  region; input with more than one separator MUST be rejected with a message, never interpreted.
  Inside the form, an amount is always shown with the region's decimal separator (`,` or `.`; a
  region that uses any other separator gets `.`) and no thousands separator or currency symbol
  (for example `1250,00`), so an existing amount can be saved as is.
- **FR-006**: The date MUST be between 1 January 2000 and today, inclusive; other dates MUST NOT
  be selectable.
- **FR-007**: The note MUST be optional and at most 100 visible characters.
- **FR-008**: The category MUST be required and chosen from the fixed list for the selected type:
  - Expense: Food, Transport, Housing, Bills, Health, Shopping, Leisure, Other.
  - Income: Salary, Freelance, Gifts, Other.
- **FR-009**: Save is always enabled. Tapping it with invalid input MUST show what to fix next to
  each invalid field and move focus to the first one, keeping everything the user typed.
- **FR-010**: Leaving a form with unsaved changes (any field differs from the values the form
  opened with) MUST ask "Discard changes?" first; otherwise it MUST NOT ask.

**Editing and deleting**

- **FR-011**: Users MUST be able to open any transaction from the list to edit any of its fields.
- **FR-012**: Changing the type in a form (new or edit) MUST clear the category and require a new
  one from the new type's list.
- **FR-013**: Users MUST be able to delete a transaction after confirming "Delete this
  transaction?"; deletion cannot be undone.

**Monthly summary**

- **FR-014**: The app MUST open on the current calendar month's summary.
- **FR-015**: For the selected month, the summary MUST show total income, total expenses and
  balance (income minus expenses), each to the cent; a negative balance MUST show a minus sign and
  a distinct color (never color alone).
- **FR-016**: The summary MUST show expenses per category for the selected month, with the amount
  and the share of total expenses as a whole percent (rounded half up, so 12.5% shows 13%; a
  non-zero share below 0.5% shows "<1%"), largest first, ties ordered alphabetically; categories
  with no expenses are omitted.
- **FR-017**: The summary MUST list the selected month's transactions, newest date first; on the
  same date, the most recently recorded first. The list is grouped by day: each day starts with a
  header naming the day ("Today", "Yesterday", or the English short weekday, day and month, for
  example "Mon 5 Oct", no year) and showing that day's net amount (its income minus its
  expenses): `+` above zero, minus below, no sign at zero. "Today" and "Yesterday" are relative
  to the actual date, whatever month is on screen. Each
  item shows at least amount, type, category and note (if any); its date is its day's header.
- **FR-018**: Each month MUST be calculated on its own; no balance carries over between months.
- **FR-019**: Every change (add, edit, delete) MUST be reflected in the list, totals and breakdown
  as soon as the user returns to the summary.
- **FR-020**: After saving a new or edited transaction, the summary MUST show the month of that
  transaction's date.

**Navigation**

- **FR-021**: Users MUST be able to move back month by month to any month from January 2000 and
  forward again up to the current month; moving past the current month MUST NOT be possible.

**Empty, loading and error states**

- **FR-022**: When there is nothing to show (no transactions at all, a month with none, or a month
  with no expenses), the app MUST show a short line saying what is missing plus the **Add**
  action; any total with no data behind it MUST show zero rather than being hidden.
- **FR-023**: While a month's data is loading, the summary MUST show a loading state instead of
  totals and list; it MUST NOT show zeros that look like an empty month. When the month already
  on screen is refreshed (for example after closing a form), its previous data MAY stay visible
  until the new data arrives, instead of the loading state.
- **FR-024**: If stored data cannot be read, the app MUST say the data could not be loaded and
  offer to try again; it MUST NOT show the month as empty.
- **FR-025**: If adding, editing or deleting a transaction fails, the app MUST tell the user the
  action did not happen, leave the stored transaction exactly as it was, and keep the form's
  content. If a transaction cannot be opened for editing, the app MUST say so and stay on the
  summary.

**Data and display**

- **FR-026**: All data MUST be stored only on the phone and persist across app restarts and phone
  restarts; no account or login is required.
- **FR-027**: No financial data (amounts, notes, categories) may leave the device or appear in
  logs, analytics or error reports. App data MUST NOT be included in any cloud backup or in the
  system's direct phone-to-phone transfer, on every supported Android version. The app itself
  makes no network requests: no remote crash or error reporting and no analytics.
- **FR-028**: Money MUST be calculated exactly to the cent; totals MUST stay exact for any
  combination of valid transactions and never show rounding errors.
- **FR-029**: Amounts and numeric dates MUST be displayed using the phone's region settings
  (decimal and thousands separators, € position, day/month order). The currency is always EUR
  and always shown as the `€` sign, never as the code `EUR`. Dates in the form are numeric in
  the region's order (for example `30/09/2026` in Spain). All interface text, including the month
  names in the month header and the list's day headers, is in English.
- **FR-030**: The app MUST follow the phone's light or dark appearance setting.
- **FR-031**: The app MUST stay usable with the phone's largest text size setting: no amount,
  total or label is cut off or overlapping, even for the maximum amount 999,999.99. The screen
  reader MUST announce every button, field, amount, breakdown row, the month header and each list
  day header (its day in English words and its net, "minus" when negative); a
  transaction is announced with its type, category, amount, full date and note (if any), amounts
  in the region's format, and a negative balance is announced in words ("minus"). Every tappable
  element MUST be at least the platform's recommended minimum touch size.
- **FR-032**: After a transaction is saved or deleted successfully, the app MUST briefly confirm
  it on the summary ("Saved" or "Deleted") without needing any action and without covering the
  month controls, and the screen reader MUST announce it once. No confirmation appears after a
  failure.

### Key Entities

- **Transaction**: one money movement recorded by the user. Attributes: type (income or expense),
  amount in EUR (exact to the cent), date (a calendar day between 1 January 2000 and today),
  category, optional note (up to 100 visible characters), its recording order (used to order
  same-day items, latest recorded first, even if the phone's clock moves back) and the moment it
  was first recorded; editing changes neither.
- **Category**: a fixed label that belongs to exactly one type; it is identified by its type plus
  its label, so expense "Other" and income "Other" are different categories. Not created, renamed
  or deleted by the user in this feature.
- **Monthly summary**: not stored; derived for one calendar month from that month's transactions:
  total income, total expenses, balance, expenses per category with share, and the transaction
  list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the main screen, a user can record an expense in under 10 seconds and with 4
  interactions: open the form, type the amount (counts as one), pick a category, save.
- **SC-002**: Totals, balance and per-category amounts match a hand calculation to the cent for
  100% of a reference set of at least 50 transactions, including edits and deletions.
- **SC-003**: 100% of saved transactions are still present after closing the app and after
  restarting the phone.
- **SC-004**: On a phone with Android 10 or later and 4 GB of RAM, opening the app from a cold
  start shows the current month's totals and first list items within 1 second, with 1,000
  transactions in that month (grouped by day, FR-017).
- **SC-005**: During a full test session covering all user stories, the app makes zero network
  requests, as checked with a network monitor.
- **SC-006**: In a first-use test with at least 3 people, every participant records their first
  expense without help or instructions.
- **SC-007**: On the SC-004 reference phone with a screen at least 360 dp wide, default display
  size and its Android version's largest text size, every screen and dialog of this feature
  (summary, breakdown, list, month navigation, add/edit form, delete and discard confirmations)
  shows no cut-off information; with the screen reader on, a user can record an expense and hear
  the month's totals, and every interactive element and amount is announced.

## Assumptions

- Single user per phone; the app is personal and has no sharing or multiple profiles.
- Android is the only platform for this feature, per the constitution.
- "Month" means the calendar month in the phone's local time; a transaction belongs to the month
  of its date, not the moment it was recorded.
- Data is lost if the app is uninstalled, the phone is lost or the user moves to a new phone,
  because nothing leaves the phone (FR-027), not even through the system's phone-to-phone
  transfer. This is accepted until feature 006 (Backup and restore), which decides how backup and
  moving data to a new phone work.
- Fixed monthly payments (rent, subscriptions) are recorded by hand each month in this feature;
  automating them is feature 004.
- Out of scope: login and sync, charts (002), savings goal (003), recurring expenses (004), bank
  notification detection (005), backup (006), more languages (007), other currencies, search and
  filters, data export, editable categories, undo after delete, remote crash/error reporting and
  analytics.
- No onboarding or tutorial; the empty states guide the first use.
- Amounts in this spec's examples use a neutral notation (`12.50`); on screen they follow the
  phone's region (for example `12,50 €` in Spain).
- The interface is English only; supporting more languages is feature 007. The region-based
  number and date format already applies in this feature.
