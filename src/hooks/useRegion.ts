import { useLocales } from 'expo-localization';
import { useMemo } from 'react';

import { pickFormattingTag } from '@/format/locale';
import { formSeparator } from '@/format/money';

export type Region = { tag: string; formSeparator: ',' | '.' };

/**
 * The one formatting tag for money and dates (research R7). `useLocales` re-renders when the
 * phone's language or region changes, so amounts follow the new settings without a restart.
 */
export function useRegion(): Region {
  const [primary] = useLocales();
  const tag = pickFormattingTag(primary.languageTag, primary.regionCode);
  return useMemo(() => ({ tag, formSeparator: formSeparator(tag) }), [tag]);
}
