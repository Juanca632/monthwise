// Every visual token from design.md, so components never hard-code a color or size.
import * as Font from 'expo-font';
import { useColorScheme, useWindowDimensions, type TextStyle } from 'react-native';

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

export const palettes: Record<Scheme, Palette> = {
  light: {
    background: '#F6F7F9',
    surface: '#FFFFFF',
    formBackground: '#FFFFFF',
    surfaceMuted: '#F1F3F6',
    segmentTrack: '#F1F3F6',
    segmentSelected: '#FFFFFF',
    avatar: '#F1F3F6',
    divider: '#EEF0F3',
    text: '#0E1116',
    textMuted: '#5B6472',
    accent: '#2F5BEA',
    onAccent: '#FFFFFF',
    accentSoft: '#EAF0FF',
    income: '#0B6B5E',
    incomeSoft: '#E3F4EE',
    error: '#B3362A',
    underlineIdle: '#8A93A3',
    ripple: withAlpha('#5B6472', 0.12),
    rippleOnAccent: withAlpha('#FFFFFF', 0.2),
    ambientBottom: withAlpha('#0B6B5E', 0.12),
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
    accentGradient: verticalGradient('#3D66EF', '#2F5BEA'),
    accentBorder: withAlpha('#FFFFFF', 0.35),
    bannerFill: '#EAF0FF',
    bottomFade: verticalGradient(withAlpha('#F6F7F9', 0), withAlpha('#F6F7F9', 0.45)),
    rowFlash: withAlpha('#2F5BEA', 0.22),
  },
  dark: {
    background: '#0D0F13',
    surface: '#171A21',
    formBackground: '#0D0F13',
    surfaceMuted: '#1A1E26',
    segmentTrack: '#171A21',
    segmentSelected: '#262B35',
    avatar: '#232833',
    divider: '#232833',
    text: '#F2F4F7',
    textMuted: '#B0B8C6',
    accent: '#7D96FF',
    onAccent: '#0D0F13',
    accentSoft: '#1E2640',
    income: '#45D3A8',
    incomeSoft: '#12332C',
    error: '#FF8A7A',
    underlineIdle: '#626B7C',
    ripple: withAlpha('#9AA3B2', 0.12),
    rippleOnAccent: withAlpha('#0D0F13', 0.2),
    ambientBottom: withAlpha('#45D3A8', 0.18),
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
    accentGradient: verticalGradient('#A0B2FF', '#7089FA'),
    accentBorder: withAlpha('#FFFFFF', 0.4),
    bannerFill: withAlpha('#1E2640', 0.6),
    bottomFade: verticalGradient(withAlpha('#0D0F13', 0), withAlpha('#0D0F13', 0.45)),
    rowFlash: withAlpha('#7D96FF', 0.22),
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
  /** The top ambient glow (Glass surfaces, `ambientTop`). */
  ambientTop: string;
  /** The balance card's fill, an `experimental_backgroundImage` value. */
  cardGlass: string;
  /** A `boxShadow` value: `glassShadow`, except the light balance card's own blue shadow. */
  cardShadow: string;
};

const cardGlass = (from: string, to: string) => `linear-gradient(160deg, ${from}, ${to})`;
const LIGHT_CARD_SHADOW = `0 18px 40px ${withAlpha('#1D34A6', 0.12)}`;

export const cardTones: Record<Scheme, Record<BalanceTone, CardTone>> = {
  light: {
    positive: {
      cardBackground: '#E8EDFF',
      cardInk: '#0E1116',
      cardAmount: '#1D34A6',
      cardLabel: '#4A5578',
      monthButton: '#FFFFFF',
      statPill: '#FFFFFF',
      expenseIcon: '#ECEEF2',
      ambientTop: withAlpha('#2F5BEA', 0.22),
      cardGlass: cardGlass(withAlpha('#FFFFFF', 0.78), withAlpha('#E8EDFF', 0.55)),
      cardShadow: LIGHT_CARD_SHADOW,
    },
    negative: {
      cardBackground: '#FCEAE7',
      cardInk: '#0E1116',
      cardAmount: '#B3362A',
      cardLabel: '#7A4A44',
      monthButton: '#FFFFFF',
      statPill: '#FFFFFF',
      expenseIcon: '#F6DCD8',
      ambientTop: withAlpha('#B3362A', 0.16),
      cardGlass: cardGlass(withAlpha('#FFFFFF', 0.78), withAlpha('#FCEAE7', 0.6)),
      cardShadow: LIGHT_CARD_SHADOW,
    },
  },
  dark: {
    positive: {
      cardBackground: '#161D38',
      cardInk: '#F2F4F7',
      cardAmount: '#F2F4F7',
      cardLabel: '#D5DBF0',
      monthButton: '#222A48',
      statPill: '#1E2541',
      expenseIcon: '#2A3150',
      ambientTop: withAlpha('#7D96FF', 0.3),
      cardGlass: cardGlass(withAlpha('#9DB0FF', 0.12), withAlpha('#FFFFFF', 0.03)),
      cardShadow: DARK_GLASS_SHADOW,
    },
    negative: {
      cardBackground: '#2A1A19',
      cardInk: '#F2F4F7',
      cardAmount: '#FF9A8C',
      cardLabel: '#E6D6D2',
      monthButton: '#3A2523',
      statPill: '#35211F',
      expenseIcon: '#4A2E2B',
      ambientTop: withAlpha('#FF9A8C', 0.24),
      cardGlass: cardGlass(withAlpha('#FF9A8C', 0.12), withAlpha('#FF9A8C', 0.04)),
      cardShadow: DARK_GLASS_SHADOW,
    },
  },
};

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
  display: { size: 54, weight: 700, letterSpacing: -1.5, numeric: true },
  amountInput: { size: 48, weight: 700, letterSpacing: -1, numeric: true },
  currencySuffix: { size: 32, weight: 600 },
  title: { size: 17, weight: 600 },
  monthTitle: { size: 16, weight: 600 },
  statAmount: { size: 16, weight: 700, numeric: true },
  button: { size: 16, weight: 600 },
  section: { size: 15, weight: 600 },
  body: { size: 15, weight: 500 },
  bodyStrong: { size: 15, weight: 600, numeric: true },
  label: { size: 14, weight: 500 },
  avatarInitial: { size: 15, weight: 700 },
  labelStrong: { size: 14, weight: 600 },
  caption: { size: 13, weight: 400, numeric: true },
  statLabel: { size: 12, weight: 500 },
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
