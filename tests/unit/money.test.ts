import {
  currencyPosition,
  formatAmountForInput,
  formatMoney,
  formatSignedMoney,
  formSeparator,
  formatSignedDifference,
  spokenMoney,
  spokenSignedDifference,
} from '@/format/money';

// Expected strings are the Hermes outputs recorded in device-checks.md.
const NBSP = ' ';
const RLM = '‏';
const LRM = '‎';

describe('formatMoney', () => {
  it.each([
    [0, `0,00${NBSP}€`],
    [-50, `-0,50${NBSP}€`],
    [-15000, `-150,00${NBSP}€`],
    [123400, `1.234,00${NBSP}€`], // the phone groups 4 digits, Node's CLDR would not
    [-123400, `-1.234,00${NBSP}€`],
    [99999999, `999.999,99${NBSP}€`],
    [1234567801, `12.345.678,01${NBSP}€`], // month totals can exceed the per-transaction max
  ])('es-ES %i → %s', (cents, expected) => {
    expect(formatMoney(cents, 'es-ES')).toBe(expected);
  });

  it.each(['en-GB', 'en-US'])('%s puts the sign before the € with no space', (tag) => {
    expect(formatMoney(0, tag)).toBe('€0.00');
    expect(formatMoney(-50, tag)).toBe('-€0.50');
    expect(formatMoney(-15000, tag)).toBe('-€150.00');
    expect(formatMoney(99999999, tag)).toBe('€999,999.99');
    expect(formatMoney(1234567801, tag)).toBe('€12,345,678.01');
  });

  it('en-IE', () => {
    expect(formatMoney(123456, 'en-IE')).toBe('€1,234.56');
    expect(formatMoney(-50, 'en-IE')).toBe('-€0.50');
  });

  it('ar-EG keeps Latin digits, `.` decimals and the direction marks', () => {
    expect(formatMoney(0, 'ar-EG')).toBe(`${RLM}0.00${NBSP}€`);
    expect(formatMoney(-50, 'ar-EG')).toBe(`${RLM}${LRM}-0.50${NBSP}€`);
    expect(formatMoney(-123400, 'ar-EG')).toBe(`${RLM}${LRM}-1,234.00${NBSP}€`);
    expect(formatMoney(99999999, 'ar-EG')).toBe(`${RLM}999,999.99${NBSP}€`);
  });

  it('es-US shows the € sign, not the ISO code, with the region\'s separators (FR-029)', () => {
    expect(formatMoney(123400, 'es-US')).toBe('€1,234.00');
    expect(formatMoney(-100, 'es-US')).toBe('-€1.00');
    expect(formatMoney(-50, 'es-US')).toBe('-€0.50');
    expect(formatSignedMoney(1250, 'income', 'es-US')).toBe('+€12.50');
    expect(spokenMoney(-123400, 'es-US')).toBe('minus €1,234.00');
  });

  it('pads single-digit cents', () => {
    expect(formatMoney(105, 'es-ES')).toBe(`1,05${NBSP}€`);
    expect(formatMoney(1, 'en-GB')).toBe('€0.01');
  });
});

describe('formatSignedMoney', () => {
  it('adds + for income and - for expense, from Intl sign parts', () => {
    expect(formatSignedMoney(1250, 'income', 'es-ES')).toBe(`+12,50${NBSP}€`);
    expect(formatSignedMoney(1250, 'expense', 'es-ES')).toBe(`-12,50${NBSP}€`);
    expect(formatSignedMoney(50, 'income', 'es-ES')).toBe(`+0,50${NBSP}€`);
    expect(formatSignedMoney(50, 'expense', 'es-ES')).toBe(`-0,50${NBSP}€`);
    expect(formatSignedMoney(123400, 'expense', 'en-GB')).toBe('-€1,234.00');
    expect(formatSignedMoney(123400, 'income', 'en-GB')).toBe('+€1,234.00');
  });
});

describe('formSeparator', () => {
  it.each([
    ['es-ES', ','],
    ['en-GB', '.'],
    ['en-US', '.'],
    ['en-IE', '.'],
    ['ar-EG', '.'],
  ])('%s → %s', (tag, sep) => {
    expect(formSeparator(tag)).toBe(sep);
  });
});

describe('formatAmountForInput', () => {
  it('has no grouping and no €, and uses the form separator', () => {
    expect(formatAmountForInput(123450, 'es-ES')).toBe('1234,50');
    expect(formatAmountForInput(99999999, 'es-ES')).toBe('999999,99');
    expect(formatAmountForInput(5, 'en-GB')).toBe('0.05');
    expect(formatAmountForInput(123400, 'ar-EG')).toBe('1234.00');
  });
});

describe('spokenMoney', () => {
  it('says "minus" instead of a sign', () => {
    expect(spokenMoney(-15000, 'es-ES')).toBe(`minus 150,00${NBSP}€`);
    expect(spokenMoney(-50, 'en-GB')).toBe('minus €0.50');
    expect(spokenMoney(200000, 'es-ES')).toBe(`2.000,00${NBSP}€`);
  });
});

describe('currencyPosition', () => {
  it.each([
    ['es-ES', 'after'],
    ['en-IE', 'before'],
    ['en-GB', 'before'],
    ['ar-EG', 'after'],
    ['es-US', 'before'],
  ])('%s → %s', (tag, position) => {
    expect(currencyPosition(tag)).toBe(position);
  });
});

describe('formatSignedDifference (002)', () => {
  it.each([
    ['es-ES', 6_000, `+60,00${NBSP}€`],
    ['es-ES', -3_000, `-30,00${NBSP}€`],
    ['es-ES', 0, `0,00${NBSP}€`],
    ['es-ES', 50, `+0,50${NBSP}€`],
    ['es-ES', -1, `-0,01${NBSP}€`],
    ['es-ES', 99_999_999_999, `+999.999.999,99${NBSP}€`],
    ['es-ES', -599_999_999_994, `-5.999.999.999,94${NBSP}€`],
    ['en-GB', 123_400, '+€1,234.00'],
    ['en-GB', -123_400, '-€1,234.00'],
    ['en-GB', 0, '€0.00'],
    ['en-US', -5_050, '-€50.50'],
    ['en-US', 0, '€0.00'],
    ['es-US', 1_250, '+€12.50'],
    ['es-US', -599_999_999_994, '-€5,999,999,999.94'],
  ])('%s %d → %s', (tag, cents, expected) => {
    expect(formatSignedDifference(cents, tag)).toBe(expected);
  });
});

describe('spokenSignedDifference (002)', () => {
  it('says "plus" and "minus" instead of signs, nothing at 0', () => {
    expect(spokenSignedDifference(6_000, 'es-ES')).toBe(`plus 60,00${NBSP}€`);
    expect(spokenSignedDifference(-3_000, 'es-ES')).toBe(`minus 30,00${NBSP}€`);
    expect(spokenSignedDifference(0, 'es-ES')).toBe(`0,00${NBSP}€`);
    expect(spokenSignedDifference(-599_999_999_994, 'es-ES')).toBe(
      `minus 5.999.999.999,94${NBSP}€`,
    );
    expect(spokenSignedDifference(99_999_999_999, 'en-GB')).toBe('plus €999,999,999.99');
    expect(spokenSignedDifference(-123_400, 'en-US')).toBe('minus €1,234.00');
    expect(spokenSignedDifference(1_250, 'es-US')).toBe('plus €12.50');
  });
});
