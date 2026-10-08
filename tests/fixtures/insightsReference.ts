// Reference data for SC-001 (feature 002): inputs, edits and hand-checked expected results for
// the pace, category-change and trend functions. The expected values are literals worked out
// outside the app (Python, exact integer arithmetic, scratch script) from the data AFTER the
// edits, so tests that import this file never reuse the formulas under test.
//
// Rules the numbers follow (specs/002-monthly-charts/data-model.md):
// - Percent: |rounded| = floor((200 * |part| + whole) / (2 * whole)), sign of the part applied
//   after; sign 0 only when the part is 0; `rounded` is never -0.
// - Current month: the selected line runs to the later of today's day and the latest row dated
//   after today (any type; an income only extends the line flat). The sentence and the category
//   amounts use only days up to today's day (previous month: min(today's day, its last day)).
// - Past month: the whole selected and previous months, comparisonDay null.
// - dayDetail: selected is null past the line end or the month's last day; previous is the whole
//   month past its last day; change only when both exist ('new' when previous is 0 and selected
//   is above 0, 0% when both are 0).
// - Categories: listed when current or previous is above 0; ordered by changeCents descending,
//   ties by label (code-unit order).
// - Trend: the selected month and five before it; rows after today count (no `today` there).
import type { IsoDate, YearMonth } from '@/domain/month';
import type { TransactionInput } from '@/domain/validation';

// Local copies of the contract shapes (contracts/insights-domain.md), so this file typechecks
// before the production modules exist. Tests compare them structurally.
export type PercentExpectation = { rounded: number; sign: -1 | 0 | 1 };
export type PaceSentenceExpectation =
  | { kind: 'noSpending' }
  | { kind: 'noPreviousData'; previousMonth: YearMonth; isCurrent: boolean }
  | {
      kind: 'more' | 'less' | 'same';
      differenceCents: number;
      comparisonDay: number | null;
      previousMonth: YearMonth;
    };
export type DayDetailExpectation = {
  day: number;
  selectedCents: number | null;
  previousCents: number | null;
  change: { differenceCents: number; percent: PercentExpectation | 'new' } | null;
};
export type PaceExpectation = {
  selected: { month: YearMonth; cumulativeCents: number[] };
  previous: { month: YearMonth; cumulativeCents: number[] } | null;
  chartDays: number;
  comparisonDay: number | null;
  sentence: PaceSentenceExpectation;
  details: DayDetailExpectation[];
};
export type CategoryChangeExpectation = {
  category: string;
  currentCents: number;
  previousCents: number;
  changeCents: number;
  percent: PercentExpectation | 'new';
};
export type CategoryExpectation = {
  kind: 'changes';
  comparisonDay: number | null;
  rows: CategoryChangeExpectation[];
};
export type MonthTotalsExpectation = {
  month: YearMonth;
  hasData: boolean;
  incomeCents: number;
  expenseCents: number;
  savedCents: number;
  rate: PercentExpectation | null;
};
export type TrendExpectation = {
  months: MonthTotalsExpectation[];
  monthsWithData: number;
  totalSavedCents: number;
  rate: PercentExpectation | null;
};
export type InsightsEdit = { index: number; input: TransactionInput };

// ---------------------------------------------------------------------------------------------
// 2026 set: April-October 2026, today = 2026-10-12.

