# Contract: Screens and Routes

What each screen shows and accepts. Routes follow Expo Router's file-based routing in
`src/app/` (research R6). All text is English (FR-029). Amounts and numeric dates use the
phone's region (research R7).

## Routes

| Route                | File                               | Presentation  | Purpose                      |
| -------------------- | ---------------------------------- | ------------- | ---------------------------- |
| `/`                  | `src/app/index.tsx`                | Main screen   | Monthly summary (US1, US2, US4) |
| `/transaction/new`   | `src/app/transaction/new.tsx`      | Modal         | Add form (US1)               |
| `/transaction/[id]`  | `src/app/transaction/[id].tsx`     | Modal         | Edit or delete form (US3)    |

The month on screen is shared state (`SelectedMonthContext`), not a route parameter. It starts at
the current month (FR-014). The forms set it after a successful save (FR-020).

## Summary screen (`/`)

Layout from top to bottom: month header with previous/next controls, totals (income, expenses,
balance), expense breakdown, transaction list. **Add** is a floating button that is always
visible (FR-002), including while the database opens. The list has bottom padding at least as
tall as the button plus its margin, so the last row is never covered (FR-031). A Save tapped while the database is
still opening waits in the saving state until it is open, at most 10 s; after that it counts as a failed open. Only if opening failed does the form
show the FR-025 save error.

| State   | When                         | Shows                                                         | Spec            |
| ------- | ---------------------------- | ------------------------------------------------------------- | --------------- |
| loading | Database opening or migrating, or month query in progress | Header + loading indicator instead of totals and list; **Add**| FR-023          |
| error   | Database failed to open or migrate, or the query threw `StorageError`; **Try again** reopens the database if it is not open, then reloads the month | Header + "Couldn't load your data." + **Try again**; **Add**  | FR-024          |
| empty   | Month has no transactions    | Totals at 0 + "No transactions this month yet." + **Add**. The breakdown section and its "No expenses" line are not shown. | FR-022 |
| ready   | Month has transactions       | Totals, breakdown (or "No expenses this month."), list        | FR-015 to FR-017|

- Previous is hidden on January 2000; next is hidden on the current month (FR-021). Month
  navigation works in every state, including loading and error. `useMonthSummary` discards any
  result for a month that is no longer selected, so a slow reply never fills another month's
  screen. A component test covers two overlapping queries.
- The screen reloads its month every time it gets focus (FR-019). The **loading** state appears
  only when there is no data for the month on screen yet: on first load, after a month change, or
  after a retry. A reload of the same month, for example after closing a form, keeps the current
  data on screen and swaps it when the new data arrives. If that reload fails, the screen shows
  the error state.
- When the app returns to the foreground after midnight on a new month, a summary showing the
  old current month moves to the new one; a past month stays (spec edge case).
- Negative balance: a minus sign plus the negative color; the screen reader says "minus"
  (FR-015, FR-031).
- List item: type, category label, amount, numeric date, note if any. Spoken as
  "Expense, Food, 12,50 €, 30 September 2026, note: lunch" (FR-031).
- Tapping an item opens `/transaction/[id]`, which loads the stored row (see Edit form states).
  If loading fails, the modal closes and the summary shows "Couldn't open this transaction." in
  an inline banner above the list with a **Dismiss** button. The banner stays until it is
  dismissed, the month changes or another transaction opens. It is announced once with
  `AccessibilityInfo.announceForAccessibility`. The user ends up on the summary they came from
  (FR-025).

## Transaction form (`/transaction/new`, `/transaction/[id]`)

One shared `TransactionForm` component.

### Layout with the keyboard open (SC-001)

- With the numeric keyboard open and default text size, the amount field, the category chips and
  **Save** stay visible above the keyboard. The form scrolls if they do not fit, for example at
  large text sizes.
- The form's scroll container uses `keyboardShouldPersistTaps="handled"`, so the first tap on a
  chip or on **Save** acts right away and does not just close the keyboard.
- A component test records an expense with the keyboard open in 4 interactions: open, type, chip,
  Save.

### Form states

| State   | Form | When                                            | Shows                                               |
| ------- | ---- | ----------------------------------------------- | --------------------------------------------------- |
| ready   | New  | Always (nothing to load)                        | Fields with defaults below                          |
| loading | Edit | `getById` in progress                           | Title + loading indicator; no fields, no Save/Delete; closing is allowed with no prompt |
| ready   | Edit | Row loaded                                      | Fields with the stored values                       |
| error   | Edit | `getById` threw or returned `null`              | Closes the modal; the summary shows "Couldn't open this transaction." (FR-025) |
| saving  | Both | Save or delete in progress (milliseconds)       | Fields kept. Save stays enabled (FR-009), but taps during an operation already in progress are ignored, so nothing is inserted twice. Back/close waits until the operation finishes. |

The form has no empty state: a form always has fields to fill. "Today" (the default date and the
latest allowed date) is computed when the form opens and again when the user taps Save.

| Field    | New                                       | Edit           | Control                         |
| -------- | ----------------------------------------- | -------------- | ------------------------------- |
| Type     | Expense                                   | Stored value   | Two-option toggle               |
| Amount   | Empty, focused, numeric keyboard          | Stored, region decimal separator, no thousands separator | Text input (`decimal-pad`) |
| Date     | Today, or last day of the month on screen (FR-003) | Stored | Native date dialog (2000-01-01..today). A stored date after today opens the dialog on today, and the field is flagged as the one to fix |
| Category | None selected                             | Stored value   | Chips for the selected type     |
| Note     | Empty                                     | Stored value   | Text input; `onChangeText` cuts typed or pasted text to 100 graphemes with `countGraphemes` (no `maxLength`, which counts UTF-16 units) |

