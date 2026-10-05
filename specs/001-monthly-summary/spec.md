# Feature Specification: Record Transactions and Monthly Summary

**Feature Branch**: `001-monthly-summary`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "Feature 001: record income and expenses and see the monthly summary. The full, already-agreed product decisions are in specs/001-monthly-summary/decisions.md (section "Decisions", D1–D15); the spec must follow them exactly and not reopen them."

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
2. **Given** the user is on the main screen, **When** they tap **Add**, **Then** a form opens with
   type set to Expense, the amount field ready for typing, date set to today and no category
   selected.
3. **Given** the form is open, **When** the user enters 12.50, picks Food and saves, **Then** the
   form closes, the transaction appears at the top of the month's list and total expenses grow by
   12.50.
4. **Given** the form is open, **When** the user switches the type to Income, **Then** only income
   categories are offered.
5. **Given** the month has 2,000.00 of income and 2,150.00 of expenses, **When** the user views the
   summary, **Then** the balance shows -150.00, clearly marked as negative.
6. **Given** the user saved transactions and closed the app, **When** they reopen it (also after a
   phone restart), **Then** all transactions and totals are still there.

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
   they save, **Then** it leaves the current month's list and totals and appears in the previous
   month.
5. **Given** the user taps delete, **When** the confirmation "Delete this transaction?" appears and
   they confirm, **Then** the transaction is removed and totals update; **When** they cancel
   instead, **Then** nothing changes.

---

### User Story 4 - Look back at previous months (Priority: P3)

From the current month the user moves back to earlier months and sees each month's own summary
and transactions, then returns to the current month.

**Why this priority**: Useful for comparing and reviewing, but the app delivers value with the
current month alone.

**Independent Test**: Record transactions dated in two different past months and check that each
month shows only its own transactions and totals.

**Acceptance Scenarios**:

1. **Given** the user is on the current month, **When** they move to the previous month, **Then**
   they see that month's name and year, its totals, breakdown and transactions only.
2. **Given** the user is on the current month, **When** they look for a way to move forward,
   **Then** none is offered.
3. **Given** the user is on a past month with no transactions, **When** they view it, **Then**
   totals show zero and a short line says there are no transactions for that month.
4. **Given** the user is on a past month, **When** they return forward, **Then** they can reach the
   current month again.
5. **Given** a past month ended with a positive balance, **When** the user views the following
   month, **Then** that month's balance does not include it.

---

### Edge Cases

- Amount of 0, negative, empty, with more than 2 decimals or above 999,999.99: saving is blocked
  and the form explains what to fix; nothing typed is lost.
- No category picked: saving is blocked and the form points to the category field.
- Date in the future: it cannot be chosen.
- Note longer than 100 characters: input stops at 100 characters.
- Leaving the form without saving: nothing is saved and existing transactions stay unchanged.
- Several transactions on the same day: the most recently recorded one is listed first.
- Two categories with the same expense total: they are ordered alphabetically.
- Percentages that do not add up to exactly 100% because of rounding: accepted; each is rounded
  to the nearest whole percent.
- The app stays open past midnight on the last day of a month: the "current month" moves to the
  new month the next time the summary is shown.
