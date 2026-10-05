import { devLog } from './devLog';

/** Codes only: an error message could contain financial data (principle III). */
export function reportError(code: string): void {
  devLog(`error ${code}`);
}
