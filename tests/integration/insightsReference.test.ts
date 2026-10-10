// SC-001 end to end (T055): the T008 reference set goes through the real repository on SQLite
// (store, edit, range read), then through the Insights functions, and must give the hand-checked
// literals. The unit tests check the same literals from in-memory rows; this one catches what
// storage could change on the way (dates, types, categories, edits that move rows between months).
import { openAndMigrate } from '@/data/migrations';
import { createTransactionRepository, type TransactionRepository } from '@/data/transactionRepository';
import { compareCategories } from '@/domain/categoryChanges';
import { rowsInMonth, type LedgerRow } from '@/domain/ledger';
import { previous, type IsoDate, type YearMonth } from '@/domain/month';
import { computePace, dayDetail } from '@/domain/pace';
import { computeTrend, trendStart } from '@/domain/trend';
import type { TransactionInput } from '@/domain/validation';

import {
  insightsReference2024,
  insightsReference2026,
  type InsightsEdit,
  type PaceExpectation,
} from '../fixtures/insightsReference';
import { openTestDatabase, type TestDatabase } from '../helpers/betterSqliteAdapter';
import { tempDbFile } from '../helpers/tempDbFile';

let temp: ReturnType<typeof tempDbFile>;
let db: TestDatabase;
let repo: TransactionRepository;

beforeEach(async () => {
  temp = tempDbFile();
  db = openTestDatabase(temp.file);
  await openAndMigrate(db);
  repo = createTransactionRepository(db);
});

afterEach(() => {
  db.close();
  temp.cleanup();
});

/** Stores the inputs in order, then applies the edits with `update`, as the edit form does. */
async function store(inputs: readonly TransactionInput[], edits: readonly InsightsEdit[]) {
  const ids: number[] = [];
  for (const input of inputs) ids.push((await repo.create(input, 1)).id);
  for (const { index, input } of edits) await repo.update(ids[index], input);
}

/** One range read per selected month, as `useInsights` does, split like the hook splits it. */
async function insightsFor(ym: YearMonth, today: IsoDate) {
  const rows: LedgerRow[] = await repo.listRange(trendStart(ym), ym);
  const current = rowsInMonth(rows, ym);
  const prev = rowsInMonth(rows, previous(ym));
  return {
    pace: computePace(ym, current, prev, today),
    categories: compareCategories(ym, current, prev, today),
    trend: computeTrend(ym, rows),
  };
}

function expectPace(pace: ReturnType<typeof computePace>, expected: PaceExpectation) {
  const { details, ...shape } = expected;
  expect(pace).toEqual(shape);
  for (const detail of details) expect(dayDetail(pace, detail.day)).toEqual(detail);
}

describe('SC-001 reference set through the repository (T008 literals)', () => {
  const ref2026 = insightsReference2026;
  const ref2024 = insightsReference2024;

  it('October 2026 (current month): pace, categories by day 12 and trend', async () => {
    await store(ref2026.inputs, ref2026.edits);
    const insights = await insightsFor({ year: 2026, month: 10 }, ref2026.today);

    expectPace(insights.pace, ref2026.expected.paceOctober);
    expect(insights.categories).toEqual(ref2026.expected.categoriesOctober);
    expect(insights.trend).toEqual(ref2026.expected.trendOctober);
  });

  it('September 2026 (past month): pace and categories over whole months', async () => {
    await store(ref2026.inputs, ref2026.edits);
    const insights = await insightsFor({ year: 2026, month: 9 }, ref2026.today);

    expectPace(insights.pace, ref2026.expected.paceSeptember);
    expect(insights.categories).toEqual(ref2026.expected.categoriesSeptember);
  });

  it('June 2026 (a month without data): the trend', async () => {
    await store(ref2026.inputs, ref2026.edits);
    const insights = await insightsFor({ year: 2026, month: 6 }, ref2026.today);

    expect(insights.trend).toEqual(ref2026.expected.trendJune);
  });

  it('March 2024 (day 30, later-dated income) against a 29-day February', async () => {
    await store(ref2024.inputs, ref2024.edits);
    const insights = await insightsFor({ year: 2024, month: 3 }, ref2024.today);

    expectPace(insights.pace, ref2024.expected.paceMarch);
    expect(insights.categories).toEqual(ref2024.expected.categoriesMarch);
    expect(insights.trend).toEqual(ref2024.expected.trendMarch);
  });
});