// 105 inputs. Edits (index into inputs, new full input):
//   #62: expense 1500 transport 2026-08-27 -> expense 1500 transport 2026-09-05
//   #70: expense 2340 leisure 2026-09-21 -> expense 2340 leisure 2026-10-09
//   #71: expense 9000 shopping 2026-09-28 -> income 9000 gifts 2026-09-28
//   #100: expense 7777 other 2026-10-03 -> expense 7777 other 2026-09-30
//   #101: expense 1200 other 2026-10-10 -> income 1200 freelance 2026-10-10
//
// Totals per month AFTER the edits (cents):
//   2026-04  rows  12  income   231050  expenses    55460  saved   175590
//   2026-05  rows  15  income   276050  expenses    73639  saved   202411
//   2026-06  rows   0  income        0  expenses        0  saved        0
//   2026-07  rows  14  income        0  expenses    74466  saved   -74466
//   2026-08  rows  21  income   150075  expenses   205663  saved   -55588
//   2026-09  rows  30  income   252550  expenses   206703  saved    45847
//   2026-10  rows  13  income   255250  expenses    85965  saved   169285
//
// October pace (selected, line end 20) against September (whole month, 30 days); previous
// past day 30 is the whole month. Spent by day 12: October 79465, September 78044.
//   day  1  selected    1850  previous       0
//   day  2  selected    1850  previous    4250
//   day  3  selected    1850  previous    4250
//   day  4  selected    1850  previous   12250
//   day  5  selected    1850  previous   13750
//   day  6  selected   12850  previous   13750
//   day  7  selected   12850  previous   19870
//   day  8  selected   15825  previous   19870
//   day  9  selected   78015  previous   71870
//   day 10  selected   78015  previous   71870
//   day 11  selected   79465  previous   75045
//   day 12  selected   79465  previous   78044
//   day 13  selected   79465  previous   96974
//   day 14  selected   79465  previous  108890
//   day 15  selected   85965  previous  108890
//   day 16  selected   85965  previous  121446
//   day 17  selected   85965  previous  132854
//   day 18  selected   85965  previous  142110
//   day 19  selected   85965  previous  142110
//   day 20  selected   85965  previous  146078
//   day 21  selected    None  previous  146078
//   day 22  selected    None  previous  157927
//   day 23  selected    None  previous  157927
//   day 24  selected    None  previous  166577
//   day 25  selected    None  previous  166577
//   day 26  selected    None  previous  166577
//   day 27  selected    None  previous  166577
//   day 28  selected    None  previous  172726
//   day 29  selected    None  previous  177730
//   day 30  selected    None  previous  206703
//   day 31  selected    None  previous  206703
//
// September selected as a past month against August: whole months, line end 30.
// Spent: September 206703, August 205663.
//   day  1  selected       0  previous   14973
//   day  2  selected    4250  previous   14973
//   day  3  selected    4250  previous   14973
//   day  4  selected   12250  previous   49476
//   day  5  selected   13750  previous   49476
//   day  6  selected   13750  previous   64791
//   day  7  selected   19870  previous   81796
//   day  8  selected   19870  previous   81796
//   day  9  selected   71870  previous   81796
//   day 10  selected   71870  previous   81796
//   day 11  selected   75045  previous   81796
//   day 12  selected   78044  previous   87933
//   day 13  selected   96974  previous   87933
//   day 14  selected  108890  previous  103017
//   day 15  selected  108890  previous  135744
//   day 16  selected  121446  previous  135744
//   day 17  selected  132854  previous  135744
//   day 18  selected  142110  previous  140175
//   day 19  selected  142110  previous  153191
//   day 20  selected  146078  previous  153191
//   day 21  selected  146078  previous  153191
//   day 22  selected  157927  previous  153191
//   day 23  selected  157927  previous  165128
//   day 24  selected  166577  previous  181333
//   day 25  selected  166577  previous  184699
//   day 26  selected  166577  previous  184699
//   day 27  selected  166577  previous  184699
//   day 28  selected  172726  previous  197119
//   day 29  selected  177730  previous  197119
//   day 30  selected  206703  previous  197119
//   day 31  selected    None  previous  205663
//
// October (by day 12) against September (by day 12), per expense category:
//   bills      oct   11000  sep    8000  change    3000
//   food       oct    4825  sep    7425  change   -2600
//   health     oct    3350  sep       0  change    3350
//   housing    oct   52000  sep   52000  change       0
//   leisure    oct    2340  sep    6120  change   -3780
//   shopping   oct    1450  sep    2999  change   -1549
//   transport  oct    4500  sep    1500  change    3000
//
// September against August, whole months, per expense category:
//   bills      sep   16650  aug   26615  change   -9965
//   food       sep   20759  aug   24458  change   -3699
//   health     sep    6152  aug   17005  change  -10853
//   housing    sep   69143  aug    7631  change   61512
//   leisure    sep   15320  aug   53970  change  -38650
//   other      sep   14335  aug   38034  change  -23699
//   shopping   sep   47444  aug   32762  change   14682
//   transport  sep   16900  aug    5188  change   11712
//
// Trend: income/expenses/saved per month are in the totals table above; rates are
// percentOf(saved, income) by the rule at the top. June has no rows (hasData false).

