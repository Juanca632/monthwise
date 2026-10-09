import { renderHook } from '@testing-library/react-native';
import * as Font from 'expo-font';
import * as RN from 'react-native';

import { balanceTone, buildTypeScale, cardTones, palettes, useTheme, withAlpha } from '@/ui/theme';

jest.mock('expo-font', () => ({ isLoaded: jest.fn(() => true) }));

let scheme: RN.ColorSchemeName = 'light';
let mockFontScale = 1;

// A spy on RN.useWindowDimensions does not reach theme.ts, so the module itself is mocked.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 360, height: 640, scale: 2, fontScale: mockFontScale }),
}));

beforeEach(() => {
  scheme = 'light';
  mockFontScale = 1;
  jest.spyOn(RN, 'useColorScheme').mockImplementation(() => scheme);
  jest.mocked(Font.isLoaded).mockReturnValue(true);
});

afterEach(() => jest.restoreAllMocks());

describe('color scheme', () => {
  it('uses the light palette in light mode', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.scheme).toBe('light');
    expect(result.current.colors.background).toBe('#F2F3F7');
    expect(result.current.cardTones.negative.cardAmount).toBe('#FFFFFF');
  });

  it('uses the dark palette in dark mode', () => {
    scheme = 'dark';
    const { result } = renderHook(() => useTheme());
    expect(result.current.scheme).toBe('dark');
    expect(result.current.colors).toBe(palettes.dark);
    expect(result.current.colors.accent).toBe('#7D96FF');
    expect(result.current.cardTones.positive.cardBackground).toBe('#1B2A6B');
  });

  it('falls back to light when the scheme is unknown', () => {
    scheme = 'unspecified';
    const { result } = renderHook(() => useTheme());
    expect(result.current.scheme).toBe('light');
  });

  it('defines every palette token in both schemes', () => {
    expect(Object.keys(palettes.dark).sort()).toEqual(Object.keys(palettes.light).sort());
  });

  it('defines every card tone token in both schemes and tones', () => {
    const keys = Object.keys(cardTones.light.positive).sort();
    for (const scheme of ['light', 'dark'] as const) {
      for (const tone of ['positive', 'negative'] as const) {
        expect(Object.keys(cardTones[scheme][tone]).sort()).toEqual(keys);
      }
    }
    // The ambient glow replaced the decorative circle (design.md, Balance card tones).
    expect(keys).not.toContain('cardDecor');
  });
});

describe('glass tokens (design.md, Glass surfaces)', () => {
  it('makes the balance card vivid with white text in both schemes', () => {
    expect(palettes.dark.textMuted).toBe('#B0B8C6');
    for (const scheme of ['light', 'dark'] as const) {
      for (const tone of ['positive', 'negative'] as const) {
        expect(cardTones[scheme][tone].cardInk).toBe('#FFFFFF');
        expect(cardTones[scheme][tone].cardAmount).toBe('#FFFFFF');
      }
    }
  });

  it('writes design.md opacities as rgba', () => {
    expect(withAlpha('#2F5BEA', 0.22)).toBe('rgba(47, 91, 234, 0.22)');
    expect(palettes.light.glassFill).toBe('rgba(255, 255, 255, 0.72)');
    expect(palettes.dark.fieldBorder).toBe('rgba(255, 255, 255, 0.38)');
    expect(cardTones.dark.negative.ambientTop).toBe('rgba(250, 82, 82, 0.32)');
  });

  it('builds the gradients and shadows from design.md', () => {
    expect(cardTones.light.positive.cardGlass).toBe(
      'linear-gradient(135deg, #1E2E73 0%, #1E2E73 30%, #2C43A0 48%, #1E2E73 66%, #15215A 100%)',
    );
    expect(palettes.dark.accentGradient).toBe('linear-gradient(135deg, #364FC7, #5F3DC4)');
    expect(palettes.dark.sheetFill).toBe('linear-gradient(180deg, #1E222E, #0E1016)');
    expect(cardTones.light.negative.cardShadow).toBe('0 16px 36px rgba(110, 26, 43, 0.35)');
    expect(cardTones.dark.positive.cardShadow).toBe('0 20px 40px rgba(0, 0, 0, 0.45)');
  });
});

describe('balanceTone', () => {
  it.each([
    [-1, 'negative'],
    [0, 'positive'],
    [1, 'positive'],
  ])('%i cents → %s', (cents, tone) => {
    expect(balanceTone(cents)).toBe(tone);
  });
});

describe('fonts', () => {
  it('uses Manrope families when the font is loaded', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.type.display).toEqual({
      fontSize: 40,
      fontFamily: 'Manrope_700Bold',
      letterSpacing: -1,
      fontVariant: ['tabular-nums'],
    });
    expect(result.current.type.body.fontFamily).toBe('Manrope_500Medium');
    expect(Font.isLoaded).toHaveBeenCalledWith('Manrope_400Regular');
  });

  it('falls back to the system font with the same numeric weight', () => {
    jest.mocked(Font.isLoaded).mockReturnValue(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.type.display.fontFamily).toBeUndefined();
    expect(result.current.type.display.fontWeight).toBe('700');
    expect(result.current.type.label.fontWeight).toBe('500');
    expect(result.current.type.caption.fontWeight).toBe('400');
  });

  it('puts tabular figures on numeric tokens only', () => {
    const scale = buildTypeScale(true);
    for (const token of ['display', 'amountInput', 'statAmount', 'bodyStrong', 'pill'] as const) {
      expect(scale[token].fontVariant).toEqual(['tabular-nums']);
    }
    expect(scale.title.fontVariant).toBeUndefined();
  });
});

describe('isLargeText', () => {
  it('is false at font scale 1.0', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.isLargeText).toBe(false);
  });

  it('is true at font scale 1.3', () => {
    mockFontScale = 1.3;
    const { result } = renderHook(() => useTheme());
    expect(result.current.isLargeText).toBe(true);
  });
});
