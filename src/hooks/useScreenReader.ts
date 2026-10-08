import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether TalkBack is on (research R6). The pace chart draws its per-day elements only then, so
 * they never steal touches from the chart's gesture. `false` until the system answers.
 */
export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', (on) => {
      active = false; // A change event is newer than the first answer, which may still be pending.
      setEnabled(on);
    });
    AccessibilityInfo.isScreenReaderEnabled().then(
      (on) => {
        if (active) setEnabled(on);
      },
      () => {},
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}