const inputs2026: TransactionInput[] = [
  { type: 'income', amountCents: 231050, date: '2026-04-01', category: 'salary', note: null },
  { type: 'expense', amountCents: 7112, date: '2026-04-02', category: 'food', note: null },
  { type: 'expense', amountCents: 473, date: '2026-04-03', category: 'transport', note: null },
  { type: 'expense', amountCents: 4096, date: '2026-04-14', category: 'food', note: null },
  { type: 'expense', amountCents: 3248, date: '2026-04-09', category: 'bills', note: null },
  { type: 'expense', amountCents: 1673, date: '2026-04-21', category: 'shopping', note: null },
  { type: 'expense', amountCents: 7617, date: '2026-04-05', category: 'housing', note: null },
  { type: 'expense', amountCents: 1812, date: '2026-04-30', category: 'shopping', note: null },
  { type: 'expense', amountCents: 4977, date: '2026-04-21', category: 'other', note: null },
  { type: 'expense', amountCents: 10603, date: '2026-04-04', category: 'health', note: null },
  { type: 'expense', amountCents: 11959, date: '2026-04-25', category: 'transport', note: null },
  { type: 'expense', amountCents: 1890, date: '2026-04-14', category: 'other', note: null },
  { type: 'income', amountCents: 231050, date: '2026-05-01', category: 'salary', note: null },
  { type: 'income', amountCents: 45000, date: '2026-05-18', category: 'freelance', note: null },
  { type: 'expense', amountCents: 9442, date: '2026-05-29', category: 'shopping', note: null },
  { type: 'expense', amountCents: 1626, date: '2026-05-11', category: 'food', note: null },
  { type: 'expense', amountCents: 542, date: '2026-05-11', category: 'housing', note: null },
  { type: 'expense', amountCents: 7091, date: '2026-05-12', category: 'housing', note: null },
  { type: 'expense', amountCents: 7177, date: '2026-05-16', category: 'transport', note: null },
  { type: 'expense', amountCents: 5264, date: '2026-05-28', category: 'food', note: null },
  { type: 'expense', amountCents: 7013, date: '2026-05-18', category: 'health', note: null },
  { type: 'expense', amountCents: 11838, date: '2026-05-04', category: 'bills', note: null },
  { type: 'expense', amountCents: 5637, date: '2026-05-08', category: 'food', note: null },
  { type: 'expense', amountCents: 2193, date: '2026-05-13', category: 'leisure', note: null },
  { type: 'expense', amountCents: 9125, date: '2026-05-03', category: 'other', note: null },
  { type: 'expense', amountCents: 3481, date: '2026-05-12', category: 'leisure', note: null },
  { type: 'expense', amountCents: 3210, date: '2026-05-25', category: 'other', note: null },
  { type: 'expense', amountCents: 8363, date: '2026-07-27', category: 'bills', note: null },
  { type: 'expense', amountCents: 10352, date: '2026-07-03', category: 'leisure', note: null },
  { type: 'expense', amountCents: 1873, date: '2026-07-19', category: 'transport', note: null },
  { type: 'expense', amountCents: 898, date: '2026-07-11', category: 'housing', note: null },
  { type: 'expense', amountCents: 4231, date: '2026-07-05', category: 'health', note: null },
  { type: 'expense', amountCents: 8167, date: '2026-07-15', category: 'health', note: null },
  { type: 'expense', amountCents: 839, date: '2026-07-31', category: 'housing', note: null },
  { type: 'expense', amountCents: 4092, date: '2026-07-27', category: 'leisure', note: null },
  { type: 'expense', amountCents: 961, date: '2026-07-15', category: 'food', note: null },
  { type: 'expense', amountCents: 4226, date: '2026-07-25', category: 'transport', note: null },
  { type: 'expense', amountCents: 13545, date: '2026-07-02', category: 'housing', note: null },
  { type: 'expense', amountCents: 714, date: '2026-07-05', category: 'bills', note: null },
  { type: 'expense', amountCents: 12806, date: '2026-07-27', category: 'leisure', note: null },
  { type: 'expense', amountCents: 3399, date: '2026-07-16', category: 'food', note: null },
  { type: 'income', amountCents: 150075, date: '2026-08-01', category: 'salary', note: null },
  { type: 'expense', amountCents: 17005, date: '2026-08-07', category: 'health', note: null },
  { type: 'expense', amountCents: 4833, date: '2026-08-24', category: 'bills', note: null },
  { type: 'expense', amountCents: 11937, date: '2026-08-23', category: 'leisure', note: null },
  { type: 'expense', amountCents: 6137, date: '2026-08-12', category: 'other', note: null },
  { type: 'expense', amountCents: 4431, date: '2026-08-18', category: 'shopping', note: null },
  { type: 'expense', amountCents: 2020, date: '2026-08-04', category: 'bills', note: null },
  { type: 'expense', amountCents: 14973, date: '2026-08-01', category: 'bills', note: null },
  { type: 'expense', amountCents: 15084, date: '2026-08-14', category: 'other', note: null },
  { type: 'expense', amountCents: 15315, date: '2026-08-06', category: 'shopping', note: null },
  { type: 'expense', amountCents: 11372, date: '2026-08-24', category: 'leisure', note: null },
  { type: 'expense', amountCents: 16813, date: '2026-08-15', category: 'other', note: null },
  { type: 'expense', amountCents: 13016, date: '2026-08-19', category: 'shopping', note: null },
  { type: 'expense', amountCents: 8544, date: '2026-08-31', category: 'food', note: null },
  { type: 'expense', amountCents: 7631, date: '2026-08-28', category: 'housing', note: null },
  { type: 'expense', amountCents: 13107, date: '2026-08-04', category: 'leisure', note: null },
  { type: 'expense', amountCents: 4789, date: '2026-08-28', category: 'bills', note: null },
  { type: 'expense', amountCents: 15914, date: '2026-08-15', category: 'food', note: null },
  { type: 'expense', amountCents: 14188, date: '2026-08-04', category: 'leisure', note: null },
  { type: 'expense', amountCents: 3366, date: '2026-08-25', category: 'leisure', note: null },
  { type: 'expense', amountCents: 5188, date: '2026-08-04', category: 'transport', note: null },
  { type: 'expense', amountCents: 1500, date: '2026-08-27', category: 'transport', note: null },
  { type: 'income', amountCents: 231050, date: '2026-09-01', category: 'salary', note: null },
  { type: 'expense', amountCents: 4250, date: '2026-09-02', category: 'food', note: null },
  { type: 'expense', amountCents: 8000, date: '2026-09-04', category: 'bills', note: null },
  { type: 'expense', amountCents: 6120, date: '2026-09-07', category: 'leisure', note: null },
  { type: 'expense', amountCents: 52000, date: '2026-09-09', category: 'housing', note: null },
  { type: 'expense', amountCents: 3175, date: '2026-09-11', category: 'food', note: null },
  { type: 'expense', amountCents: 2999, date: '2026-09-12', category: 'shopping', note: null },
  { type: 'expense', amountCents: 2340, date: '2026-09-21', category: 'leisure', note: null },
  { type: 'expense', amountCents: 9000, date: '2026-09-28', category: 'shopping', note: null },
  { type: 'expense', amountCents: 4496, date: '2026-09-13', category: 'housing', note: null },
  { type: 'expense', amountCents: 1554, date: '2026-09-17', category: 'other', note: null },
  { type: 'expense', amountCents: 6149, date: '2026-09-28', category: 'food', note: null },
  { type: 'expense', amountCents: 8650, date: '2026-09-24', category: 'bills', note: null },
  { type: 'expense', amountCents: 10105, date: '2026-09-13', category: 'shopping', note: null },
  { type: 'expense', amountCents: 7185, date: '2026-09-30', category: 'food', note: null },
  { type: 'expense', amountCents: 5004, date: '2026-09-29', category: 'other', note: null },
  { type: 'expense', amountCents: 11916, date: '2026-09-14', category: 'shopping', note: null },
  { type: 'expense', amountCents: 9256, date: '2026-09-18', category: 'shopping', note: null },
  { type: 'expense', amountCents: 9854, date: '2026-09-17', category: 'transport', note: null },
  { type: 'expense', amountCents: 4329, date: '2026-09-13', category: 'shopping', note: null },
  { type: 'expense', amountCents: 3010, date: '2026-09-22', category: 'leisure', note: null },
  { type: 'expense', amountCents: 3968, date: '2026-09-20', category: 'transport', note: null },
  { type: 'expense', amountCents: 8839, date: '2026-09-22', category: 'shopping', note: null },
  { type: 'expense', amountCents: 6152, date: '2026-09-16', category: 'health', note: null },
  { type: 'expense', amountCents: 4826, date: '2026-09-16', category: 'housing', note: null },
  { type: 'expense', amountCents: 1578, date: '2026-09-16', category: 'transport', note: null },
  { type: 'expense', amountCents: 7821, date: '2026-09-30', category: 'housing', note: null },
  { type: 'expense', amountCents: 6190, date: '2026-09-30', category: 'leisure', note: null },
  { type: 'income', amountCents: 12500, date: '2026-09-16', category: 'freelance', note: null },
  { type: 'income', amountCents: 231050, date: '2026-10-01', category: 'salary', note: null },
  { type: 'expense', amountCents: 1850, date: '2026-10-01', category: 'food', note: null },
  { type: 'expense', amountCents: 11000, date: '2026-10-06', category: 'bills', note: null },
  { type: 'expense', amountCents: 2975, date: '2026-10-08', category: 'food', note: null },
  { type: 'expense', amountCents: 4500, date: '2026-10-09', category: 'transport', note: null },
  { type: 'expense', amountCents: 3350, date: '2026-10-09', category: 'health', note: null },
  { type: 'expense', amountCents: 52000, date: '2026-10-09', category: 'housing', note: null },
  { type: 'expense', amountCents: 1450, date: '2026-10-11', category: 'shopping', note: null },
  { type: 'expense', amountCents: 7777, date: '2026-10-03', category: 'other', note: null },
  { type: 'expense', amountCents: 1200, date: '2026-10-10', category: 'other', note: null },
  { type: 'expense', amountCents: 6500, date: '2026-10-15', category: 'shopping', note: null },
  { type: 'income', amountCents: 5000, date: '2026-10-20', category: 'gifts', note: null },
  { type: 'income', amountCents: 18000, date: '2026-10-05', category: 'freelance', note: null },
];

