import { renderHook } from '@testing-library/react-native';

import { useRegion } from '@/hooks/useRegion';

type MockLocale = { languageTag: string; regionCode: string | null };

let mockLocales: MockLocale[];
jest.mock('expo-localization', () => ({ useLocales: () => mockLocales }));

it('uses the euro-area table for the region (en + ES → es-ES)', () => {
  mockLocales = [{ languageTag: 'en-ES', regionCode: 'ES' }];
  const { result } = renderHook(() => useRegion());
  expect(result.current).toEqual({ tag: 'es-ES', formSeparator: ',' });
});

it('keeps the phone tag outside the euro area', () => {
  mockLocales = [{ languageTag: 'en-GB', regionCode: 'GB' }];
  const { result } = renderHook(() => useRegion());
  expect(result.current).toEqual({ tag: 'en-GB', formSeparator: '.' });
});

it('keeps the phone tag when there is no region', () => {
  mockLocales = [{ languageTag: 'fr', regionCode: null }];
  const { result } = renderHook(() => useRegion());
  expect(result.current.tag).toBe('fr');
});

it('follows a settings change on the next render', () => {
  mockLocales = [{ languageTag: 'en-GB', regionCode: 'GB' }];
  const { result, rerender } = renderHook(() => useRegion());
  expect(result.current.tag).toBe('en-GB');

  mockLocales = [{ languageTag: 'en-IE', regionCode: 'IE' }];
  rerender({});
  expect(result.current).toEqual({ tag: 'en-IE', formSeparator: '.' });
});
