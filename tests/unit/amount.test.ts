import { parseAmount } from '@/domain/amount';

const ok = (cents: number) => ({ ok: true, cents });
const err = (error: string) => ({ ok: false, error });

describe('parseAmount', () => {
  it.each([
    ['12,50', 1250],
    ['12.50', 1250],
    ['.5', 50],
    ['12.', 1200],
    ['0,01', 1],
    ['007', 700],
    // Leading zeros do not count towards the six integer digits.
    ['0000001234', 123400],
    ['999999,99', 99999999],
    ['  12,5 ', 1250],
  ])('parses %j as %d cents', (input, cents) => {
    expect(parseAmount(input)).toEqual(ok(cents));
  });

  it.each([
    ['1.250,00', 'separators'],
    ['1.250', 'decimals'],
    ['999999,991', 'decimals'],
    ['0', 'notPositive'],
    ['0,00', 'notPositive'],
    ['-5', 'invalid'],
    ['', 'required'],
    ['   ', 'required'],
    ['1000000', 'overMax'],
    ['1 2', 'invalid'],
    ['abc', 'invalid'],
    ['+5', 'invalid'],
    ['1e5', 'invalid'],
    ['١٢', 'invalid'],
    ['.', 'invalid'],
    [',', 'invalid'],
    ['9'.repeat(30), 'overMax'],
  ])('rejects %j with %s', (input, error) => {
    expect(parseAmount(input)).toEqual(err(error));
  });
});