const edits2026: InsightsEdit[] = [
  { index: 62, input: { type: 'expense', amountCents: 1500, date: '2026-09-05', category: 'transport', note: null } },
  { index: 70, input: { type: 'expense', amountCents: 2340, date: '2026-10-09', category: 'leisure', note: null } },
  { index: 71, input: { type: 'income', amountCents: 9000, date: '2026-09-28', category: 'gifts', note: null } },
  { index: 100, input: { type: 'expense', amountCents: 7777, date: '2026-09-30', category: 'other', note: null } },
  { index: 101, input: { type: 'income', amountCents: 1200, date: '2026-10-10', category: 'freelance', note: null } },
];

const paceOctober: PaceExpectation = {
  selected: { month: { year: 2026, month: 10 }, cumulativeCents: [
    1850, 1850, 1850, 1850, 1850, 12850, 12850, 15825, 78015, 78015, 79465,
    79465, 79465, 79465, 85965, 85965, 85965, 85965, 85965, 85965,
  ] },
  previous: { month: { year: 2026, month: 9 }, cumulativeCents: [
    0, 4250, 4250, 12250, 13750, 13750, 19870, 19870, 71870, 71870, 75045,
    78044, 96974, 108890, 108890, 121446, 132854, 142110, 142110, 146078,
    146078, 157927, 157927, 166577, 166577, 166577, 166577, 172726, 177730,
    206703,
  ] },
  chartDays: 31,
  comparisonDay: 12,
  sentence: { kind: 'more', differenceCents: 1421, comparisonDay: 12, previousMonth: { year: 2026, month: 9 } },
  details: [
    { day: 1, selectedCents: 1850, previousCents: 0, change: { differenceCents: 1850, percent: 'new' } },
    { day: 2, selectedCents: 1850, previousCents: 4250, change: { differenceCents: -2400, percent: { rounded: -56, sign: -1 } } },
    { day: 8, selectedCents: 15825, previousCents: 19870, change: { differenceCents: -4045, percent: { rounded: -20, sign: -1 } } },
    { day: 12, selectedCents: 79465, previousCents: 78044, change: { differenceCents: 1421, percent: { rounded: 2, sign: 1 } } },
    { day: 14, selectedCents: 79465, previousCents: 108890, change: { differenceCents: -29425, percent: { rounded: -27, sign: -1 } } },
    { day: 16, selectedCents: 85965, previousCents: 121446, change: { differenceCents: -35481, percent: { rounded: -29, sign: -1 } } },
    { day: 20, selectedCents: 85965, previousCents: 146078, change: { differenceCents: -60113, percent: { rounded: -41, sign: -1 } } },
    { day: 31, selectedCents: null, previousCents: 206703, change: null },
  ],
};

