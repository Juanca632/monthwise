import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { toIsoDate, type IsoDate } from '@/domain/month';

/** Today's date right now. Forms call it on open and on save, so midnight is never missed. */
export function getToday(): IsoDate {
  return toIsoDate(new Date());
}

/**
 * Today's date, recomputed when the app comes back to the foreground: the app can sit in the
 * background across midnight or a month change (spec edge case).
 */
export function useToday(): IsoDate {
  const [today, setToday] = useState(getToday);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      // Same string → React skips the re-render.
      if (state === 'active') setToday(getToday());
    });
    return () => subscription.remove();
  }, []);

  return today;
}
