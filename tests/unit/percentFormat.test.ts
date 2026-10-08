import type { Percent } from '@/domain/percent';
import {
  formatChangePercent,
  formatRate,
  spokenChangePercent,
  spokenRate,
} from '@/format/percent';

const p = (rounded: number, sign: Percent['sign']): Percent => ({ rounded, sign });

// Every example in contracts/ui-screens.md, Notation.
describe('change percent', () => {
  it.each<[Percent | 'new', string, string]>([
    [p(30, 1), '+30%', 'plus 30 percent'],
    [p(-38, -1), '-38%', 'minus 38 percent'],
    [p(0, 1), '+<1%', 'plus less than 1 percent'],
    [p(0, -1), '-<1%', 'minus less than 1 percent'],
    [p(0, 0), '0%', '0 percent'],
    ['new', 'New', 'new'],
  ])('%j → %s / %s', (value, text, spoken) => {
    expect(formatChangePercent(value)).toBe(text);
    expect(spokenChangePercent(value)).toBe(spoken);
  });
});

describe('rate', () => {
  it.each<[Percent | null, string, string]>([
    [p(15, 1), '15%', '15 percent'],
    [p(-8, -1), '-8%', 'minus 8 percent'],
    [p(0, 1), '<1%', 'less than 1 percent'],
    [p(0, -1), '-<1%', 'minus less than 1 percent'],
    [p(0, 0), '0%', '0 percent'],
    [null, 'No income', 'no income'],
    [p(100, 1), '100%', '100 percent'],
    [p(-250, -1), '-250%', 'minus 250 percent'],
  ])('%j → %s / %s', (value, text, spoken) => {
    expect(formatRate(value)).toBe(text);
    expect(spokenRate(value)).toBe(spoken);
  });
});
