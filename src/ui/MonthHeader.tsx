import { StyleSheet, Text, View } from 'react-native';

import type { YearMonth } from '@/domain/month';
import { monthTitle } from '@/format/date';

import { minTouch, useTheme, type CardTone } from './theme';

type Props = { month: YearMonth; tone: CardTone };

/** The balance card's header row: the month title between two 48 dp slots (design.md). */
export function MonthHeader({ month, tone }: Props) {
  const { type } = useTheme();
  return (
    <View style={styles.row}>
      {/* The slots keep the title centered; the previous/next buttons fill them in T047. */}
      <View style={styles.slot} />
      <Text accessibilityRole="header" style={[type.monthTitle, styles.title, { color: tone.cardInk }]}>
        {monthTitle(month)}
      </Text>
      <View style={styles.slot} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  slot: { width: minTouch, height: minTouch },
  title: { flex: 1, textAlign: 'center' },
});
