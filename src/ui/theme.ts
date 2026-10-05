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
};

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
    ripple: 'rgba(91, 100, 114, 0.12)', // #5B6472 at 12 %
    rippleOnAccent: 'rgba(255, 255, 255, 0.20)', // #FFFFFF at 20 %
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
    textMuted: '#9AA3B2',
    accent: '#7D96FF',
    onAccent: '#0D0F13',
    accentSoft: '#1E2640',
    income: '#45D3A8',
    incomeSoft: '#12332C',
    error: '#FF8A7A',
    underlineIdle: '#626B7C',
    ripple: 'rgba(154, 163, 178, 0.12)', // #9AA3B2 at 12 %
    rippleOnAccent: 'rgba(13, 15, 19, 0.20)', // #0D0F13 at 20 %
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
  cardDecor: string;
};

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
      cardDecor: 'rgba(36, 67, 199, 0.06)', // #2443C7 at 6 %
    },
    negative: {
      cardBackground: '#FCEAE7',
      cardInk: '#0E1116',
      cardAmount: '#B3362A',
      cardLabel: '#7A4A44',
      monthButton: '#FFFFFF',
      statPill: '#FFFFFF',
      expenseIcon: '#F6DCD8',
      cardDecor: 'rgba(179, 54, 42, 0.06)', // #B3362A at 6 %
    },
  },
  dark: {
    positive: {
      cardBackground: '#161D38',
      cardInk: '#F2F4F7',
      cardAmount: '#9DB0FF',
      cardLabel: '#A9B3D6',
      monthButton: '#222A48',
      statPill: '#1E2541',
      expenseIcon: '#2A3150',
      cardDecor: 'rgba(157, 176, 255, 0.06)', // #9DB0FF at 6 %
    },
    negative: {
      cardBackground: '#2A1A19',
      cardInk: '#F2F4F7',
      cardAmount: '#FF9A8C',
      cardLabel: '#C9B3AF',
      monthButton: '#3A2523',
      statPill: '#35211F',
      expenseIcon: '#4A2E2B',
      cardDecor: 'rgba(255, 154, 140, 0.06)', // #FF9A8C at 6 %
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
