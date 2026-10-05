import { formatNumericDate, formatSpokenDate, monthTitle } from '@/format/date';

const RLM = '‏';

describe('formatNumericDate', () => {
  // Expected strings are the Hermes outputs recorded in device-checks.md.
  it.each([
    ['es-ES', '30/09/2026'],
    ['en-GB', '30/09/2026'],
    ['en-ES', '30/09/2026'],
    ['es-US', '30/09/2026'],
    ['en-US', '09/30/2026'],
    ['ar-EG', `30${RLM}/09${RLM}/2026`],
  ])('%s → %s', (tag, expected) => {
    expect(formatNumericDate('2026-09-30', tag)).toBe(expected);
  });

  it('pads single-digit days and months, and keeps the earliest allowed day', () => {
    expect(formatNumericDate('2000-01-01', 'es-ES')).toBe('01/01/2000');
  });
});

describe('formatSpokenDate', () => {
  it('uses English month names and no leading zero', () => {
    expect(formatSpokenDate('2026-09-30')).toBe('30 September 2026');
    expect(formatSpokenDate('2026-01-05')).toBe('5 January 2026');
    expect(formatSpokenDate('2026-12-31')).toBe('31 December 2026');
  });
});

describe('monthTitle', () => {
  it('names the month in English', () => {
    expect(monthTitle({ year: 2026, month: 10 })).toBe('October 2026');
    expect(monthTitle({ year: 2000, month: 1 })).toBe('January 2000');
    expect(monthTitle({ year: 2026, month: 12 })).toBe('December 2026');
  });
});
