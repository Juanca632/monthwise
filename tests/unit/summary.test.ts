import { computeSummary, type SummaryRow } from '@/domain/summary';
import { referenceSummary, referenceTransactions } from '../fixtures/referenceTransactions';

const expense = (category: string, amountCents: number): SummaryRow => ({
  type: 'expense',
  amountCents,
  category,
});
const income = (category: string, amountCents: number): SummaryRow => ({
  type: 'income',
  amountCents,
  category,
});

describe('computeSummary', () => {
  it('matches the hand-calculated reference month (SC-002)', () => {
    expect(referenceTransactions.length).toBeGreaterThanOrEqual(50);
    expect(computeSummary(referenceTransactions)).toEqual(referenceSummary);
  });

  it('splits 60/30/10 (spec example)', () => {
    const s = computeSummary([
      expense('housing', 60000),
      expense('food', 30000),
      expense('leisure', 10000),
    ]);
    expect(s.breakdown.map((b) => [b.category, b.percentLabel])).toEqual([
      ['housing', '60%'],
      ['food', '30%'],
      ['leisure', '10%'],
    ]);
  });

  it('gives a negative balance of -150,00 (spec example)', () => {
    const s = computeSummary([income('salary', 200000), expense('housing', 215000)]);
    expect(s).toMatchObject({ incomeCents: 200000, expenseCents: 215000, balanceCents: -15000 });
  });

  it('rounds 12.5 % up to 13 % even with a very large total', () => {
    // 8 × 99,999,999 × 1000 cents in total, one eighth of it in food: exactly 12.5 %.
    const big = 99_999_999;
    const rows = [
      ...Array.from({ length: 1000 }, () => expense('food', big)),
      ...Array.from({ length: 7000 }, () => expense('housing', big)),
    ];
    const food = computeSummary(rows).breakdown.find((b) => b.category === 'food');
    expect(food).toMatchObject({ percent: 13, percentLabel: '13%' });
  });

  it('rounds just below one half down', () => {
    // 1 / 8 of the total minus 1 cent is a hair under 12.5 %.
    const s = computeSummary([expense('food', 99), expense('housing', 701)]);
    expect(s.breakdown.find((b) => b.category === 'food')?.percent).toBe(12);
  });

  it('shows <1% for a small but non-zero share', () => {
    const s = computeSummary([expense('housing', 99_999_999), expense('food', 1)]);
    expect(s.breakdown[1]).toEqual({
      category: 'food',
      amountCents: 1,
      percent: 0,
      percentLabel: '<1%',
    });
  });

  it('orders ties by label', () => {
    const s = computeSummary([
      expense('transport', 500),
      expense('bills', 500),
      expense('food', 500),
      expense('housing', 1000),
    ]);
    expect(s.breakdown.map((b) => b.category)).toEqual(['housing', 'bills', 'food', 'transport']);
  });

  it('adds up several rows in the same category', () => {
    const s = computeSummary([expense('food', 1250), expense('food', 750), expense('bills', 1000)]);
    expect(s.breakdown[0]).toMatchObject({ category: 'food', amountCents: 2000, percent: 67 });
  });

  it('has an empty breakdown with no expenses', () => {
    const s = computeSummary([income('salary', 100000), income('other', 5000)]);
    expect(s).toEqual({
      incomeCents: 105000,
      expenseCents: 0,
      balanceCents: 105000,
      breakdown: [],
    });
  });

  it('keeps income other and expense other apart', () => {
    const s = computeSummary([income('other', 100), expense('other', 300)]);
    expect(s.incomeCents).toBe(100);
    expect(s.breakdown).toEqual([
      { category: 'other', amountCents: 300, percent: 100, percentLabel: '100%' },
    ]);
  });

  it('returns zeros for an empty month', () => {
    expect(computeSummary([])).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      breakdown: [],
    });
  });
});
