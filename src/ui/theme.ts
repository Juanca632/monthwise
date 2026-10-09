// Every visual token from design.md, so components never hard-code a color or size.
import * as Font from 'expo-font';
import { useColorScheme, useWindowDimensions, type TextStyle } from 'react-native';

import type { ExpenseCategory } from '@/domain/categories';

export type Scheme = 'light' | 'dark';

export type Palette = {
  background: string;
  surface: string;
  formBackground: string;
  surfaceMuted: string;
  segmentTrack: string;
  segmentSelected: string;
  avatar: string;
  divider: string;
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  /** Text on `error` (the dialog's destructive button). */
  onError: string;
  accentSoft: string;
  income: string;
  incomeSoft: string;
  error: string;
  underlineIdle: string;
  ripple: string;
  rippleOnAccent: string;
  // Glass surfaces (design.md). The solid tokens above stay as fallbacks where a gradient cannot
  // be drawn.
  ambientBottom: string;
  glassFill: string;
  glassFillStrong: string;
  glassBorder: string;
  glassBorderStrong: string;
  glassHighlight: string;
  /** A `boxShadow` value. */
  glassShadow: string;
  glassDivider: string;
  glassAvatar: string;
  /** An `experimental_backgroundImage` value; light is a flat white. */
  sheetFill: string;
  fieldFill: string;
  fieldBorder: string;
  scrim: string;
  /** The Add fill, an `experimental_backgroundImage` value (Save is flat). */
  accentGradient: string;
  accentBorder: string;
  /** The banner's tint: `accentSoft`, at 60 % in dark (Components table). */
  bannerFill: string;
  /** The 96 dp fade behind Add, an `experimental_backgroundImage` value. */
  bottomFade: string;
  /** An edited row's flash: `accent` at 22 % (Motion, "Saved"). */
  rowFlash: string;
  /**
   * The category tiles' shadow, small so neighbors 12 dp apart never merge; none in dark, where
   * the lighter surface already lifts them (fine-tuning 2026-10-06). Empty means no shadow.
   */
  tileShadow: string;
  // Charts (002 design.md, Color). The current month is the strong mark; what it is compared with
  // is quiet, and the two are told apart by style, never by color alone (FR-002).
  /** The selected month's line, markers and positive saved marks: an alias of `accent`. */
  chartCurrent: string;
  /** The top of the fill under the selected month's line; it fades to 0 % at the baseline. */
  chartArea: string;
  /** The previous month's dashed line and marker; the expenses bar's outline. */
  chartPrevious: string;
  chartGrid: string;
  chartAxis: string;
  /** The trend's zero line: it carries meaning (saved below zero), so it keeps 3:1. */
  chartZero: string;
  chartBand: string;
  chartGuide: string;
  /** The one "inset on a card" fill: detail boxes, picker cells and buttons, the neutral pill. */
  insetFill: string;
  /** The percent pill of a category that went up. */
  errorSoft: string;
};

/** `#RRGGBB` at an opacity, written the way design.md gives it ("`#2F5BEA` at 22 %"). */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** The 1 dp inner top highlight of glass surfaces, a `boxShadow` value. */
export const insetHighlight = (color: string) => `inset 0 1px 0 ${color}`;
const DARK_GLASS_SHADOW = `0 20px 40px ${withAlpha('#000000', 0.35)}`;
const verticalGradient = (top: string, bottom: string) =>
  `linear-gradient(180deg, ${top}, ${bottom})`;

// One source for the accent, which the charts' current-month tokens alias (002 design.md).
const ACCENT: Record<Scheme, string> = { light: '#2F5BEA', dark: '#7D96FF' };