const paceSeptember: PaceExpectation = {
  selected: { month: { year: 2026, month: 9 }, cumulativeCents: [
    0, 4250, 4250, 12250, 13750, 13750, 19870, 19870, 71870, 71870, 75045,
    78044, 96974, 108890, 108890, 121446, 132854, 142110, 142110, 146078,
    146078, 157927, 157927, 166577, 166577, 166577, 166577, 172726, 177730,
    206703,
  ] },
  previous: { month: { year: 2026, month: 8 }, cumulativeCents: [
    14973, 14973, 14973, 49476, 49476, 64791, 81796, 81796, 81796, 81796,
    81796, 87933, 87933, 103017, 135744, 135744, 135744, 140175, 153191,
    153191, 153191, 153191, 165128, 181333, 184699, 184699, 184699, 197119,
    197119, 197119, 205663,
  ] },
  chartDays: 31,
  comparisonDay: null,
  sentence: { kind: 'more', differenceCents: 1040, comparisonDay: null, previousMonth: { year: 2026, month: 8 } },
  details: [
    { day: 1, selectedCents: 0, previousCents: 14973, change: { differenceCents: -14973, percent: { rounded: -100, sign: -1 } } },
    { day: 2, selectedCents: 4250, previousCents: 14973, change: { differenceCents: -10723, percent: { rounded: -72, sign: -1 } } },
    { day: 8, selectedCents: 19870, previousCents: 81796, change: { differenceCents: -61926, percent: { rounded: -76, sign: -1 } } },
    { day: 12, selectedCents: 78044, previousCents: 87933, change: { differenceCents: -9889, percent: { rounded: -11, sign: -1 } } },
    { day: 14, selectedCents: 108890, previousCents: 103017, change: { differenceCents: 5873, percent: { rounded: 6, sign: 1 } } },
    { day: 16, selectedCents: 121446, previousCents: 135744, change: { differenceCents: -14298, percent: { rounded: -11, sign: -1 } } },
    { day: 20, selectedCents: 146078, previousCents: 153191, change: { differenceCents: -7113, percent: { rounded: -5, sign: -1 } } },
    { day: 31, selectedCents: null, previousCents: 205663, change: null },
  ],
};

