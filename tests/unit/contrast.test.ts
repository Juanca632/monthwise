import { cardTones, palettes, type BalanceTone, type Scheme } from '@/ui/theme';

// theme.ts reads whether the font is loaded; that needs native modules Jest does not have.
jest.mock('expo-font', () => ({ isLoaded: () => true }));

// design.md, "Contrast over glass": every ratio is computed by blending the translucent layers over
// what sits under them, at the ambient glow's peak (the worst case), from the theme's own tokens.

type Rgba = { r: number; g: number; b: number; a: number };

function parse(color: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: n >> 16, g: (n >> 8) & 0xff, b: n & 0xff, a: 1 };
  }
  const rgba = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(color);
  if (!rgba) throw new Error(`Unknown color ${color}`);
  return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: +rgba[4] };
}

/** The colors in a gradient string, in order. */
function stops(gradient: string): string[] {
  return gradient.match(/#[0-9a-f]{6}|rgba\([^)]*\)/gi) ?? [];
}

/** `layers` from the bottom up; the first must be opaque. */
function blend(...layers: string[]): Rgba {
  const [base, ...rest] = layers.map(parse);
  if (base.a !== 1) throw new Error('The bottom layer must be opaque');
  return rest.reduce(
    (under, top) => ({
      r: top.r * top.a + under.r * (1 - top.a),
      g: top.g * top.a + under.g * (1 - top.a),
      b: top.b * top.a + under.b * (1 - top.a),
      a: 1,
    }),
    base,
  );
}

function luminance({ r, g, b }: Rgba): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function ratio(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5;
const INDICATOR = 3;
const schemes: Scheme[] = ['light', 'dark'];
const tones: BalanceTone[] = ['positive', 'negative'];

describe.each(schemes)('%s summary at the glow peak', (scheme) => {
  const c = palettes[scheme];

  it.each(tones)('list and breakdown cards keep text and muted text readable (%s month)', (tone) => {
    const card = blend(c.background, cardTones[scheme][tone].ambientTop, c.glassFill);
    expect(ratio(parse(c.text), card)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(parse(c.textMuted), card)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(parse(c.income), blend(c.background, cardTones[scheme][tone].ambientTop, c.glassFill, c.incomeSoft))).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(tones)('the %s balance card keeps its label, amount and ink readable', (tone) => {
    const t = cardTones[scheme][tone];
    // Each end of the card's gradient, then a stat pill on top of it.
    for (const stop of stops(t.cardGlass)) {
      const card = blend(c.background, t.ambientTop, stop);
      const pill = blend(c.background, t.ambientTop, stop, c.glassFillStrong);
      expect(ratio(parse(t.cardLabel), card)).toBeGreaterThanOrEqual(TEXT);
      expect(ratio(parse(t.cardAmount), card)).toBeGreaterThanOrEqual(TEXT);
      expect(ratio(parse(t.cardInk), card)).toBeGreaterThanOrEqual(TEXT);
      expect(ratio(parse(t.cardLabel), pill)).toBeGreaterThanOrEqual(TEXT);
      expect(ratio(parse(t.cardInk), pill)).toBeGreaterThanOrEqual(TEXT);
    }
  });

  it.each(tones)('day headers stay readable on the background at the glow peak (%s month)', (tone) => {
    const peak = blend(c.background, cardTones[scheme][tone].ambientTop);
    // textMuted (4.1:1) and income (4.4:1) fall short in light here, so the headers use text.
    expect(ratio(parse(c.text), peak)).toBeGreaterThanOrEqual(TEXT);
  });

  it('the banner keeps its message and Dismiss readable', () => {
    const banner = blend(c.background, cardTones[scheme].positive.ambientTop, c.bannerFill);
    expect(ratio(parse(c.text), banner)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(parse(c.accent), banner)).toBeGreaterThanOrEqual(TEXT);
  });
});

describe.each(schemes)('%s form (flat look on formBackground)', (scheme) => {
  const c = palettes[scheme];

  it('focus and error borders stand out from a field (≥ 3:1)', () => {
    for (const border of [c.accent, c.error]) {
      expect(ratio(parse(border), parse(c.surfaceMuted))).toBeGreaterThanOrEqual(INDICATOR);
      expect(ratio(parse(border), parse(c.formBackground))).toBeGreaterThanOrEqual(INDICATOR);
    }
  });

  it('text and muted text stay readable on a field and on the sheet', () => {
    for (const fill of [c.surfaceMuted, c.formBackground]) {
      expect(ratio(parse(c.text), parse(fill))).toBeGreaterThanOrEqual(TEXT);
      expect(ratio(parse(c.textMuted), parse(fill))).toBeGreaterThanOrEqual(TEXT);
    }
  });

  it('the selected segment border stands out from its fill and the track (≥ 3:1)', () => {
    expect(ratio(parse(c.accent), parse(c.segmentSelected))).toBeGreaterThanOrEqual(INDICATOR);
    expect(ratio(parse(c.accent), parse(c.segmentTrack))).toBeGreaterThanOrEqual(INDICATOR);
    expect(ratio(parse(c.text), parse(c.segmentSelected))).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(parse(c.textMuted), parse(c.segmentTrack))).toBeGreaterThanOrEqual(TEXT);
  });

  it('the error screen\'s Try again border stands out from the background (≥ 3:1)', () => {
    expect(ratio(blend(c.background, c.fieldBorder), parse(c.background))).toBeGreaterThanOrEqual(INDICATOR);
  });

  it('accent buttons keep onAccent text readable at every gradient stop', () => {
    const gradient = stops(c.accentGradient);
    expect(gradient).toHaveLength(2);
    for (const stop of gradient) {
      expect(ratio(parse(c.onAccent), parse(stop))).toBeGreaterThanOrEqual(TEXT);
    }
    // The selected chip is plain accent.
    expect(ratio(parse(c.onAccent), parse(c.accent))).toBeGreaterThanOrEqual(TEXT);
  });
});
