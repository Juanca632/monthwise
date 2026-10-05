# Data Model: Record Transactions and Monthly Summary

Phase 1 output for `plan.md`. Storage is one SQLite database on the phone (research R3).

## Stored entity: Transaction

Table `transactions`, schema version 1.

| Column         | SQLite type | Rules                                                        | Spec          |
| -------------- | ----------- | ------------------------------------------------------------ | ------------- |
| `id`           | INTEGER     | Primary key, autoincrement, never reused                     | —             |
| `type`         | TEXT        | `'income'` or `'expense'`                                    | FR-001        |
| `amount_cents` | INTEGER     | 1 to 99,999,999 (0.01 to 999,999.99 EUR)                     | FR-004, FR-028|
| `date`         | TEXT        | Calendar day `YYYY-MM-DD`, ≥ `2000-01-01`                    | FR-006        |
| `category`     | TEXT        | Category key valid for `type` (see below)                    | FR-008        |
| `note`         | TEXT        | `NULL` when empty; otherwise 1 to 100 visible characters     | FR-007        |
| `created_at`   | INTEGER     | Milliseconds since epoch when first saved; never updated     | Key Entities  |

```sql
CREATE TABLE transactions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT    NOT NULL CHECK (type IN ('income', 'expense')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents BETWEEN 1 AND 99999999),
  date         TEXT    NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
                                       AND date = date(date)
                                       AND date >= '2000-01-01'),
  category     TEXT    NOT NULL CHECK (
                 (type = 'expense' AND category IN ('food', 'transport', 'housing', 'bills',
                                                    'health', 'shopping', 'leisure', 'other'))
              OR (type = 'income'  AND category IN ('salary', 'freelance', 'gifts', 'other'))),
  note         TEXT    CHECK (note IS NULL OR length(note) > 0),
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_transactions_date ON transactions (date);
```

Notes:

- **Why cents as INTEGER**: constitution principle III; `0.1 + 0.2 ≠ 0.3` in floating point.
- **Real dates only**: `date = date(date)` rejects days that do not exist (`2026-13-45`,
  `2026-02-30`), because SQLite's `date()` returns NULL or a different day for them.
- **Why the date is TEXT**: a transaction belongs to a calendar day, not an instant. A text day
  does not shift when the time zone changes, and `YYYY-MM-DD` sorts correctly as text.
- **What the database does not check**: "date ≤ today", because a stored date may be later than
  today after a clock change (spec edge case), and the 100 *visible* character limit, because
  SQLite counts code points. The form validation enforces both (see Validation).
- **Type and category**: the database rejects a category that does not belong to the type. This
  backs up FR-012 (changing the type clears the category).
- **Ordering**: newest `date` first, then highest `id`. With `AUTOINCREMENT`, `id` grows with
  every save and is never reused, so it reflects recording order even if the phone's clock moves
  back. This is the spec's "recording order" (Key Entities). `created_at` keeps the moment of
  first recording but is not used for ordering, because wall-clock time can go backwards.

### Migrations

`PRAGMA user_version` stores the schema version. On every open, the app first runs
`PRAGMA journal_mode = WAL` **outside any transaction** (SQLite cannot change the journal mode
inside one). Then it runs every migration above the stored version inside one transaction and
sets the new version in that same transaction. Version 1 creates the table and index above. The
same open-and-migrate code runs in the integration tests (research R10), which also check the
journal mode after open.

## Fixed data: Category

Defined in code (`src/domain/categories.ts`), not in the database. A category is identified by
`type + key`, so expense `other` and income `other` are different categories.

| Type    | Key (stored) | Label (shown) |
| ------- | ------------ | ------------- |
| expense | `food`       | Food          |
| expense | `transport`  | Transport     |
| expense | `housing`    | Housing       |
| expense | `bills`      | Bills         |
| expense | `health`     | Health        |
| expense | `shopping`   | Shopping      |
| expense | `leisure`    | Leisure       |
| expense | `other`      | Other         |
| income  | `salary`     | Salary        |
| income  | `freelance`  | Freelance     |
| income  | `gifts`      | Gifts         |
| income  | `other`      | Other         |

