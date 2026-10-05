// Imported first in src/app/_layout.tsx. React Native keeps sending console output to logcat in
// release builds, and React logs caught render errors (message included) through console.error,
// so preview and production builds turn every console method into a no-op (plan, "Production
// builds log nothing").
import { reportError } from './reportError';
import { getVariant } from './variant';

type FatalListener = () => void;

let fatalListener: FatalListener | null = null;

/** The root layout registers this to show the generic error screen after a fatal JS error. */
export function setFatalListener(listener: FatalListener | null): void {
  fatalListener = listener;
}

const noop = () => {};

function silence(): void {
  if (getVariant() === 'development') return;

  const target = console as unknown as Record<string, unknown>;
  for (const key of Object.keys(target)) {
    // Underscore keys are a console implementation's internals (the public methods call them),
    // not output methods; replacing them would break the original log that devLog keeps.
    if (typeof target[key] === 'function' && !key.startsWith('_')) target[key] = noop;
  }

  // The default handler prints the error (and its message) before showing the red box or crashing.
  ErrorUtils.setGlobalHandler((_error, isFatal) => {
    if (isFatal === true) {
      fatalListener?.();
    } else {
      reportError('js_nonfatal');
    }
  });
}

silence();