- A transaction cannot be saved (for example, the phone's storage is full): the user sees an error
  saying it was not saved, and the form keeps what they typed.
- The phone's region or light/dark setting changes: amounts, dates and colors follow the new
  setting without losing data.

## Requirements *(mandatory)*

### Functional Requirements

**Recording**

- **FR-001**: Users MUST be able to record a transaction with: type (income or expense), amount in
  EUR, date, category and an optional note.
- **FR-002**: The **Add** action MUST be visible on the main screen at all times.
- **FR-003**: A new transaction form MUST open with type Expense, the amount field ready for
  input, date set to today and no category selected.
- **FR-004**: Amounts MUST be greater than 0, have at most 2 decimals and be at most 999,999.99.
- **FR-005**: The date MUST be today or any past day; future dates MUST NOT be selectable.
- **FR-006**: The note MUST be optional and at most 100 characters.
- **FR-007**: The category MUST be required and chosen from the fixed list for the selected type:
  - Expense: Food, Transport, Housing, Bills, Health, Shopping, Leisure, Other.
  - Income: Salary, Freelance, Gifts, Other.
- **FR-008**: Invalid input MUST block saving and show what to fix next to the field, keeping
  everything the user typed.

**Editing and deleting**

- **FR-009**: Users MUST be able to open any transaction from the list to edit any of its fields.
- **FR-010**: Changing the type while editing MUST clear the category and require a new one from
  the new type's list.
- **FR-011**: Users MUST be able to delete a transaction after confirming "Delete this
  transaction?"; deletion cannot be undone.

**Monthly summary**

- **FR-012**: The app MUST open on the current calendar month's summary.
- **FR-013**: For the selected month, the summary MUST show total income, total expenses and
  balance (income minus expenses), each to the cent; a negative balance MUST be clearly marked.
- **FR-014**: The summary MUST show expenses per category for the selected month, with the amount
  and the share of total expenses (whole percent), largest first, ties ordered alphabetically;
  categories with no expenses are omitted.
- **FR-015**: The summary MUST list the selected month's transactions, newest date first; on the
  same date, the most recently recorded first. Each item shows at least amount, type, category,
  date and note (if any).
- **FR-016**: Each month MUST be calculated on its own; no balance carries over between months.
- **FR-017**: Every change (add, edit, delete) MUST be reflected in the list, totals and breakdown
  as soon as the user returns to the summary.

**Navigation**

- **FR-018**: Users MUST be able to move to any previous month without limit and back to the
  current month; moving past the current month MUST NOT be possible.

**Empty and error states**

- **FR-019**: When there is nothing to show (no transactions at all, a month with none, or a month
  with no expenses), the app MUST show a short line saying what is missing plus the **Add**
  action; totals MUST show zero rather than being hidden.
- **FR-020**: If a transaction cannot be saved, the app MUST tell the user it was not saved and
  keep the form's content.

**Data and display**

- **FR-021**: All data MUST be stored only on the phone and persist across app restarts and phone
  restarts; no account or login is required.
- **FR-022**: No financial data (amounts, notes, categories) may leave the device or appear in
  logs, analytics or error reports.
- **FR-023**: Money MUST be calculated exactly to the cent; totals MUST never show rounding errors.
- **FR-024**: Amounts and dates MUST be displayed using the phone's region settings, while all
  interface text is in English; the currency is always EUR.
- **FR-025**: The app MUST follow the phone's light or dark appearance setting.

### Key Entities

- **Transaction**: one money movement recorded by the user. Attributes: type (income or expense),
  amount in EUR (exact to the cent), date (a calendar day, not in the future), category, optional
  note (up to 100 characters), and the moment it was recorded (used to order same-day items).
- **Category**: a fixed label that belongs to exactly one type (income or expense). Not created,
  renamed or deleted by the user in this feature.
- **Monthly summary**: not stored; derived for one calendar month from that month's transactions:
  total income, total expenses, balance, expenses per category with share, and the transaction
  list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the main screen, a user can record an expense in under 10 seconds and with no
  more than 5 interactions (open form, type amount, pick category, save).
- **SC-002**: Totals, balance and per-category amounts match a hand calculation to the cent for
  100% of a reference set of at least 50 transactions, including edits and deletions.
- **SC-003**: 100% of saved transactions are still present after closing the app and after
  restarting the phone.
- **SC-004**: The current month's summary is visible within 1 second of opening the app with
  1,000 transactions in that month.
- **SC-005**: Zero financial data is sent off the device during normal use.
- **SC-006**: In a first-use test, at least 9 out of 10 people record their first expense without
  help or instructions.

## Assumptions

- Single user per phone; the app is personal and has no sharing or multiple profiles (D1).
- Android is the only platform for this feature, per the constitution.
- "Month" means the calendar month in the phone's local time; a transaction belongs to the month
  of its date, not the moment it was recorded.
- Data lives until the app is uninstalled or the phone is lost; protecting against that is
  feature 006 (Backup and restore) and is accepted as a known risk until then.
- Fixed monthly payments (rent, subscriptions) are recorded by hand each month in this feature;
  automating them is feature 004.
- Out of scope: login and sync, charts (002), savings goal (003), recurring expenses (004), bank
  notification detection (005), backup (006), other currencies, search and filters, data export,
  editable categories, undo after delete.
- No onboarding or tutorial; the empty states guide the first use (D11).