const categoriesOctober: CategoryExpectation = { kind: 'changes', comparisonDay: 12, rows: [
    { category: 'health', currentCents: 3350, previousCents: 0, changeCents: 3350, percent: 'new' },
    { category: 'bills', currentCents: 11000, previousCents: 8000, changeCents: 3000, percent: { rounded: 38, sign: 1 } },
    { category: 'transport', currentCents: 4500, previousCents: 1500, changeCents: 3000, percent: { rounded: 200, sign: 1 } },
    { category: 'housing', currentCents: 52000, previousCents: 52000, changeCents: 0, percent: { rounded: 0, sign: 0 } },
    { category: 'shopping', currentCents: 1450, previousCents: 2999, changeCents: -1549, percent: { rounded: -52, sign: -1 } },
    { category: 'food', currentCents: 4825, previousCents: 7425, changeCents: -2600, percent: { rounded: -35, sign: -1 } },
    { category: 'leisure', currentCents: 2340, previousCents: 6120, changeCents: -3780, percent: { rounded: -62, sign: -1 } },
  ] };

const categoriesSeptember: CategoryExpectation = { kind: 'changes', comparisonDay: null, rows: [
    { category: 'housing', currentCents: 69143, previousCents: 7631, changeCents: 61512, percent: { rounded: 806, sign: 1 } },
    { category: 'shopping', currentCents: 47444, previousCents: 32762, changeCents: 14682, percent: { rounded: 45, sign: 1 } },
    { category: 'transport', currentCents: 16900, previousCents: 5188, changeCents: 11712, percent: { rounded: 226, sign: 1 } },
    { category: 'food', currentCents: 20759, previousCents: 24458, changeCents: -3699, percent: { rounded: -15, sign: -1 } },
    { category: 'bills', currentCents: 16650, previousCents: 26615, changeCents: -9965, percent: { rounded: -37, sign: -1 } },
    { category: 'health', currentCents: 6152, previousCents: 17005, changeCents: -10853, percent: { rounded: -64, sign: -1 } },
    { category: 'other', currentCents: 14335, previousCents: 38034, changeCents: -23699, percent: { rounded: -62, sign: -1 } },
    { category: 'leisure', currentCents: 15320, previousCents: 53970, changeCents: -38650, percent: { rounded: -72, sign: -1 } },
  ] };

const trendOctober: TrendExpectation = { months: [
    { month: { year: 2026, month: 5 }, hasData: true, incomeCents: 276050, expenseCents: 73639, savedCents: 202411, rate: { rounded: 73, sign: 1 } },
    { month: { year: 2026, month: 6 }, hasData: false, incomeCents: 0, expenseCents: 0, savedCents: 0, rate: null },
    { month: { year: 2026, month: 7 }, hasData: true, incomeCents: 0, expenseCents: 74466, savedCents: -74466, rate: null },
    { month: { year: 2026, month: 8 }, hasData: true, incomeCents: 150075, expenseCents: 205663, savedCents: -55588, rate: { rounded: -37, sign: -1 } },
    { month: { year: 2026, month: 9 }, hasData: true, incomeCents: 252550, expenseCents: 206703, savedCents: 45847, rate: { rounded: 18, sign: 1 } },
    { month: { year: 2026, month: 10 }, hasData: true, incomeCents: 255250, expenseCents: 85965, savedCents: 169285, rate: { rounded: 66, sign: 1 } },
  ], monthsWithData: 5, totalSavedCents: 287489, rate: { rounded: 31, sign: 1 } };

const trendJune: TrendExpectation = { months: [
    { month: { year: 2026, month: 1 }, hasData: false, incomeCents: 0, expenseCents: 0, savedCents: 0, rate: null },
    { month: { year: 2026, month: 2 }, hasData: false, incomeCents: 0, expenseCents: 0, savedCents: 0, rate: null },
    { month: { year: 2026, month: 3 }, hasData: false, incomeCents: 0, expenseCents: 0, savedCents: 0, rate: null },
    { month: { year: 2026, month: 4 }, hasData: true, incomeCents: 231050, expenseCents: 55460, savedCents: 175590, rate: { rounded: 76, sign: 1 } },
    { month: { year: 2026, month: 5 }, hasData: true, incomeCents: 276050, expenseCents: 73639, savedCents: 202411, rate: { rounded: 73, sign: 1 } },
    { month: { year: 2026, month: 6 }, hasData: false, incomeCents: 0, expenseCents: 0, savedCents: 0, rate: null },
  ], monthsWithData: 2, totalSavedCents: 378001, rate: { rounded: 75, sign: 1 } };

