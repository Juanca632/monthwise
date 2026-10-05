import Constants from 'expo-constants';

export type Variant = 'development' | 'preview' | 'production';

// Fails closed like app.config.ts: anything missing or unknown is treated as production.
export function getVariant(): Variant {
  const raw: unknown = Constants.expoConfig?.extra?.variant;
  return raw === 'development' || raw === 'preview' ? raw : 'production';
}
