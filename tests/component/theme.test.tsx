import { renderHook } from '@testing-library/react-native';
import * as Font from 'expo-font';
import * as RN from 'react-native';

import { balanceTone, buildTypeScale, palettes, useTheme } from '@/ui/theme';

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
    expect(result.current.colors.background).toBe('#F6F7F9');
    expect(result.current.cardTones.negative.cardAmount).toBe('#B3362A');
  });

  it('uses the dark palette in dark mode', () => {
    scheme = 'dark';
    const { result } = renderHook(() => useTheme());
    expect(result.current.scheme).toBe('dark');
    expect(result.current.colors).toBe(palettes.dark);
    expect(result.current.colors.accent).toBe('#7D96FF');
    expect(result.current.cardTones.positive.cardBackground).toBe('#161D38');
  });

  it('falls back to light when the scheme is unknown', () => {
    scheme = 'unspecified';
    const { result } = renderHook(() => useTheme());
    expect(result.current.scheme).toBe('light');
  });

  it('defines every palette token in both schemes', () => {
    expect(Object.keys(palettes.dark).sort()).toEqual(Object.keys(palettes.light).sort());
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
      fontSize: 54,
      fontFamily: 'Manrope_700Bold',
      letterSpacing: -1.5,
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
