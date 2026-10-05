// Android's ICU data varies by OS version (some phones lack `en_ES` and fall back to plain `en`),
// so number and date formatting follows the region, not the UI language (research R7).
// Euro-area regions in 2026, each mapped to its main language.
const EURO_AREA_TAGS: Readonly<Record<string, string>> = {
  AT: 'de-AT',
  BE: 'nl-BE',
  BG: 'bg-BG',
  CY: 'el-CY',
  DE: 'de-DE',
  EE: 'et-EE',
  ES: 'es-ES',
  FI: 'fi-FI',
  FR: 'fr-FR',
  GR: 'el-GR',
  HR: 'hr-HR',
  IE: 'en-IE',
  IT: 'it-IT',
  LT: 'lt-LT',
  LU: 'fr-LU',
  LV: 'lv-LV',
  MT: 'en-MT',
  NL: 'nl-NL',
  PT: 'pt-PT',
  SI: 'sl-SI',
  SK: 'sk-SK',
};

export function pickFormattingTag(languageTag: string, regionCode: string | null): string {
  if (regionCode !== null && Object.hasOwn(EURO_AREA_TAGS, regionCode)) {
    return EURO_AREA_TAGS[regionCode];
  }
  return languageTag;
}
