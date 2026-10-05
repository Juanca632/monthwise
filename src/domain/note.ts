import { countGraphemes as countClusters, splitGraphemes } from 'unicode-segmenter/grapheme';

// Max visible characters in a note. Counted in grapheme clusters, not `.length` or
// TextInput `maxLength`, because those count UTF-16 units and a flag or family emoji
// would eat several of them.
export const NOTE_MAX_GRAPHEMES = 100;

// Hermes has no Intl.Segmenter, so we use unicode-segmenter (same Unicode rules).
export function countGraphemes(text: string): number {
  return countClusters(text);
}

// Cuts on cluster boundaries so an emoji is never split into broken halves.
export function cutToGraphemes(text: string, max: number): string {
  let result = '';
  let count = 0;
  for (const cluster of splitGraphemes(text)) {
    if (count >= max) break;
    result += cluster;
    count += 1;
  }
  return result;
}

// Empty notes are stored as NULL, not as an empty string.
export function normalizeNote(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}