export const palettes: Record<Scheme, Palette> = {
  light: {
    // A plain grouped background; white sections sit on it (fine-tuning 2026-10-06).
    background: '#F2F3F7',
    surface: '#FFFFFF',
    formBackground: '#FFFFFF',
    surfaceMuted: '#F1F3F6',
    segmentTrack: '#F1F3F6',
    segmentSelected: '#FFFFFF',
    avatar: '#F1F3F6',
    divider: '#EEF0F3',
    text: '#0E1116',
    textMuted: '#5B6472',
    accent: ACCENT.light,
    onAccent: '#FFFFFF',
    onError: '#FFFFFF',
    accentSoft: '#EAF0FF',
    income: '#0B6B5E',
    incomeSoft: '#E3F4EE',
    error: '#B3362A',
    underlineIdle: '#8A93A3',
    ripple: withAlpha('#5B6472', 0.12),
    rippleOnAccent: withAlpha('#FFFFFF', 0.2),
    ambientBottom: withAlpha('#12B886', 0.22),
    glassFill: withAlpha('#FFFFFF', 0.72),
    glassFillStrong: withAlpha('#FFFFFF', 0.85),
    glassBorder: withAlpha('#FFFFFF', 0.95),
    glassBorderStrong: withAlpha('#0E1116', 0.06),
    glassHighlight: '#FFFFFF',
    glassShadow: `0 8px 24px ${withAlpha('#0E1116', 0.05)}`,
    glassDivider: withAlpha('#0E1116', 0.06),
    glassAvatar: '#F1F3F6',
    sheetFill: verticalGradient('#FFFFFF', '#FFFFFF'),
    fieldFill: withAlpha('#0E1116', 0.06),
    fieldBorder: '#7D8696',
    scrim: withAlpha('#000000', 0.45),
    // Add matches the balance card's gradient.
    accentGradient: 'linear-gradient(135deg, #3B5BDB, #6741D9)',
    accentBorder: withAlpha('#FFFFFF', 0.18),
    bannerFill: '#EAF0FF',
    bottomFade: verticalGradient(withAlpha('#F2F3F7', 0), withAlpha('#F2F3F7', 0.6)),
    rowFlash: withAlpha('#2F5BEA', 0.22),
    tileShadow: `0 2px 8px ${withAlpha('#0E1116', 0.06)}`,
    chartCurrent: ACCENT.light,
    chartArea: withAlpha(ACCENT.light, 0.22),
    chartPrevious: '#7D8696',
    chartGrid: withAlpha('#0E1116', 0.07),
    chartAxis: withAlpha('#0E1116', 0.28),
    chartZero: withAlpha('#0E1116', 0.5),
    chartBand: withAlpha(ACCENT.light, 0.1),
    chartGuide: withAlpha('#0E1116', 0.32),
    // Equal to surfaceMuted on purpose: in light it already reads as an inset on a white card.
    insetFill: '#F1F3F6',
    errorSoft: withAlpha('#B3362A', 0.12),
  },
  dark: {
    // Near-black and plain; sections are clearly lighter, as in professional dark apps: what is
    // closer to you is lighter (fine-tuning 2026-10-06).
    background: '#07080A',
    surface: '#1B1D24',
    formBackground: '#0D0F13',
    surfaceMuted: '#1A1E26',
    segmentTrack: '#171A21',
    // A light glass drop on the track (fine-tuning 2026-10-06).
    segmentSelected: withAlpha('#FFFFFF', 0.16),
    avatar: '#232833',
    divider: '#2A2D36',
    text: '#F2F4F7',
    textMuted: '#B0B8C6',
    accent: ACCENT.dark,
    onAccent: '#0D0F13',
    onError: '#0D0F13',
    accentSoft: '#1E2640',
    income: '#45D3A8',
    incomeSoft: '#12332C',
    error: '#FF8A7A',
    underlineIdle: '#626B7C',
    ripple: withAlpha('#9AA3B2', 0.12),
    rippleOnAccent: withAlpha('#0D0F13', 0.2),
    ambientBottom: withAlpha('#20C997', 0.24),
    glassFill: withAlpha('#FFFFFF', 0.05),
    glassFillStrong: withAlpha('#FFFFFF', 0.08),
    glassBorder: withAlpha('#FFFFFF', 0.1),
    glassBorderStrong: withAlpha('#FFFFFF', 0.14),
    glassHighlight: withAlpha('#FFFFFF', 0.1),
    glassShadow: DARK_GLASS_SHADOW,
    glassDivider: withAlpha('#FFFFFF', 0.07),
    glassAvatar: withAlpha('#FFFFFF', 0.07),
    sheetFill: verticalGradient('#1E222E', '#0E1016'),
    fieldFill: withAlpha('#FFFFFF', 0.06),
    fieldBorder: withAlpha('#FFFFFF', 0.38),
    scrim: withAlpha('#000000', 0.45),
    accentGradient: 'linear-gradient(135deg, #364FC7, #5F3DC4)',
    accentBorder: withAlpha('#FFFFFF', 0.18),
    bannerFill: withAlpha('#1E2640', 0.6),
    bottomFade: verticalGradient(withAlpha('#07080A', 0), withAlpha('#07080A', 0.6)),
    rowFlash: withAlpha('#7D96FF', 0.22),
    tileShadow: '',
    chartCurrent: ACCENT.dark,
    chartArea: withAlpha(ACCENT.dark, 0.22),
    chartPrevious: '#7D8696',
    chartGrid: withAlpha('#FFFFFF', 0.07),
    chartAxis: withAlpha('#FFFFFF', 0.28),
    chartZero: withAlpha('#FFFFFF', 0.5),
    chartBand: withAlpha(ACCENT.dark, 0.16),
    chartGuide: withAlpha('#F2F4F7', 0.32),
    // Lighter than surface: the dark surfaceMuted is darker than a card and would vanish on it.
    insetFill: '#262A33',
    errorSoft: withAlpha('#FF8A7A', 0.18),
  },
};

