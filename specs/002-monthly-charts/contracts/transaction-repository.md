# Contract: TransactionRepository (002 addition)

001's contract ([../../001-monthly-summary/contracts/transaction-repository.md](../../001-monthly-summary/contracts/transaction-repository.md))
still holds in full. 002 adds one read and changes nothing else.

## New operation

| Operation | Returns | Behaviour |
| --- | --- | --- |
| `listRange(from: YearMonth, to: YearMonth)` | `LedgerRow[]` | Every row dated from the 1st of `from` to the last day of `to`, inclusive, as `{ type, amountCents, date, category }` (no note, id or `created_at`), ordered `date ASC, id ASC`. `from` after `to` returns `[]`. |

```sql
SELECT type, amount_cents, date, category FROM transactions
WHERE date >= ? AND date < ?          -- 1st of `from`, 1st of the month after `to`
ORDER BY date ASC, id ASC
```

It uses 001's `idx_transactions_date` index. `LedgerRow` is defined in
[insights-domain.md](insights-domain.md).

## Error rules

As in 001: any failure is thrown as `StorageError` with the code `'list'` and no original message;
the caller gets every row of the range or an error, never part of it.

## Guarantees checked by integration tests

- Range edges: a row on the 1st of `from` and one on the last day of `to` are included; rows on
  the last day before `from` and the 1st after `to` are not. Ranges across a year end and through
  February in leap and non-leap years.
- `from === to` returns the same rows as `listByMonth` (as slim rows).
- After `update` moves a row to another month, `listRange` over both months reflects it.
- A closed or failing database throws `StorageError('list')`.
