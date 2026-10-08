import type { ConfigContext } from 'expo/config';

import getConfig from '../../app.config';

const INTERNET = 'android.permission.INTERNET';

function configFor(variant: string | undefined) {
  const previous = process.env.APP_VARIANT;
  if (variant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = variant;
  try {
    return getConfig({ config: {} } as ConfigContext);
  } finally {
    if (previous === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = previous;
  }
}

describe('app.config', () => {
  it.each([undefined, 'development', 'preview', 'production', 'bogus'])(
    'turns off Android backup for APP_VARIANT=%s',
    (variant) => {
      expect(configFor(variant).android?.allowBackup).toBe(false);
    },
  );

  it.each([undefined, 'preview', 'production', 'bogus'])(
    'blocks INTERNET for APP_VARIANT=%s',
    (variant) => {
      expect(configFor(variant).android?.blockedPermissions).toContain(INTERNET);
    },
  );

  it.each([undefined, 'development', 'preview', 'production', 'bogus'])(
    'blocks the unused template permissions for APP_VARIANT=%s',
    (variant) => {
      expect(configFor(variant).android?.blockedPermissions).toEqual(
        expect.arrayContaining([
          'android.permission.SYSTEM_ALERT_WINDOW',
          'android.permission.READ_EXTERNAL_STORAGE',
          'android.permission.WRITE_EXTERNAL_STORAGE',
        ]),
      );
    },
  );

  it('keeps INTERNET in development, which needs the dev server', () => {
    expect(configFor('development').android?.blockedPermissions ?? []).not.toContain(INTERNET);
  });

  it.each([
    [undefined, 'production'],
    ['bogus', 'production'],
    ['production', 'production'],
    ['preview', 'preview'],
    ['development', 'development'],
  ])('sets extra.variant for APP_VARIANT=%s to %s', (variant, expected) => {
    expect(configFor(variant).extra?.variant).toBe(expected);
  });

  it('uses the data extraction plugin in every variant', () => {
    expect(configFor(undefined).plugins).toContain('./plugins/withNoDataExtraction');
    expect(configFor('development').plugins).toContain('./plugins/withNoDataExtraction');
  });
});