export type BalanceTone = 'positive' | 'negative';

export type CardTone = {
  cardBackground: string;
  cardInk: string;
  cardAmount: string;
  cardLabel: string;
  monthButton: string;
  statPill: string;
  expenseIcon: string;
  /** The 1 dp rim of the white-glass controls on the card. */
  cardRim: string;
  /** The top ambient glow (Glass surfaces, `ambientTop`). */
  ambientTop: string;
  /** The balance card's fill, an `experimental_backgroundImage` value. */
  cardGlass: string;
  /** A `boxShadow` value: `glassShadow`, except the light balance card's own blue shadow. */
  cardShadow: string;
};

/**
 * One deep hue with a soft diagonal sheen, like a metal card (fine-tuning 2026-10-06): `base` at
 * both ends, a lighter `sheen` band across the middle.
 */
const metalCard = (base: string, sheen: string, end: string) =>
  `linear-gradient(135deg, ${base} 0%, ${base} 30%, ${sheen} 48%, ${base} 66%, ${end} 100%)`;

// The balance card is the screen's one vivid element (fine-tuning 2026-10-06): an opaque color
// gradient with white text, so it stands out from the content below. Controls on it are dark
// tinted glass with a white rim: white glass would lift the background and drop the labels under
// 4.5:1. Every stop keeps its text at 4.5:1 or more (contrast test).
const CARD_GLASS = withAlpha('#0A0E28', 0.18);
const WHITE_RIM = withAlpha('#FFFFFF', 0.3);

const metalTones: Record<Scheme, Record<BalanceTone, CardTone>> = {
  light: {
    positive: {
      cardBackground: '#1E2E73',
      cardInk: '#FFFFFF',
      cardAmount: '#FFFFFF',
      cardLabel: '#E7EAFF',
      monthButton: CARD_GLASS,
      statPill: CARD_GLASS,
      cardRim: WHITE_RIM,
      expenseIcon: withAlpha('#FFFFFF', 0.2),
      ambientTop: withAlpha('#3B5BDB', 0.34),
      cardGlass: metalCard('#1E2E73', '#2C43A0', '#15215A'),
      cardShadow: `0 16px 36px ${withAlpha('#1E2E73', 0.35)}`,
    },
    negative: {
      cardBackground: '#6E1A2B',
      cardInk: '#FFFFFF',
      cardAmount: '#FFFFFF',
      cardLabel: '#FFE3E3',
      monthButton: CARD_GLASS,
      statPill: CARD_GLASS,
      cardRim: WHITE_RIM,
      expenseIcon: withAlpha('#FFFFFF', 0.2),
      ambientTop: withAlpha('#E03131', 0.26),
      cardGlass: metalCard('#6E1A2B', '#93283E', '#53121F'),
      cardShadow: `0 16px 36px ${withAlpha('#6E1A2B', 0.35)}`,
    },
  },
  dark: {
    positive: {
      cardBackground: '#1B2A6B',
      cardInk: '#FFFFFF',
      cardAmount: '#FFFFFF',
      cardLabel: '#E7EAFF',
      monthButton: CARD_GLASS,
      statPill: CARD_GLASS,
      cardRim: WHITE_RIM,
      expenseIcon: withAlpha('#FFFFFF', 0.2),
      ambientTop: withAlpha('#5C7CFA', 0.4),
      cardGlass: metalCard('#1B2A6B', '#2A3F97', '#131E50'),
      cardShadow: `0 20px 40px ${withAlpha('#000000', 0.45)}`,
    },
    negative: {
      cardBackground: '#651727',
      cardInk: '#FFFFFF',
      cardAmount: '#FFFFFF',
      cardLabel: '#FFE3E3',
      monthButton: CARD_GLASS,
      statPill: CARD_GLASS,
      cardRim: WHITE_RIM,
      expenseIcon: withAlpha('#FFFFFF', 0.2),
      ambientTop: withAlpha('#FA5252', 0.32),
      cardGlass: metalCard('#651727', '#8A2539', '#4A101C'),
      cardShadow: `0 20px 40px ${withAlpha('#000000', 0.45)}`,
    },
  },
};