export const insightsReference2026 = {
  today: '2026-10-12' as IsoDate,
  inputs: inputs2026,
  edits: edits2026,
  expected: {
    paceOctober,
    paceSeptember,
    categoriesOctober,
    categoriesSeptember,
    trendOctober,
    trendJune,
  },
};

// ---------------------------------------------------------------------------------------------
// 2024 set: January-March 2024 (February has 29 days), today = 2024-03-30.
// March is selected (current month); an income on 2024-03-31 extends its line flat to day 31.
// February is compared by min(30, 29) = 29, i.e. the whole month.
//
// Totals per month (cents):
//   2024-01  rows   7  income   198000  expenses    68015  saved   129985
//   2024-02  rows   7  income   198000  expenses    72875  saved   125125
//   2024-03  rows   8  income   205500  expenses    63384  saved   142116
//
// March pace (line end 31) against February (29 days). Spent by comparison day: March 63384, February 72875.
//   day  1  selected       0  previous       0
//   day  2  selected    5875  previous       0
//   day  3  selected    5875  previous    6410
//   day  4  selected    5875  previous    6410
//   day  5  selected   53875  previous    6410
//   day  6  selected   53875  previous    6410
//   day  7  selected   53875  previous    6410
//   day  8  selected   53875  previous    6410
//   day  9  selected   53875  previous    6410
//   day 10  selected   53875  previous   54410
//   day 11  selected   53875  previous   54410
//   day 12  selected   55874  previous   54410
//   day 13  selected   55874  previous   54410
//   day 14  selected   55874  previous   62660
//   day 15  selected   55874  previous   62660
//   day 16  selected   55874  previous   62660
//   day 17  selected   55874  previous   62660
//   day 18  selected   58124  previous   62660
//   day 19  selected   58124  previous   62660
//   day 20  selected   58124  previous   65450
//   day 21  selected   58124  previous   65450
//   day 22  selected   58124  previous   65450
//   day 23  selected   58124  previous   65450
//   day 24  selected   58124  previous   65450
//   day 25  selected   58124  previous   65450
//   day 26  selected   58124  previous   65450
//   day 27  selected   58124  previous   65450
//   day 28  selected   58124  previous   68750
//   day 29  selected   61174  previous   72875
//   day 30  selected   63384  previous   72875
//   day 31  selected   63384  previous   72875
//
// March (by day 30) against February (by day 29), per expense category:
//   food       mar    8085  feb    9710  change   -1625
//   health     mar    1999  feb    2790  change    -791
//   housing    mar   48000  feb   48000  change       0
//   leisure    mar    2250  feb    8250  change   -6000
//   transport  mar    3050  feb    4125  change   -1075

const inputs2024: TransactionInput[] = [
  { type: 'income', amountCents: 198000, date: '2024-01-02', category: 'salary', note: null },
  { type: 'expense', amountCents: 5320, date: '2024-01-04', category: 'food', note: null },
  { type: 'expense', amountCents: 48000, date: '2024-01-09', category: 'housing', note: null },
  { type: 'expense', amountCents: 2150, date: '2024-01-15', category: 'transport', note: null },
  { type: 'expense', amountCents: 7935, date: '2024-01-22', category: 'bills', note: null },
  { type: 'expense', amountCents: 3499, date: '2024-01-30', category: 'leisure', note: null },
  { type: 'income', amountCents: 198000, date: '2024-02-01', category: 'salary', note: null },
  { type: 'expense', amountCents: 6410, date: '2024-02-03', category: 'food', note: null },
  { type: 'expense', amountCents: 48000, date: '2024-02-10', category: 'housing', note: null },
  { type: 'expense', amountCents: 8250, date: '2024-02-14', category: 'leisure', note: null },
  { type: 'expense', amountCents: 2790, date: '2024-02-20', category: 'health', note: null },
  { type: 'expense', amountCents: 3300, date: '2024-02-28', category: 'food', note: null },
  { type: 'expense', amountCents: 4125, date: '2024-02-29', category: 'transport', note: null },
  { type: 'income', amountCents: 198000, date: '2024-03-01', category: 'salary', note: null },
  { type: 'expense', amountCents: 5875, date: '2024-03-02', category: 'food', note: null },
  { type: 'expense', amountCents: 48000, date: '2024-03-05', category: 'housing', note: null },
  { type: 'expense', amountCents: 1999, date: '2024-03-12', category: 'health', note: null },
  { type: 'expense', amountCents: 2250, date: '2024-03-18', category: 'leisure', note: null },
  { type: 'expense', amountCents: 3050, date: '2024-03-29', category: 'transport', note: null },
  { type: 'expense', amountCents: 2210, date: '2024-03-30', category: 'food', note: null },
  { type: 'income', amountCents: 7500, date: '2024-03-31', category: 'gifts', note: null },
  { type: 'expense', amountCents: 1111, date: '2024-01-31', category: 'other', note: null },
];

