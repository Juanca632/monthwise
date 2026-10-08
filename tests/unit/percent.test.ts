import { percentOf } from '@/domain/percent';

describe('percentOf', () => {
  it('rounds half away from zero on both signs', () => {
    expect(percentOf(3_000, 8_000)).toEqual({ rounded: 38, sign: 1 }); // 37.5 %
    expect(percentOf(-3_000, 8_000)).toEqual({ rounded: -38, sign: -1 }); // -37.5 %
    expect(percentOf(-600, 8_000)).toEqual({ rounded: -8, sign: -1 }); // -7.5 %
    expect(percentOf(1, 200)).toEqual({ rounded: 1, sign: 1 }); // 0.5 %
    expect(percentOf(-1, 200)).toEqual({ rounded: -1, sign: -1 }); // -0.5 %
  });

  it('rounds values under 0.5 % to 0 but keeps their sign', () => {
    expect(percentOf(2, 500)).toEqual({ rounded: 0, sign: 1 }); // 0.4 %
    const negative = percentOf(-2, 500); // -0.4 %
    expect(negative).toEqual({ rounded: 0, sign: -1 });
    expect(Object.is(negative.rounded, 0)).toBe(true);
    expect(Object.is(percentOf(-1, 100_000).rounded, 0)).toBe(true);
  });

  it('gives 0 with no sign when the part is 0', () => {
    expect(percentOf(0, 5)).toEqual({ rounded: 0, sign: 0 });
    expect(Object.is(percentOf(0, 5).rounded, 0)).toBe(true);
  });

  it('keeps exact percents exact', () => {
    expect(percentOf(1_500, 10_000)).toEqual({ rounded: 15, sign: 1 });
    expect(percentOf(-1_500, 10_000)).toEqual({ rounded: -15, sign: -1 });
    expect(percentOf(8_000, 8_000)).toEqual({ rounded: 100, sign: 1 });
    expect(percentOf(16_000, 8_000)).toEqual({ rounded: 200, sign: 1 });
  });

  it('just below and above .5 round to the nearer whole', () => {
    expect(percentOf(37_499, 100_000)).toEqual({ rounded: 37, sign: 1 }); // 37.499 %
    expect(percentOf(37_501, 100_000)).toEqual({ rounded: 38, sign: 1 }); // 37.501 %
    expect(percentOf(-37_499, 100_000)).toEqual({ rounded: -37, sign: -1 });
  });

  it("stays exact at FR-022's largest totals", () => {
    expect(percentOf(599_999_999_994, 599_999_999_994)).toEqual({ rounded: 100, sign: 1 });
    expect(percentOf(1, 599_999_999_994)).toEqual({ rounded: 0, sign: 1 });
    expect(percentOf(-599_999_999_994, 599_999_999_994)).toEqual({ rounded: -100, sign: -1 });
    // 299,999,999,997 / 599,999,999,994 is exactly 50 %.
    expect(percentOf(299_999_999_997, 599_999_999_994)).toEqual({ rounded: 50, sign: 1 });
    // The largest change: from 1 cent to the six-month bound.
    expect(percentOf(599_999_999_993, 1)).toEqual({ rounded: 59_999_999_999_300, sign: 1 });
  });
});
