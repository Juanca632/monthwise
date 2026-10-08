import type { YearMonth } from '@/domain/month';
import type { Pace } from '@/domain/pace';
import { dropPace, handOffPace, takePace } from '@/state/handedPace';

const OCT: YearMonth = { year: 2026, month: 10 };
const paceOf = (month: YearMonth): Pace => ({
  selected: { month, cumulativeCents: [100] },
  previous: null,
  chartDays: 31,
  comparisonDay: null,
  sentence: { kind: 'noSpending' },
});

afterEach(dropPace);

describe('handedPace', () => {
  it('returns nothing before a hand-off', () => {
    expect(takePace(OCT)).toBeNull();
  });

  it('returns the pace and press time for the same month', () => {
    const pace = paceOf(OCT);
    handOffPace(pace, 1234);
    expect(takePace({ year: 2026, month: 10 })).toEqual({ pace, pressedAt: 1234 });
  });

  it('returns nothing for another month, including the same month of another year', () => {
    handOffPace(paceOf(OCT), 1);
    expect(takePace({ year: 2026, month: 9 })).toBeNull();
    expect(takePace({ year: 2025, month: 10 })).toBeNull();
  });

  it('a new hand-off replaces the old one', () => {
    handOffPace(paceOf(OCT), 1);
    const september = paceOf({ year: 2026, month: 9 });
    handOffPace(september, 2);
    expect(takePace(OCT)).toBeNull();
    expect(takePace({ year: 2026, month: 9 })).toEqual({ pace: september, pressedAt: 2 });
  });

  it('dropPace clears it', () => {
    handOffPace(paceOf(OCT), 1);
    dropPace();
    expect(takePace(OCT)).toBeNull();
  });
});