// The sober card (N26 / Apple style, fine-tuning 2026-10-06): the same surface as the sections,
// neutral text, and color only in the amount (income green when positive, error red when
// negative). Kept next to the metal card while the developer compares them.
const soberTone = (
  scheme: Scheme,
  amount: string,
): CardTone => {
  const light = scheme === 'light';
  const surface = light ? '#FFFFFF' : '#1B1D24';
  return {
    cardBackground: surface,
    cardInk: light ? '#0E1116' : '#F2F4F7',
    cardAmount: amount,
    cardLabel: light ? '#5B6472' : '#B0B8C6',
    monthButton: light ? '#F1F3F6' : '#262A33',
    statPill: light ? '#F1F3F6' : '#262A33',
    cardRim: light ? '#E6E9EF' : '#2A2D36',
    expenseIcon: light ? '#E2E6EC' : '#323743',
    ambientTop: withAlpha(amount, 0.2),
    cardGlass: `linear-gradient(160deg, ${surface}, ${surface})`,
    cardShadow: light ? `0 8px 24px ${withAlpha('#0E1116', 0.06)}` : `0 20px 40px ${withAlpha('#000000', 0.45)}`,
  };
};

const soberTones: Record<Scheme, Record<BalanceTone, CardTone>> = {
  light: { positive: soberTone('light', '#0B6B5E'), negative: soberTone('light', '#B3362A') },
  dark: { positive: soberTone('dark', '#45D3A8'), negative: soberTone('dark', '#FF8A7A') },
};

/** Which balance card the app draws: 'metal' (deep color with a sheen) or 'sober'. */
type CardStyle = 'metal' | 'sober';
const CARD_STYLE = 'metal' as CardStyle;

export const cardTones = CARD_STYLE === 'metal' ? metalTones : soberTones;

/** Zero counts as positive; loading and error states also use the positive tone (design.md). */
export function balanceTone(balanceCents: number): BalanceTone {
  return balanceCents < 0 ? 'negative' : 'positive';
}

type Weight = 400 | 500 | 600 | 700;

// On Android each Manrope weight is its own font family.
const MANROPE: Record<Weight, string> = {
  400: 'Manrope_400Regular',
  500: 'Manrope_500Medium',
  600: 'Manrope_600SemiBold',
  700: 'Manrope_700Bold',
};

type TypeSpec = { size: number; weight: Weight; letterSpacing?: number; numeric?: boolean };

const TYPE_SPECS = {
  display: { size: 62, weight: 700, letterSpacing: -2, numeric: true },
  amountInput: { size: 48, weight: 700, letterSpacing: -1, numeric: true },
  currencySuffix: { size: 32, weight: 600 },
  title: { size: 17, weight: 600 },
  heading: { size: 22, weight: 700, letterSpacing: -0.3 },
  monthTitle: { size: 16, weight: 600 },
  // Bank-app scale for the balance card (fine-tuning 2026-10-06).
  balanceLabel: { size: 16, weight: 500 },
  statAmount: { size: 19, weight: 700, numeric: true },
  button: { size: 16, weight: 600 },
  section: { size: 15, weight: 600 },
  body: { size: 15, weight: 500 },
  bodyStrong: { size: 15, weight: 600, numeric: true },
  label: { size: 14, weight: 500 },
  avatarInitial: { size: 15, weight: 700 },
  labelStrong: { size: 14, weight: 600 },
  caption: { size: 13, weight: 400, numeric: true },
  // Chart legends, day and month labels (002); Medium stays readable on the chart tints.
  legend: { size: 13, weight: 500, numeric: true },
  /** The trend's open month and the screen's month (design.md, Trend). */
  legendStrong: { size: 13, weight: 700, numeric: true },
  statLabel: { size: 14, weight: 500 },
  pill: { size: 12, weight: 600, numeric: true },
} satisfies Record<string, TypeSpec>;

export type TypeToken = keyof typeof TYPE_SPECS;
export type TypeScale = Record<TypeToken, TextStyle>;

/**
 * Builds the text styles. Without Manrope it falls back to the system font with the same numeric
 * weight, so weights still differ. With Manrope only the family is set: on Android a fontWeight
 * next to a single-weight family can make the system pick another font.
 */