Keys are stable English identifiers. Labels can change, or be translated in feature 007, without
touching stored data.

## Derived (not stored): MonthlySummary

Computed by pure functions from one month's transactions (research R5).

| Field           | Rule                                                                       | Spec   |
| --------------- | -------------------------------------------------------------------------- | ------ |
| `month`         | `{ year, month }`, from Jan 2000 up to the current month                   | FR-021 |
| `incomeCents`   | Sum of income amounts in the month                                         | FR-015 |
| `expenseCents`  | Sum of expense amounts in the month                                        | FR-015 |
| `balanceCents`  | `incomeCents − expenseCents`; can be negative                              | FR-015 |
| `breakdown`     | Expense categories with `amountCents > 0`, each with `percentLabel`        | FR-016 |
| `transactions`  | The month's rows in display order (see Ordering)                           | FR-017 |

Breakdown rules:

- With `n = 200 × amountCents + expenseCents` and `d = 2 × expenseCents`,
  `percent = (n - n % d) / d`. That is an exact integer division, and it rounds
  `100 × amountCents / expenseCents` half up.
- `percentLabel` is `"<1%"` when `amountCents > 0` and `percent = 0`; otherwise `"{percent}%"`.
- Order: `amountCents` descending, then label alphabetically.
- An empty breakdown (no expenses) is shown as the empty state from FR-022.

Month range for a query: `date >= 'YYYY-MM-01' AND date < first day of the next month`.

## Form input: TransactionDraft

What the form holds before saving (not stored).

| Field        | Value while editing          | Validation on Save                                                    |
| ------------ | ---------------------------- | --------------------------------------------------------------------- |
| `type`       | `'expense'` (new) / stored   | —                                                                     |
| `amountText` | Raw text the user typed      | Parses to 1..99,999,999 cents with the rules below                   |
| `date`       | `YYYY-MM-DD`                 | Between `2000-01-01` and today (FR-006)                               |
| `category`   | Key or `null`                | Not `null` and valid for `type` (FR-008)                              |
| `note`       | Text, cut at 100 graphemes   | ≤ 100 visible characters (see note rule below)                        |

Amount parsing (FR-004, FR-005, spec edge cases), from trimmed text to cents or an error:

| Input       | Result                                                    |
| ----------- | --------------------------------------------------------- |
| `12,50`     | 1250                                                      |
| `12.50`     | 1250                                                      |
| `.5`        | 50                                                        |
| `12.`       | 1200                                                      |
| `1.250,00`  | Error: more than one separator (no thousands separators)  |
| `1.250`     | Error: more than 2 decimals (same hint)                   |
| `0`, `0,00` | Error: must be greater than 0                             |
| `-5`        | Error: invalid amount                                     |
| (empty)     | Error: amount required                                    |
| `1000000`   | Error: maximum is 999,999.99                              |

Parsing works on the digit strings (integer part × 100 + decimal part padded to 2 digits) and
never goes through a float.

Note rule (a plan-level choice that does not change spec behaviour): the 100-character limit
applies to the text as typed. On save, leading and trailing whitespace is removed; if nothing is
left, the note is stored as `NULL` and shown as no note.

"Today" is computed when the form opens and again at save time, never cached across midnight
(spec edge case).

A draft is **dirty** when any field differs from the values the form opened with (FR-010).
Amount and note are compared as raw text (`1250,00` → `1250,0` counts as a change), type,
date and category by value. After a successful save or delete, the form turns the discard guard
off before it navigates away, so "Discard changes?" never appears after saving. A component test
covers this.

## State transitions

A transaction has no status field: it is created, edited (any field except `id` and
`created_at`) or deleted (removed from the table; no soft delete, no undo).
