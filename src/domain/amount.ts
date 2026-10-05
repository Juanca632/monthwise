// Parses user-typed euro amounts into integer cents without ever using floats.
//
// Error code -> UI message (mapped in the UI layer):
//   required    -> "Enter an amount."
//   notPositive -> "Amount must be greater than 0."
//   overMax     -> "Maximum is 999999,99."
//   separators  -> "Use up to 2 decimals and no thousands separators."
//   decimals    -> "Use up to 2 decimals and no thousands separators."
//   invalid     -> "Enter a valid amount."

export type AmountError =
  | 'required'
  | 'invalid'
  | 'notPositive'
  | 'separators'
  | 'decimals'
  | 'overMax';

export const MAX_AMOUNT_CENTS = 99_999_999;

// Integer part of the maximum (999999): longer than this can never fit.
const MAX_INTEGER_DIGITS = 6;

export function parseAmount(
  text: string,
): { ok: true; cents: number } | { ok: false; error: AmountError } {
  const value = text.trim();
  if (value === '') return { ok: false, error: 'required' };

  if (!/^[0-9.,]+$/.test(value)) return { ok: false, error: 'invalid' };

  const parts = value.split(/[.,]/);
  if (parts.length > 2) return { ok: false, error: 'separators' };

  const intRaw = parts[0];
  const decRaw = parts.length === 2 ? parts[1] : '';

  // A lone separator has no digits at all.
  if (intRaw === '' && decRaw === '') return { ok: false, error: 'invalid' };

  if (decRaw.length > 2) return { ok: false, error: 'decimals' };

  // Strip leading zeros first so long digit strings never reach Number().
  const intDigits = intRaw.replace(/^0+/, '');
  if (intDigits.length > MAX_INTEGER_DIGITS) return { ok: false, error: 'overMax' };

  const cents = (intDigits === '' ? 0 : Number(intDigits)) * 100 + Number(decRaw.padEnd(2, '0'));

  if (cents <= 0) return { ok: false, error: 'notPositive' };
  if (cents > MAX_AMOUNT_CENTS) return { ok: false, error: 'overMax' };
  return { ok: true, cents };
}
