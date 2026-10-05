# Contract: TransactionRepository

The only module that reads or writes stored transactions. Screens and hooks depend on this
interface, never on SQL. Implemented in `src/data/transactionRepository.ts` on top of
`SqlDatabase` (research R4). Integration tests run it against `better-sqlite3` (research R10).

## Types

```ts
type TransactionType = 'income' | 'expense';
type IsoDate = string;          // 'YYYY-MM-DD'
type YearMonth = { year: number; month: number }; // month 1..12

interface Transaction {
  id: number;
  type: TransactionType;
  amountCents: number;          // integer, 1..99_999_999
  date: IsoDate;
  category: string;             // key valid for type, see data-model.md
  note: string | null;
  createdAt: number;            // ms since epoch
}

interface TransactionInput {
  type: TransactionType;
  amountCents: number;
  date: IsoDate;
  category: string;
  note: string | null;
}

/** The subset of expo-sqlite's SQLiteDatabase the repository uses. */
interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: (string | number | null)[]):
    Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T | null>;
}
```

## Operations

| Operation                        | Returns                 | Behaviour                                              |
| -------------------------------- | ----------------------- | ------------------------------------------------------ |
| `listByMonth(month: YearMonth)`  | `Transaction[]`         | Rows with `date` in the month, ordered `date DESC, id DESC` |
| `getById(id: number)`            | `Transaction \| null`   | `null` when the id does not exist                      |
| `create(input, now: number)`     | `Transaction`           | Inserts with `created_at = now`; returns the stored row|
| `update(id, input)`              | `Transaction`           | Replaces all editable fields; keeps `created_at`. Throws `NotFoundError` if no row changed |
| `remove(id: number)`             | `void`                  | Deletes the row. Throws `NotFoundError` if no row changed |

`now` is passed in so tests control time.

## Error rules (FR-024, FR-025)

- Any failure (storage full, constraint violation, closed database) is thrown as a
  `StorageError` with a fixed code. The original error message is not passed on, because it
  could contain values (principle III).
- A failed `create`, `update` or `remove` leaves the table unchanged. Each is a single SQL
  statement, which SQLite applies completely or not at all.
- Callers never see partial results: `listByMonth` either returns every row of the month or
  throws.

## Guarantees checked by integration tests

- Round trip: what `create` returns equals what `getById` and `listByMonth` return.
- Month boundaries: a transaction on the 1st and one on the last day are in their month; one on
  the 1st of the next month is not. February in leap and non-leap years, and December → January.
- Ordering, including two rows on the same date (the later save first, even with an older `created_at`).
- `update` keeps `created_at`; changing `date` moves the row to the other month.
- Constraint violations (category not valid for the type, amount 0, a day that does not exist
  such as `2026-02-30`) are rejected and nothing is stored.
- SC-002: a reference script of at least 50 creates, updates and removes, run through the
  repository; the summary of `listByMonth` matches hand-calculated cents.
- Migration from an empty database sets `user_version = 1`; opening again does not run it twice.
- After open, `PRAGMA journal_mode` returns `wal`.