const paceMarch2024: PaceExpectation = {
  selected: { month: { year: 2024, month: 3 }, cumulativeCents: [
    0, 5875, 5875, 5875, 53875, 53875, 53875, 53875, 53875, 53875, 53875,
    55874, 55874, 55874, 55874, 55874, 55874, 58124, 58124, 58124, 58124,
    58124, 58124, 58124, 58124, 58124, 58124, 58124, 61174, 63384, 63384,
  ] },
  previous: { month: { year: 2024, month: 2 }, cumulativeCents: [
    0, 0, 6410, 6410, 6410, 6410, 6410, 6410, 6410, 54410, 54410, 54410, 54410,
    62660, 62660, 62660, 62660, 62660, 62660, 65450, 65450, 65450, 65450,
    65450, 65450, 65450, 65450, 68750, 72875,
  ] },
  chartDays: 31,
  comparisonDay: 30,
  sentence: { kind: 'less', differenceCents: 9491, comparisonDay: 30, previousMonth: { year: 2024, month: 2 } },
  details: [
    { day: 1, selectedCents: 0, previousCents: 0, change: { differenceCents: 0, percent: { rounded: 0, sign: 0 } } },
    { day: 2, selectedCents: 5875, previousCents: 0, change: { differenceCents: 5875, percent: 'new' } },
    { day: 28, selectedCents: 58124, previousCents: 68750, change: { differenceCents: -10626, percent: { rounded: -15, sign: -1 } } },
    { day: 29, selectedCents: 61174, previousCents: 72875, change: { differenceCents: -11701, percent: { rounded: -16, sign: -1 } } },
    { day: 30, selectedCents: 63384, previousCents: 72875, change: { differenceCents: -9491, percent: { rounded: -13, sign: -1 } } },
    { day: 31, selectedCents: 63384, previousCents: 72875, change: { differenceCents: -9491, percent: { rounded: -13, sign: -1 } } },
  ],
};

const categoriesMarch2024: CategoryExpectation = { kind: 'changes', comparisonDay: 30, rows: [
    { category: 'housing', currentCents: 48000, previousCents: 48000, changeCents: 0, percent: { rounded: 0, sign: 0 } },
    { category: 'health', currentCents: 1999, previousCents: 2790, changeCents: -791, percent: { rounded: -28, sign: -1 } },
    { category: 'transport', currentCents: 3050, previousCents: 4125, changeCents: -1075, percent: { rounded: -26, sign: -1 } },
    { category: 'food', currentCents: 8085, previousCents: 9710, changeCents: -1625, percent: { rounded: -17, sign: -1 } },
    { category: 'leisure', currentCents: 2250, previousCents: 8250, changeCents: -6000, percent: { rounded: -73, sign: -1 } },
  ] };

const trendMarch2024: TrendExpectation = { months: [
    { month: { year: 2023, month: 10 }, hasData: false, incomeCents: 0, expenseCents: 0, savedCents: 0, rate: null },
    { month: { year: 2023, month: 11 }, hasData: false, incomeCents: 0, expenseCents: 0, savedCents: 0, rate: null },
    { month: { year: 2023, month: 12 }, hasData: false, incomeCents: 0, expenseCents: 0, savedCents: 0, rate: null },
    { month: { year: 2024, month: 1 }, hasData: true, incomeCents: 198000, expenseCents: 68015, savedCents: 129985, rate: { rounded: 66, sign: 1 } },
    { month: { year: 2024, month: 2 }, hasData: true, incomeCents: 198000, expenseCents: 72875, savedCents: 125125, rate: { rounded: 63, sign: 1 } },
    { month: { year: 2024, month: 3 }, hasData: true, incomeCents: 205500, expenseCents: 63384, savedCents: 142116, rate: { rounded: 69, sign: 1 } },
  ], monthsWithData: 3, totalSavedCents: 397226, rate: { rounded: 66, sign: 1 } };

export const insightsReference2024 = {
  today: '2024-03-30' as IsoDate,
  inputs: inputs2024,
  edits: [] as InsightsEdit[],
  expected: {
    paceMarch: paceMarch2024,
    categoriesMarch: categoriesMarch2024,
    trendMarch: trendMarch2024,
  },
};
