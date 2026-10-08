import {
  barScale,
  dayAtX,
  linePath,
  lineScale,
  seriesPoints,
  xOfDay,
} from '@/ui/charts/geometry';

// The headroom comes from theme.ts, which reads whether the font is loaded (native in the app).
jest.mock('expo-font', () => ({ isLoaded: () => true }));

describe('dayAtX (contracts/ui-screens.md, Touch)', () => {
  it.each([
    [0, 1],
    [75, 8],
    [79.99, 8],
    [80, 9],
    [-5, 1],
    [309.99, 31],
    [310, 31],
    [400, 31],
  ])('x = %p on a 310 dp chart of 31 days is day %p', (x, day) => {
    expect(dayAtX(x, 310, 31)).toBe(day);
  });

  it('a chart not measured yet (width 0) gives day 1', () => {
    expect(dayAtX(50, 0, 31)).toBe(1);
  });
});

describe('xOfDay', () => {
  it('puts each day at its band center, and dayAtX maps it back', () => {
    expect(xOfDay(1, 310, 31)).toBe(5);
    expect(xOfDay(31, 310, 31)).toBe(305);
    for (let day = 1; day <= 31; day++) expect(dayAtX(xOfDay(day, 310, 31), 310, 31)).toBe(day);
  });
});

describe('lineScale and seriesPoints', () => {
  it('leaves 8 % headroom above the largest value', () => {
    const scale = lineScale(10_000, 108);
    expect(10_000 * scale).toBeCloseTo(100);
  });

  it('an all-zero series lies on the baseline', () => {
    const scale = lineScale(0, 168);
    expect(scale).toBe(0);
    const points = seriesPoints([0, 0, 0], 310, 168, scale, 31, 12);
    expect(points.map((p) => p.y)).toEqual([180, 180, 180]);
  });

  it('maps cents to y from the plot top', () => {
    const scale = lineScale(5_000, 108);
    const [a, b] = seriesPoints([0, 5_000], 310, 108, scale, 31, 12);
    expect(a).toEqual({ x: 5, y: 120 });
    expect(b.x).toBe(15);
    expect(b.y).toBeCloseTo(20);
  });

  it('draws straight segments from day 1', () => {
    expect(linePath([{ x: 5, y: 10 }, { x: 15, y: 4 }])).toBe('M5 10 L15 4');
    expect(linePath([])).toBe('');
  });
});

describe('barScale (trend)', () => {
  it('all positive: zero line at the bottom, 4 % headroom on top', () => {
    const s = barScale([10_000, 5_000], 104);
    expect(s.zeroY).toBeCloseTo(104);
    expect(10_000 * s.unit).toBeCloseTo(100);
  });

  it('all negative: zero line at the top, 25 % room below', () => {
    const s = barScale([-4_000, -1_000], 100);
    expect(s.zeroY).toBe(0);
    expect(4_000 * s.unit).toBeCloseTo(80);
  });

  it('mixed: zero falls where both ranges meet', () => {
    // Above: 10 000 × 1.04 = 10 400; below: 4 000 × 1.25 = 5 000; span 15 400.
    const s = barScale([10_000, -4_000, 2_000], 154);
    expect(s.unit).toBeCloseTo(0.01);
    expect(s.zeroY).toBeCloseTo(104);
  });

  it('all zero: zero line at the bottom, nothing drawn', () => {
    expect(barScale([0, 0, 0], 160)).toEqual({ zeroY: 160, unit: 0 });
    expect(barScale([], 160)).toEqual({ zeroY: 160, unit: 0 });
  });
});