export function buildTypeScale(manropeLoaded: boolean): TypeScale {
  const scale = {} as TypeScale;
  for (const [token, spec] of Object.entries(TYPE_SPECS) as [TypeToken, TypeSpec][]) {
    scale[token] = {
      fontSize: spec.size,
      ...(manropeLoaded
        ? { fontFamily: MANROPE[spec.weight] }
        : { fontWeight: String(spec.weight) as TextStyle['fontWeight'] }),
      ...(spec.letterSpacing !== undefined && { letterSpacing: spec.letterSpacing }),
      ...(spec.numeric && { fontVariant: ['tabular-nums'] }),
    };
  }
  return scale;
}

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 32,
} as const;

export const radii = {
  balanceCard: 28,
  sheet: 28,
  card: 20,
  statPill: 16,
  input: 16,
  segmentTrack: 16,
  segment: 12,
  pill: 8,
  full: 999,
} as const;

/** Chart sizes in dp (002 design.md, Chart geometry); fractions that are not sizes live in
 * `ui/charts/geometry.ts`. */
export const chart = {
  cardHeight: 64,
  /** The card chart's plot runs from y 4 to 60. */
  cardInset: 4,
  /** The full pace chart and its touch area: `paceTop` + `pacePlot`. */
  paceHeight: 180,
  paceTop: 12,
  pacePlot: 168,
  trendPlot: 160,
  /** Under the trend plot, so a saved dot at 0 on a bottom zero line is never clipped. */
  trendBottomInset: 6,
  currentWidth: 3,
  previousWidth: 2,
  previousDash: [6, 4],
  markerCurrent: 6,
  markerPrevious: 5,
  endDot: 4.5,
  ringCurrent: 2.5,
  ringEnd: 2,
  previousRing: 2.5,
  bandRadius: 3,
  tickLength: 4,
  /** The trend's one saved bar per month (developer, 2026-10-09) and its far-end corners. */
  trendBar: 16,
  barRadius: 4,
  /** A month that saved exactly 0: a line on the zero line. */
  zeroBar: 2,
  lineSwatch: { width: 18, height: 6 },
  /** The scales' headroom: pace lines, trend top, trend bottom (below zero). */
  yHeadroom: 1.08,
  trendTopHeadroom: 1.04,
  trendBottomHeadroom: 1.25,
} as const;

/** FR-031: every tappable element is at least 48 × 48 dp. */
export const minTouch = 48;

/** Feather icon sizes (design.md, Icons). design.md gives no size for the empty-state icon, so it
 * keeps the approved mockup's 26. */
export const iconSize = {
  button: 20,
  circle: 16,
  message: 14,
  emptyState: 26,
} as const;

export const LARGE_TEXT_SCALE = 1.3;

export function isLargeTextScale(fontScale: number): boolean {
  return fontScale >= LARGE_TEXT_SCALE;
}

export type Theme = {
  scheme: Scheme;
  colors: Palette;
  cardTones: Record<BalanceTone, CardTone>;
  type: TypeScale;
  isLargeText: boolean;
};

// Built once per font state; the scale itself never changes.
const typeScales = { loaded: buildTypeScale(true), fallback: buildTypeScale(false) };

/** FR-030: follows the system light or dark setting; FR-031: follows the system font size. */
export function useTheme(): Theme {
  const scheme: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { fontScale } = useWindowDimensions();
  return {
    scheme,
    colors: palettes[scheme],
    cardTones: cardTones[scheme],
    type: Font.isLoaded(MANROPE[400]) ? typeScales.loaded : typeScales.fallback,
    isLargeText: isLargeTextScale(fontScale),
  };
}

/**
 * Each expense category's own color, so the breakdown and the list read at a glance instead of as
 * a wall of numbers (fine-tuning 2026-10-06). Icons and tiles use it on a 14 % (light) or 18 %
 * (dark) tint of itself; income keeps `income` / `incomeSoft`.
 */
export const categoryColors: Record<Scheme, Record<ExpenseCategory, string>> = {
  light: {
    // Food and leisure darkened so their percent text reads at 4.5:1 on white (design review,
    // 2026-10-07).
    food: '#C2410C',
    transport: '#1864AB',
    housing: '#6741D9',
    bills: '#0B7285',
    health: '#C92A2A',
    shopping: '#A61E4D',
    leisure: '#237032',
    other: '#495057',
  },
  dark: {
    food: '#FF922B',
    transport: '#4DABF7',
    housing: '#9775FA',
    bills: '#3BC9DB',
    health: '#FF6B6B',
    shopping: '#F06595',
    leisure: '#69DB7C',
    other: '#ADB5BD',
  },
};

export const CATEGORY_TINT: Record<Scheme, number> = { light: 0.14, dark: 0.18 };
