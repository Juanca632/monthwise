import { pickFormattingTag } from '@/format/locale';

describe('pickFormattingTag', () => {
  it('uses the euro-area table for the region, whatever the language', () => {
    expect(pickFormattingTag('en', 'ES')).toBe('es-ES');
    expect(pickFormattingTag('en-ES', 'ES')).toBe('es-ES');
    expect(pickFormattingTag('en-US', 'DE')).toBe('de-DE');
    expect(pickFormattingTag('es-ES', 'IE')).toBe('en-IE');
  });

  it('falls back to the phone tag for regions outside the table', () => {
    expect(pickFormattingTag('en-GB', 'GB')).toBe('en-GB');
    expect(pickFormattingTag('es-US', 'US')).toBe('es-US');
  });

  it('falls back to the phone tag when the region is null', () => {
    expect(pickFormattingTag('en-GB', null)).toBe('en-GB');
  });

  it('does not match inherited object keys', () => {
    expect(pickFormattingTag('en-GB', 'constructor')).toBe('en-GB');
  });

  it('covers all 21 euro-area regions', () => {
    const regions = ['AT', 'BE', 'BG', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT',
      'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK'];
    for (const region of regions) {
      expect(pickFormattingTag('xx', region)).toMatch(new RegExp(`^[a-z]{2}-${region}$`));
    }
  });
});
