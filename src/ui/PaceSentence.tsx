import { Text, type StyleProp, type TextStyle } from 'react-native';

import type { PaceSentence as Sentence } from '@/domain/pace';
import { paceSentenceParts } from '@/format/insights';

import { useTheme } from './theme';

/**
 * The pace sentence with its answer in color (fine-tuning 2026-10-09): "85,00 € more" in `error`,
 * "65,00 € less" in `income`, the rest in `text`. The words still say it, so color never carries
 * the meaning alone (FR-002).
 */
export function PaceSentence({ sentence, tag, style }: { sentence: Sentence; tag: string; style?: StyleProp<TextStyle> }) {
  const { colors, type } = useTheme();
  const { lead, rest, tone } = paceSentenceParts(sentence, tag);
  return (
    <Text style={[type.title, { color: colors.text }, style]}>
      {tone !== null && <Text style={{ color: tone === 'more' ? colors.error : colors.income }}>{lead}</Text>}
      {rest}
    </Text>
  );
}