Actions:

- **Save** is always enabled (FR-009). On invalid input it shows a message next to each invalid
  field, moves focus to the first one and keeps the input. On success it sets the selected month
  to the transaction's month and closes.
- **Delete** (edit only) asks "Delete this transaction?" with **Delete** and **Cancel** (FR-013).
- After a successful save or delete, the summary shows a short confirmation toast, "Saved" or
  "Deleted", for about 1.8 s, above the **Add** button (FR-032). It is announced once with
  `announceForAccessibility`, is not focusable, ignores touches and needs no action. It confirms
  the result; the list and totals already show it. No toast shows after a failure, nor when
  `remove` throws `NotFoundError` (the row was already gone; the summary just reloads).
- Changing **Type** clears the category (FR-012).
- Leaving with unsaved changes (back button, swipe, close) asks "Discard changes?" with
  **Discard** and **Keep editing** (FR-010).
- If saving or deleting fails: "Couldn't save. Your changes are still here." or "Couldn't
  delete." The form keeps its content (FR-025).
- If `update` throws `NotFoundError` (the row no longer exists), the form stays open with its
  content and shows "This transaction no longer exists." (FR-025). If `remove` throws it, the
  goal is already met: the form closes and the summary reloads.

Focus on the first invalid field (FR-009): amount and note call `TextInput.focus()`. Date and
category scroll into view and move screen reader focus to the field's label with
`AccessibilityInfo.setAccessibilityFocus`.

Validation messages:

| Case                          | Message                                               |
| ----------------------------- | ----------------------------------------------------- |
| Amount empty                  | Enter an amount.                                      |
| Amount 0                      | Amount must be greater than 0.                        |
| Over maximum                  | Maximum is 999999,99. (shown the way the form shows amounts: region decimal separator, no grouping) |
| More than one separator or more than 2 decimals | Use up to 2 decimals and no thousands separators. |
| Not a number / negative       | Enter a valid amount.                                 |
| No category                   | Pick a category.                                      |
| Date after today (stored date)| Pick a date up to today.                              |

## Interface strings

| Where | Text |
| --- | --- |
| Summary buttons | **Add**, **Try again**, **Dismiss** |
| Summary labels | "Balance", "Income", "Expenses", "Spending by category", "Transactions" |
| Empty month helper line | "Tap Add to record an income or expense." (under "No transactions this month yet.") |
| Form titles | "Add transaction", "Edit transaction" |
| Form labels | "Type" (**Expense** / **Income**), "Amount", "Date", "Category", "Note (optional)" |
| Form buttons | **Save**, **Delete** |
| Delete dialog | "Delete this transaction?" with **Delete** and **Cancel** |
| Confirmation toast | "Saved", "Deleted" |
| Discard dialog | "Discard changes?" with **Discard** and **Keep editing** |
| Category labels | As in data-model.md |

## Accessibility (FR-031, SC-007)

- Every tappable element has `accessibilityRole`, `accessibilityLabel` and a touch area of at
  least 48 × 48 dp.
- Text that is not tappable also has a label when its visible text alone would be unclear.
  Example announcements on a Spanish-region phone (exact separators come from `Intl`; Spanish
  usually does not group 4-digit numbers, so this is checked on the device before tests use it):
  - Month header: "October 2026"; previous button: "Previous month, September 2026".
  - Totals: "Income, 2000,00 €", "Expenses, 2150,00 €", "Balance, minus 150,00 €".
  - Breakdown row: "Food, 150,00 €, 30 percent"; under 0.5 %: "Bills, 1,00 €, less than 1
    percent".
  - List item: "Expense, Food, 12,50 €, 30 September 2026, note: lunch".
  - Form fields: label + current value + error message if any ("Amount, required, Enter an
    amount.").
- Text scales with the system font size; layouts wrap instead of cutting text. The exceptions
  are the balance and stat amounts, which stay on one line and shrink to fit (design.md, Large
  text), so 999.999,99 € and larger totals are never cut at the largest size.
- Colors come from one light and one dark palette chosen by `useColorScheme()` (FR-030).
  Negative amounts never rely on color alone.

Visual design (colors, type, spacing, components) is in [design.md](../design.md).

## Unexpected errors

A root error boundary (Expo Router's `ErrorBoundary` export in `src/app/_layout.tsx`) catches
render errors. It shows "Something went wrong." with a **Try again** button that re-renders the
app, never the error text, which could contain data (principle III).

## Preview-only developer tools

Builds made with `EXPO_PUBLIC_DEV_TOOLS=1` (the `preview` profile only) show a "Seed 1,000
transactions" button at the bottom of the summary. It inserts 1,000 random valid transactions
dated between the 1st of the current month and today, in one SQL transaction, for the SC-004
check. The code lives in `src/dev/seed.ts` and is loaded only inside
`if (process.env.EXPO_PUBLIC_DEV_TOOLS === '1')`. Expo replaces that variable with a constant
at build time, so the production bundle drops the branch. The quickstart checks that the
production bundle does not contain the button text.

The same flag adds a "Simulate storage error" switch. While it is on, the repository throws
`StorageError` on every call, so the FR-024/FR-025 error paths and the log check can be run on a
real build.
