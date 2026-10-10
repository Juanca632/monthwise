# Mutation testing results (T057)

Stryker 10 over the files 002 added or changed in `src/domain/` and `src/data/`
(`categoryChanges.ts`, `ledger.ts`, `pace.ts`, `percent.ts`, `trend.ts`, `month.ts`,
`transactionRepository.ts`), on 2026-10-10.

## How it was run

`stryker.config.json` with two overrides: `mutate` limited to the files above, and the Jest
`roots` limited to `tests/unit` and `tests/integration` (`"jest": {"config": {"roots": [...]}}`).
The first full run over every file and every suite estimated about 2 h 30 min: `month.ts` is used
by almost every suite, and each of its mutants re-ran the acceptance and component suites, which
render the whole app. Unit and integration tests are where money rules must be pinned (AGENTS.md,
Testing), so a mutant only a screen test catches counts as a gap here. The run took about 7 min
with `--concurrency 3` (the machine has 5 GB of RAM; see `jest.config.js`, `maxWorkers`).

## Score

| | Before | After |
| --- | --- | --- |
| All seven files | 93.79% (420 killed, 3 timeout, 27 survived, 1 no coverage) | 95.34% (427 killed, 3 timeout, 21 survived, 0 no coverage); 100% of the non-equivalent mutants once the comparator is checked by hand (below) |

| File | Before | After |
| --- | --- | --- |
| `ledger.ts` | 100% | 100% |
| `month.ts` | 99.09% | 99.09% |
| `transactionRepository.ts` | 91.38% | 98.28% |
| `trend.ts` | 97.96% | 97.96% |
| `percent.ts` | 95.24% | 95.24% |
| `pace.ts` | 93.16% | 94.87% |
| `categoryChanges.ts` | 86.05% | 87.21% |

Every mutant left after the fixes is in the two lists below.

## Real gaps, fixed with tests

| Mutant | Test added |
| --- | --- |
| `pace.ts`: a past month's line end taken from today's day instead of its last day | `tests/unit/pace.test.ts`: a past month whose last row is before today's day still draws all its days |
| `pace.ts`: `noSpending` when only this month has no spending | same file: no spending this month against spending last month is `less` |
| `categoryChanges.ts`: `noSpending` when only this month has no expenses | `tests/unit/categoryChanges.test.ts`: last month's categories are listed at -100% |
| `transactionRepository.ts`: the read-back check after a write removed, or its `create`/`update` code changed (001 code, in a changed file) | `tests/integration/transactionRepository.test.ts`: a write whose row cannot be read back reports its own code |

## Stryker misreport on the label comparator

As in 001 (`summary.ts`), Stryker lists the tie comparator in `categoryChanges.ts` (`byLabel`) as
surviving. Applied by hand, "always -1" and "`la < lb` is false" each fail
`tests/unit/categoryChanges.test.ts` (scenario 5, ties by label), so the tests kill them. Re-check
by hand when `categoryChanges.ts` changes.

## Equivalent or unreachable mutants (accepted)

| Mutant | Why it cannot change behavior |
| --- | --- |
| `pace.ts` and `categoryChanges.ts`: `inMonth` always true, or `\|\|` instead of `&&` (also in `lineEnd`) | Callers pass only the month's rows (contracts/insights-domain.md; `rowsInMonth` in `useInsights`, `listByMonth`/`listRange` in `useMonthSummary`); the check is a guard |
| `pace.ts`: `day <= length` always true | The length is the month's last day or a line end that already covers every row of the month |
| `categoryChanges.ts`: `<=`/`>=` in `byLabel`; `labelFor('')` | Expense labels are distinct, so two labels are never equal; `labelFor` finds expense labels either way |
| `month.ts`: `pickerYear`'s January 2000 check always true | The picker cannot reach a year before 2000 (`canGoPrevious` is false in 2000), so every month it shows is on or after January 2000 |
| `percent.ts`: `magnitude * sign` to `magnitude / sign` | `sign` is 1 or -1, or 0 only with a magnitude of 0, where `0 / 0 \|\| 0` is still 0 |
| `trend.ts`: `< 0` to `<= 0` in `trendStart` | When the start equals January 2000 both branches return January 2000 |
| `transactionRepository.ts`: `listRange`'s `from > to` check removed | The SQL range is then empty (start after end), so it returns `[]` anyway |
