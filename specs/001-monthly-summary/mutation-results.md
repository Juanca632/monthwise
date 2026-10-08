# Mutation testing results (T091)

Stryker 10 (`npx stryker run`, `stryker.config.json`) over `src/domain/**/*.ts` and
`src/data/**/*.ts`, with the Jest runner, on 2026-10-08.

## Score

| | Before | After |
| --- | --- | --- |
| Mutation score (all files) | 92.29% (375 killed, 8 timeout, 28 survived, 4 no coverage) | 92.39% on the six files re-run (Stryker's figure), 100% of the non-equivalent mutants once `summary.ts` is checked by hand (below) |

`categories.ts`, `days.ts`, `note.ts` and `month.ts` (after the fix) are at 100%.
`validation.ts` keeps one equivalent mutant (below). `sqlDatabase.ts` has no mutable logic.

## Real gaps, fixed with tests

| Mutant | Test added |
| --- | --- |
| `migrations.ts`: `ROLLBACK` removed, or the `migrate` code changed | `tests/integration/migrations.test.ts`: a migration that fails on the version bump leaves no open transaction, `user_version` 0, no `transactions` table, and throws `StorageError('migrate')` |
| `transactionRepository.ts`: the `get`, `list`, `update` and `remove` codes changed | `tests/integration/transactionRepository.test.ts`: each failed operation reports its own code (the only thing `reportError` logs) |
| `errors.ts`: `NotFoundError` name and message | same file: `name` and `message` are fixed and carry no row data |
| `month.ts`: `isMinMonth` ignoring the year | `tests/unit/month.test.ts`: January 2001 is not the minimum month |
| `amount.ts`: `/^0+/` to `/^0/` | `tests/unit/amount.test.ts`: `0000001234` parses to 123400 cents |
| `summary.ts`: tie order by label | `tests/unit/summary.test.ts`: an eight-way tie in reverse order comes out by label |

## Stryker misreport on `summary.ts`

Stryker still lists the tie comparator mutants of `summary.ts` as survivors after the fix, as it
did for the existing "orders ties by label" test. Applied by hand, `return 0`, the "always -1"
branch and the "false" branch each fail `tests/unit/summary.test.ts`, so the tests do kill them;
the likely cause is the `jest-expo` transform cache serving that file unmutated. Re-check by hand
when `summary.ts` changes.

## Equivalent or unreachable mutants (accepted)

| Mutant | Why it cannot change behavior |
| --- | --- |
| `summary.ts`: the `amountCents > 0` filter removed or `>= 0` | Every stored amount is positive (database CHECK), so a category total is never 0 |
| `summary.ts`: `labelFor('')`; `<=` / `>=` in the comparator | Labels are distinct and `labelFor` finds expense labels either way |
| `amount.ts:45`: the six-digit check removed | Longer numbers still exceed `MAX_AMOUNT_CENTS` on line 50 |
| `amount.ts:47`: `intDigits === ''` | `Number('')` is 0 anyway |
| `amount.ts:50`: the `MAX_AMOUNT_CENTS` check (no coverage) | With at most six integer digits the amount cannot exceed 999,999.99; kept as a guard |
| `migrations.ts:34`: `>=` to `>`, or the early return removed | At the current version the loop runs zero steps and only rewrites the same `user_version` |
| `transactionRepository.ts:69, 100, 115`: the reread after a write | A row read right after it was written on the same connection is always there; kept as a guard |
| `validation.ts:48`: `if (!amount.ok)` always true | It stores `undefined`, and every reader checks `!== undefined` |
