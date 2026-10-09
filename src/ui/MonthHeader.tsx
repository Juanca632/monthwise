import { StyleSheet, View } from 'react-native';

import { MonthControl } from './MonthControl';
import type { CardTone } from './theme';

type Props = { tone: CardTone };

/**
 * The balance card's header row: one centered month control in place of 001's arrows (002
 * FR-026, design.md, Month control). It works in every summary state (contract).
 */
export function MonthHeader({ tone }: Props) {
  return (
    <View style={styles.row}>
      <MonthControl variant="card" tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center' },
});
