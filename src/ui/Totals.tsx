import { Feather } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { formatMoney, spokenMoney } from '@/format/money';
import { useCountUp } from '@/hooks/useCountUp';

import { Appear } from './Appear';
import { GlassCard, ShapePressable, ToneCrossfade } from './glass';
import { durations, easeOutFn, useReduceMotion } from './motion';
import {
  balanceTone,
  iconSize,
  minTouch,
  radii,
  spacing,
  useTheme,
  type CardTone,
} from './theme';

export type TotalsContent =
  | { kind: 'loading' }
  | { kind: 'error'; onRetry(): void }
  | { kind: 'values'; incomeCents: number; expenseCents: number; balanceCents: number };

type Props = {
  /** The header row; it gets the card tone so its text matches the card. */
  header(tone: CardTone): ReactNode;
  content: TotalsContent;
  tag: string;
};

// The balance and stat amounts are already large; past 1.3× they shrink to fit instead (design.md,
// Large text).
const AMOUNT_MAX_SCALE = 1.3;

/** The balance card at the top of the summary (design.md, Summary screen item 1). */
export function Totals({ header, content, tag }: Props) {
  const { cardTones, type, isLargeText } = useTheme();
  // Loading and error have no balance yet, so they use the positive tone.
  const toneName = content.kind === 'values' ? balanceTone(content.balanceCents) : 'positive';
  const tone = cardTones[toneName];
  // The card keeps the height of the last month's numbers while the next one loads (or fails),
  // so it never shrinks and grows again on a month change (fine-tuning 2026-10-06).
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);
  const values = content.kind === 'values' ? content : null;
  // 520 ms ease-out, or a jump under reduce motion. The counters live here, not in the values
  // block, which unmounts while a month loads; they reset while it loads, so a new month shows
  // its amounts at once and only a change in the month on screen counts.
  const counting = { animate: !useReduceMotion(), duration: durations.count, easing: easeOutFn };
  const balance = useCountUp(values?.balanceCents ?? null, counting);
  const income = useCountUp(values?.incomeCents ?? null, counting);
  const expenses = useCountUp(values?.expenseCents ?? null, counting);

  return (
    <GlassCard
      radius={radii.balanceCard}
      border={tone.cardRim}
      highlight
      shadow={tone.cardShadow}
      style={styles.card}
      contentStyle={styles.cardContent}
      background={
        <ToneCrossfade
          tone={toneName}
          testID="card-glass"
          renderLayer={(t) => (
            <View
              style={[
                StyleSheet.absoluteFill,
                { experimental_backgroundImage: cardTones[t].cardGlass },
              ]}
            />
          )}
        />
      }
    >
      {header(tone)}

      {content.kind === 'loading' && (
        <View style={[styles.loading, bodyHeight !== null && { height: bodyHeight }]}>
          <ActivityIndicator accessibilityLabel="Loading" color={tone.cardInk} size="large" />
        </View>
      )}

      {content.kind === 'error' && (
        <View style={[styles.error, bodyHeight !== null && { minHeight: bodyHeight }]}>
          <Text style={[type.label, styles.centered, { color: tone.cardLabel }]}>
            Couldn&apos;t load your data.
          </Text>
          <ShapePressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={content.onRetry}
            // White feedback on the colored card.
            overlay={tone.cardRim}
            style={[
              styles.retry,
              { backgroundColor: tone.monthButton, borderColor: tone.cardRim },
            ]}
          >
            <Text style={[type.bodyStrong, { color: tone.cardInk }]}>Try again</Text>
          </ShapePressable>
        </View>
      )}

      {/* The month's numbers slide in on a month change; the header row stays put. */}
      {content.kind === 'values' && (
        <Appear on={['month']}>
          <View onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}>
            {/* "Balance" and the amount are read as one element: "Balance, minus 150,00 €". */}
            <View
              accessible
              accessibilityLabel={`Balance, ${spokenMoney(content.balanceCents, tag)}`}
              style={styles.balance}
            >
              <Text style={[type.balanceLabel, { color: tone.cardLabel }]}>Balance</Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                maxFontSizeMultiplier={AMOUNT_MAX_SCALE}
                style={[type.display, { color: tone.cardAmount }]}
              >
                {formatMoney(balance ?? content.balanceCents, tag)}
              </Text>
            </View>
            <View style={[styles.stats, isLargeText && styles.statsStacked]}>
              <StatPill
                label="Income"
                cents={content.incomeCents}
                shownCents={income ?? content.incomeCents}
                tag={tag}
                tone={tone}
                icon="arrow-up"
                iconColor={tone.cardInk}
                iconBackground={tone.expenseIcon}
              />
              <StatPill
                label="Expenses"
                cents={content.expenseCents}
                shownCents={expenses ?? content.expenseCents}
                tag={tag}
                tone={tone}
                icon="arrow-down"
                iconColor={tone.cardInk}
                iconBackground={tone.expenseIcon}
              />
            </View>
          </View>
        </Appear>
      )}
    </GlassCard>
  );
}

type StatPillProps = {
  label: string;
  /** The final amount, for the screen reader. */
  cents: number;
  /** The amount drawn, which counts toward `cents`. */
  shownCents: number;
  tag: string;
  tone: CardTone;
  icon: 'arrow-up' | 'arrow-down';
  iconColor: string;
  iconBackground: string;
};

function StatPill({ label, cents, shownCents, tag, tone, icon, iconColor, iconBackground }: StatPillProps) {
  const { type, isLargeText } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${spokenMoney(cents, tag)}`}
      // flex: 1 only side by side: in a stacked column it would collapse the pill's height.
      style={[
        styles.pill,
        !isLargeText && styles.flex,
        { backgroundColor: tone.statPill, borderColor: tone.cardRim },
      ]}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        style={[styles.iconCircle, { backgroundColor: iconBackground }]}
      >
        <Feather name={icon} size={iconSize.circle} color={iconColor} />
      </View>
      <View style={styles.pillText}>
        <Text style={[type.statLabel, { color: tone.cardLabel }]}>{label}</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={AMOUNT_MAX_SCALE}
          style={[type.statAmount, { color: tone.cardInk }]}
        >
          {formatMoney(shownCents, tag)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.sm },
  cardContent: { padding: spacing.sm, paddingBottom: spacing.md },
  centered: { textAlign: 'center' },
  loading: { height: 120, alignItems: 'center', justifyContent: 'center' },
  error: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.sm,
    alignItems: 'center',
    gap: spacing.md,
  },
  retry: {
    minHeight: minTouch,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  stats: { flexDirection: 'row', gap: spacing.xs },
  statsStacked: { flexDirection: 'column' },
  flex: { flex: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.statPill,
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { flex: 1, gap: spacing.xxs },
});
