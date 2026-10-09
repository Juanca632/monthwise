import { Text, type StyleProp, type TextStyle } from 'react-native';

import type { PaceSentence as Sentence } from '@/domain/pace';
import type { Trend } from '@/domain/trend';
import { paceSentenceParts, trendHeadlineLabel, trendHeadlineParts } from '@/format/insights';

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

/**
 * The trend headline with its answer, `Saved 650,00 €`, in color: `income` when it is 0 or more, `error`
 * below (fine-tuning 2026-10-09). The minus still says it (FR-002).
 */
export function TrendHeadline({ trend, tag }: { trend: Trend; tag: string }) {
  const { colors, type } = useTheme();
  const { lead, rest } = trendHeadlineParts(trend, tag);
  return (
    <Text accessibilityLabel={trendHeadlineLabel(trend, tag)} style={[type.title, { color: colors.text }]}>
      <Text style={{ color: trend.totalSavedCents < 0 ? colors.error : colors.income }}>{lead}</Text>
      {rest}
    </Text>
  );
}
