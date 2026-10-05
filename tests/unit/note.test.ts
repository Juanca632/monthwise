import {
  NOTE_MAX_GRAPHEMES,
  countGraphemes,
  cutToGraphemes,
  normalizeNote,
} from '@/domain/note';

const FAMILY = '👨‍👩‍👧‍👦';

describe('countGraphemes', () => {
  it('counts plain text', () => {
    expect(countGraphemes('hello')).toBe(5);
  });
  it('counts precomposed and decomposed accents as 1', () => {
    expect(countGraphemes('é')).toBe(1);
    expect(countGraphemes('é')).toBe(1);
  });
  it('counts a flag as 1', () => {
    expect(countGraphemes('🇪🇸')).toBe(1);
  });
  it('counts a skin-tone emoji as 1', () => {
    expect(countGraphemes('👍🏽')).toBe(1);
  });
  it('counts a family emoji as 1', () => {
    expect(countGraphemes(FAMILY)).toBe(1);
  });
  it('counts an empty string as 0', () => {
    expect(countGraphemes('')).toBe(0);
  });
});

describe('cutToGraphemes', () => {
  it('cuts 150 family emoji to 100 without splitting any', () => {
    const cut = cutToGraphemes(FAMILY.repeat(150), NOTE_MAX_GRAPHEMES);
    expect(countGraphemes(cut)).toBe(100);
    expect(cut).toBe(FAMILY.repeat(100));
  });
  it('returns a shorter text unchanged', () => {
    expect(cutToGraphemes('short 🇪🇸', 100)).toBe('short 🇪🇸');
  });
});

describe('normalizeNote', () => {
  it('returns null for whitespace-only text', () => {
    expect(normalizeNote('   \n ')).toBeNull();
  });
  it('trims surrounding whitespace', () => {
    expect(normalizeNote('  hi  ')).toBe('hi');
  });
});
