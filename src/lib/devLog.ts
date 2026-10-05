import { getVariant } from './variant';

// Captured before silenceLogs.ts replaces console methods (it imports this module first), so this
// is the only logger that still reaches logcat in preview builds.
const originalLog = console.log.bind(console);

/**
 * Allow-listed logger: error codes and `timing <name> <ms>` lines only, never amounts, notes or
 * categories. Writes in development and preview; production writes nothing.
 */
export function devLog(line: string): void {
  if (getVariant() === 'production') return;
  originalLog(`[monthwise] ${line}`);
}

export function logTiming(name: string, ms: number): void {
  devLog(`timing ${name} ${Math.round(ms)}`);
}
