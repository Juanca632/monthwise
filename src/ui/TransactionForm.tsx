import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  KeyboardState,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_AMOUNT_CENTS } from '@/domain/amount';
import { categoriesFor, labelFor, type CategoryKey, type TransactionType } from '@/domain/categories';
import { toIsoDate, type IsoDate } from '@/domain/month';
import { cutToGraphemes, NOTE_MAX_GRAPHEMES } from '@/domain/note';
import {
  validateDraft,
  type DraftError,
  type DraftField,
  type TransactionDraft,
  type TransactionInput,
} from '@/domain/validation';
import { formatNumericDate, formatSpokenDate } from '@/format/date';
import { currencyPosition, formatAmountForInput, formSeparator } from '@/format/money';
import { getToday } from '@/hooks/useToday';
import { useRegion } from '@/hooks/useRegion';
import { haptics } from '@/lib/haptics';

import { SEGMENT_BORDER, TypeIndicator, useShake } from './formMotion';
import { categoryLook } from './categoryLook';
import { useConfirmDialog } from './ConfirmDialog';
import { ShapePressable } from './glass';
import { useSheet } from './Sheet';
import { PressableScale } from './motion';
import { iconSize, minTouch, radii, spacing, useTheme, type Palette } from './theme';

/** `null` means the operation succeeded; a string is the form-level failure message to show. */
export type FormResult = string | null;

type Props = {
  initial: TransactionDraft;
  onSave(input: TransactionInput): Promise<FormResult>;
  /** Edit form only: shows Delete. */
  onDelete?(): Promise<FormResult>;
  /**
   * Leaves the form after a successful save or delete, once the sheet has slid down; the discard
   * guard lets that navigation through.
   */
  onDone(): void;
};

type Errors = Partial<Record<DraftField, DraftError>>;

const MIN_PICKER_DATE = new Date(2000, 0, 1);
// The amount steps down from 48 to 36 dp past 7 characters, so long amounts still fit (design.md).
const LONG_AMOUNT = 7;
const LONG_AMOUNT_SIZE = 36;
const AMOUNT_MAX_SCALE = 1.3;

/** Messages from contracts/ui-screens.md, "Validation messages". */
function messageFor(error: DraftError, tag: string): string {
  switch (error) {
    case 'required':
      return 'Enter an amount.';
    case 'notPositive':
      return 'Amount must be greater than 0.';
    case 'overMax':
      // Shown the way the form shows amounts: region separator, no grouping.
      return `Maximum is ${formatAmountForInput(MAX_AMOUNT_CENTS, tag)}.`;
    case 'separators':
    case 'decimals':
      return 'Use up to 2 decimals and no thousands separators.';
    case 'invalid':
      return 'Enter a valid amount.';
    case 'categoryRequired':
    case 'categoryInvalid':
      return 'Pick a category.';
    case 'dateAfterToday':
    case 'dateBeforeMin':
      return 'Pick a date up to today.';
    case 'noteTooLong':
      // Unreachable from the UI: typing and pasting are cut at 100 (FR-007).
      return `Use up to ${NOTE_MAX_GRAPHEMES} characters.`;
  }
}

const localDate = (iso: IsoDate): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** The add and edit form's body, inside the route's sheet (design.md, Transaction form; contracts/ui-screens.md). */
export function TransactionForm({
  initial,
  onSave,
  onDelete,
  onDone,
}: Props) {
  const { colors, type, cardTones } = useTheme();
  const { tag } = useRegion();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const sheet = useSheet();
  // The keyboard goes down with the sheet. Leaving it open let the form unmount before it hid, so
  // the next form started from its stale height, with Save raised over no keyboard.
  const closeSheet = (then: () => void) => {
    Keyboard.dismiss();
    return sheet ? sheet.close(then) : then();
  };

  const [draft, setDraft] = useState<TransactionDraft>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [amountFocused, setAmountFocused] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);
  const keyboardLift = useKeyboardLift(spacing.xxl + insets.bottom);
  // One per field, so the first invalid one shakes on Save (design.md, Motion, "Invalid Save").
  const shakes: Record<DraftField, ReturnType<typeof useShake>> = {
    amount: useShake(),
    category: useShake(),
    date: useShake(),
    note: useShake(),
  };

  // Refs, not state: a second tap in the same frame must already see the first one.
  const busy = useRef(false);
  const finished = useRef(false);
  const pendingLeave = useRef<(() => void) | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const amountRef = useRef<TextInput>(null);
  const noteRef = useRef<TextInput>(null);
  const dateLabelRef = useRef<Text>(null);
  const categoryLabelRef = useRef<Text>(null);
  // Field positions inside the fields container, plus that container's own offset in the scroll.
  const fieldsTop = useRef(0);
  const fieldY = useRef<Partial<Record<DraftField, number>>>({});

  // FR-010: raw text for amount and note, values for the rest.
  const dirty =
    draft.amountText !== initial.amountText ||
    draft.note !== initial.note ||
    draft.type !== initial.type ||
    draft.date !== initial.date ||
    draft.category !== initial.category;

  const confirm = useConfirmDialog();
  const confirmDiscard = (leave: () => void) => {
    if (!dirty) return leave();
    confirm.ask({
      title: 'Discard changes?',
      message: 'What you entered will be lost.',
      cancel: 'Keep editing',
      confirm: 'Discard',
      onConfirm: leave,
    });
  };

  // Every way out (the close button, Android's back button and gestures, dragging the sheet
  // down) is held here, so the sheet can slide down first: a clean form or a Discard animates,
  // then navigates; changes ask first. While an operation runs, leaving waits for it (contract,
  // Form states). After a save or delete the sheet has already closed, so it just navigates.
  usePreventRemove(true, ({ data }) => {
    // A back while the sheet slides down is dropped: its navigation is already coming.
    if (sheet?.sliding()) return;
    const navigate = () => navigation.dispatch(data.action);
    if (finished.current) return navigate();
    const leave = () => closeSheet(navigate);
    if (busy.current) {
      pendingLeave.current = leave;
      return;
    }
    confirmDiscard(leave);
  });

  const update = <K extends keyof TransactionDraft>(field: K, value: TransactionDraft[K]) => {
    setDraft((d) => ({ ...d, [field]: value }));
    const errorField: DraftField | null =
      field === 'amountText' ? 'amount' : field === 'type' ? null : (field as DraftField);
    if (errorField) setErrors(({ [errorField]: _, ...rest }) => rest);
  };

  const changeType = (next: TransactionType) => {
    if (next === draft.type) return;
    // FR-012: categories belong to a type, so a type change needs a new one.
    haptics.select();
    setDraft((d) => ({ ...d, type: next, category: null }));
    setErrors(({ category: _, ...rest }) => rest);
  };

  const openDatePicker = () => {
    // "Today" is read when the dialog opens, so a form left open past midnight allows the new day.
    const today = getToday();
    DateTimePickerAndroid.open({
      mode: 'date',
      // A stored date after today opens on today; the field keeps the stored date until a pick.
      value: localDate(draft.date > today ? today : draft.date),
      minimumDate: MIN_PICKER_DATE,
      maximumDate: localDate(today),
      onValueChange: (_event, picked) => update('date', toIsoDate(picked)),
    });
  };

  const focusField = (field: DraftField) => {
    if (field === 'amount') return amountRef.current?.focus();
    if (field === 'note') return noteRef.current?.focus();
    // Date and category have no text input: scroll them into view and move the screen reader
    // to their label (contracts/ui-screens.md, FR-009).
    const y = fieldY.current[field];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: fieldsTop.current + y, animated: true });
    const label = field === 'date' ? dateLabelRef.current : categoryLabelRef.current;
    const tagNumber = label ? findNodeHandle(label) : null;
    if (tagNumber) AccessibilityInfo.setAccessibilityFocus(tagNumber);
  };

  const run = async (operation: () => Promise<FormResult>) => {
    if (busy.current) return;
    busy.current = true;
    setFailure(null);
    let result: FormResult;
    try {
      result = await operation();
    } finally {
      busy.current = false;
    }
    if (result === null) {
      finished.current = true;
      pendingLeave.current = null;
      closeSheet(onDone);
      return;
    }
    setFailure(result);
    const leave = pendingLeave.current;
    pendingLeave.current = null;
    if (leave) confirmDiscard(leave);
  };

  const save = () => {
    if (busy.current) return;
    // Today is read again on Save (contract): the form may have stayed open past midnight.
    const result = validateDraft(draft, getToday());
    if (!result.ok) {
      setErrors(result.errors);
      setFailure(null);
      focusField(result.firstInvalid);
      shakes[result.firstInvalid].shake();
      haptics.invalid();
      return;
    }
    setErrors({});
    void run(() => onSave(result.input));
  };

  // FR-013: deletion cannot be undone, so it is confirmed first; Cancel changes nothing.
  const confirmDelete = (remove: () => Promise<FormResult>) => {
    if (busy.current) return;
    confirm.ask({
      title: 'Delete this transaction?',
      message: "This can't be undone.",
      cancel: 'Cancel',
      confirm: 'Delete',
      onConfirm: () => void run(remove),
    });
  };

  const position = currencyPosition(tag);
  const currency = (
    <Text
      testID="currency"
      maxFontSizeMultiplier={AMOUNT_MAX_SCALE}
      style={[type.currencySuffix, { color: colors.textMuted }]}
    >
      €
    </Text>
  );
  const amountError = errors.amount && messageFor(errors.amount, tag);
  const dateError = errors.date && messageFor(errors.date, tag);
  const categoryError = errors.category && messageFor(errors.category, tag);
  const noteError = errors.note && messageFor(errors.note, tag);
  const categoryValue = draft.category
    ? labelFor(draft.type, draft.category as CategoryKey)
    : 'required';

  const fieldLabel = (label: string, value: string, error?: string) =>
    [label, value, error].filter(Boolean).join(', ');

  return (
    // The sheet around it draws the fill and the header (routes render both).
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Type"
          style={[
            styles.segmentTrack,
            // The 1 dp border only keeps the track's size; flat look (design.md).
            { backgroundColor: colors.segmentTrack, borderColor: 'transparent' },
          ]}
        >
          <TypeIndicator
            index={draft.type === 'expense' ? 0 : 1}
            inset={TRACK_PADDING}
            gap={spacing.xxs}
          />
          {(['expense', 'income'] as const).map((option) => {
            const checked = draft.type === option;
            const label = option === 'expense' ? 'Expense' : 'Income';
            return (
              <ShapePressable
                key={option}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ checked }}
                onPress={() => changeType(option)}
                style={styles.segment}
              >
                <Text
                  style={[
                    checked ? type.bodyStrong : type.body,
                    { color: checked ? colors.text : colors.textMuted },
                  ]}
                >
                  {label}
                </Text>
              </ShapePressable>
            );
          })}
        </View>

        <Animated.View
          testID="field-amount"
          style={[styles.amountBlock, keyboardLift.amountPadding, shakes.amount.style]}
        >
          <Text style={[type.label, { color: colors.textMuted }]}>Amount</Text>
          {/* The whole row is tappable, so the field is easy to hit whatever the amount's width. */}
          <Pressable
            accessible={false}
            onPress={() => amountRef.current?.focus()}
            style={styles.amountRow}
          >
            {position === 'before' && currency}
            <TextInput
              ref={amountRef}
              testID="amount-input"
              accessibilityLabel={fieldLabel('Amount', draft.amountText || 'required', amountError)}
              value={draft.amountText}
              onChangeText={(text) => update('amountText', text)}
              keyboardType="decimal-pad"
              // A hint of the expected shape now that the form opens without the keyboard.
              placeholder={`0${formSeparator(tag)}00`}
              placeholderTextColor={colors.textMuted}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              maxFontSizeMultiplier={AMOUNT_MAX_SCALE}
              style={[
                type.amountInput,
                styles.amountInput,
                // Income reads green at a glance (fine-tuning 2026-10-06).
                { color: draft.type === 'income' ? colors.income : colors.text },
                draft.amountText.length > LONG_AMOUNT && { fontSize: LONG_AMOUNT_SIZE },
              ]}
            />
            {position === 'after' && currency}
          </Pressable>
          <View
            style={[
              styles.underline,
              {
                backgroundColor: amountError
                  ? colors.error
                  : amountFocused
                    ? colors.accent
                    : colors.underlineIdle,
              },
            ]}
          />
          {amountError && <FieldError message={amountError} />}
        </Animated.View>

        <View style={styles.fields} onLayout={(e) => (fieldsTop.current = e.nativeEvent.layout.y)}>
          <Animated.View
            testID="field-category"
            style={shakes.category.style}
            onLayout={(e) => (fieldY.current.category = e.nativeEvent.layout.y)}
          >
            <Text
              ref={categoryLabelRef}
              accessibilityLabel={fieldLabel('Category', categoryValue, categoryError)}
              style={[type.label, styles.fieldLabel, { color: colors.textMuted }]}
            >
              Category
            </Text>
            <View
              style={[
                styles.chipGroup,
                { borderColor: categoryError ? colors.error : 'transparent' },
              ]}
            >
              {categoriesFor(draft.type).map((c) => (
                <CategoryTile
                  key={c.key}
                  type={draft.type}
                  categoryKey={c.key}
                  label={c.label}
                  selected={draft.category === c.key}
                  onPress={() => {
                    if (draft.category !== c.key) haptics.select();
                    update('category', c.key);
                  }}
                />
              ))}
            </View>
            {categoryError && <FieldError message={categoryError} />}
          </Animated.View>

          {/* Date and Note as one list card, like the iOS Settings rows (fine-tuning 2026-10-06). */}
          <View
            style={[styles.details, { backgroundColor: colors.surfaceMuted }]}
            onLayout={(e) => (fieldY.current.date = e.nativeEvent.layout.y)}
          >
            <Animated.View style={[styles.detailRow, { borderBottomColor: colors.divider }, shakes.date.style]}>
              <Feather name="calendar" size={iconSize.button} color={colors.textMuted} />
              <Text
                ref={dateLabelRef}
                accessibilityLabel={fieldLabel('Date', formatSpokenDate(draft.date), dateError)}
                style={[type.body, { color: colors.text }]}
              >
                Date
              </Text>
              <ShapePressable
                testID="date-box"
                accessibilityRole="button"
                accessibilityLabel={fieldLabel('Date', formatSpokenDate(draft.date), dateError)}
                onPress={openDatePicker}
                style={[styles.box, styles.dateValue, fieldBorderStyle(colors, { invalid: !!dateError })]}
              >
                <Text style={[type.body, { color: colors.textMuted }]}>
                  {formatNumericDate(draft.date, tag)}
                </Text>
                <Feather name="chevron-right" size={iconSize.button} color={colors.textMuted} />
              </ShapePressable>
            </Animated.View>
            <Animated.View style={[styles.detailRow, styles.lastDetailRow, shakes.note.style]}>
              <Feather name="edit-3" size={iconSize.button} color={colors.textMuted} />
              <Text importantForAccessibility="no" style={[type.body, { color: colors.text }]}>
                Note
              </Text>
              <TextInput
                ref={noteRef}
                testID="note-input"
                accessibilityLabel={fieldLabel('Note (optional)', draft.note, noteError)}
                value={draft.note}
                // Cut by visible characters, not maxLength, which counts UTF-16 units (FR-007).
                onChangeText={(text) => update('note', cutToGraphemes(text, NOTE_MAX_GRAPHEMES))}
                placeholder="Add a note (optional)"
                placeholderTextColor={colors.textMuted}
                onFocus={() => setNoteFocused(true)}
                onBlur={() => setNoteFocused(false)}
                style={[
                  type.body,
                  styles.box,
                  styles.noteInput,
                  { color: colors.text },
                  fieldBorderStyle(colors, { invalid: !!noteError, focused: noteFocused }),
                ]}
              />
            </Animated.View>
          </View>
          {dateError && <FieldError message={dateError} />}
          {noteError && <FieldError message={noteError} />}
        </View>
        {/* As much room as the footer rose, so Date and Note scroll above it (contract). */}
        <Animated.View testID="keyboard-spacer" style={keyboardLift.spacer} />
      </ScrollView>

      <Animated.View
        testID="form-footer"
        // Its own fill: risen over the fields, it must not leave its text over them.
        style={[
          styles.footer,
          { paddingBottom: spacing.xxl + insets.bottom, backgroundColor: colors.formBackground },
          keyboardLift.footer,
        ]}
      >
        {/* Announced when it appears, so a TalkBack user learns that Save or Delete failed. */}
        <View accessibilityLiveRegion="polite">{failure && <FieldError message={failure} />}</View>
        {/* Only Save rides above the keyboard: Delete fades and folds away while it opens, and
            comes back when it closes (fine-tuning 2026-10-07). */}
        {onDelete && (
          <Animated.View testID="delete-slot" style={[styles.deleteSlot, keyboardLift.deleteSlot]}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Delete"
              onPress={() => confirmDelete(onDelete)}
              android_ripple={{ color: colors.ripple }}
              style={styles.textButton}
            >
              <Text style={[type.labelStrong, { color: colors.error }]}>Delete</Text>
            </PressableScale>
          </Animated.View>
        )}
        {/* Flat look: a solid accent fill, no gradient, border or highlight (design.md). */}
        <ShapePressable
          accessibilityRole="button"
          accessibilityLabel="Save"
          onPress={save}
          overlay={colors.rippleOnAccent}
          // The balance card's deep blue, so the form belongs to the same app (fine-tuning
          // 2026-10-06).
          style={[styles.saveButton, { experimental_backgroundImage: cardTones.positive.cardGlass }]}
        >
          <Text style={[type.button, { color: cardTones.positive.cardInk }]}>Save</Text>
        </ShapePressable>
      </Animated.View>
      {confirm.dialog}
    </View>
  );
}

/** The form's header: close button and centered title. Also used by the edit form while loading. */
export function FormHeader({ title, onClose }: { title: string; onClose(): void }) {
  const { colors, type } = useTheme();
  return (
    // The sheet already sits below the status bar, under its grab handle.
    <View testID="form-header" style={[styles.header, { paddingTop: spacing.xs }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        // A rounded view does not clip its own ripple; a borderless one draws a circle instead
        // (design.md, Touch feedback).
        android_ripple={{ color: colors.ripple, borderless: true, radius: minTouch / 2 }}
        style={[
          styles.roundButton,
          { backgroundColor: colors.surfaceMuted, borderColor: 'transparent' },
        ]}
      >
        <Feather name="x" size={iconSize.button} color={colors.text} />
      </PressableScale>
      <Text accessibilityRole="header" style={[type.title, styles.title, { color: colors.text }]}>
        {title}
      </Text>
      <View style={styles.slot} />
    </View>
  );
}

/**
 * A category as a small tile with its icon in its own color, like the summary's tiles. Picking
 * it fills the tile with a stronger tint of that color and outlines it in the color (the 1 dp
 * border is always there, so nothing shifts; fine-tuning 2026-10-06).
 */
function CategoryTile({
  type: txType,
  categoryKey,
  label,
  selected,
  onPress,
}: {
  type: TransactionType;
  categoryKey: CategoryKey;
  label: string;
  selected: boolean;
  onPress(): void;
}) {
  const { colors, type, scheme } = useTheme();
  const look = categoryLook(txType, categoryKey, scheme, colors);
  return (
    <ShapePressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.tile,
        {
          backgroundColor: selected ? look.tint : colors.surfaceMuted,
          borderColor: selected ? look.ink : 'transparent',
        },
      ]}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        style={[styles.tileIcon, { backgroundColor: selected ? colors.surface : look.tint }]}
      >
        <Feather name={look.icon} size={iconSize.button} color={look.ink} />
      </View>
      {/* Same weight when picked, so the label never grows; a long word shrinks a little
          instead of spilling out of a narrow tile. */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[type.label, styles.tileLabel, { color: colors.text }]}
      >
        {label}
      </Text>
    </ShapePressable>
  );
}

function FieldError({ message }: { message: string }): ReactNode {
  const { colors, type } = useTheme();
  return (
    <View style={styles.error}>
      <View importantForAccessibility="no-hide-descendants">
        <Feather name="alert-circle" size={iconSize.message} color={colors.error} />
      </View>
      <Text style={[type.labelStrong, styles.flex, { color: colors.error }]}>{message}</Text>
    </View>
  );
}

/**
 * The footer follows the keyboard frame by frame on the UI thread and sits 12 dp above it; with
 * the keyboard closed it rests `restBottom` above the screen's bottom edge (design.md, Keyboard
 * open). Both translucent flags keep Reanimated from adding its own system bar margins: the app is
 * edge-to-edge and pads with the safe area insets itself.
 */
function useKeyboardLift(restBottom: number) {
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  // Only a keyboard that is opening, open or closing counts: a height left over from a keyboard
  // the form never saw close (state closed or unknown) must not raise the footer.
  const height = useDerivedValue(() => {
    const state = keyboard.state.value;
    const live =
      state === KeyboardState.OPENING || state === KeyboardState.OPEN || state === KeyboardState.CLOSING;
    return live ? keyboard.height.value : 0;
  });
  const lift = useDerivedValue(() => Math.max(0, height.value + spacing.sm - restBottom));
  const footer = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value }] }));
  const spacer = useAnimatedStyle(() => ({ height: lift.value }));
  // The amount block tightens from 32/24 to 16/12 as the keyboard's first 120 dp come up, so the
  // amount, chips and Save fit above it (SC-001) and the layout moves with the keyboard, not
  // after it.
  const amountPadding = useAnimatedStyle(() => {
    const t = Math.min(1, height.value / AMOUNT_TIGHTEN_RANGE);
    return {
      paddingTop: spacing.xxxl - (spacing.xxxl - spacing.md) * t,
      paddingBottom: spacing.xl - (spacing.xl - spacing.sm) * t,
    };
  });
  const deleteSlot = useAnimatedStyle(() => {
    const t = Math.min(1, height.value / AMOUNT_TIGHTEN_RANGE);
    return { height: minTouch * (1 - t), opacity: 1 - t };
  });
  return { footer, spacer, amountPadding, deleteSlot };
}

const AMOUNT_TIGHTEN_RANGE = 120;

const BORDER = 2;
const REST_BORDER = 1;
// The track's padding: 4 dp plus the 1 dp the rest border leaves (design.md, borders).
const TRACK_PADDING = spacing.xxs + BORDER - REST_BORDER;

/**
 * design.md, "Borders never shift the layout": at rest a transparent 1 dp border plus 1 dp of extra
 * padding; focused or invalid, a 2 dp border without it, so the field keeps its size. When a field
 * is both, the error wins.
 */
function fieldBorderStyle(colors: Palette, { invalid = false, focused = false }) {
  const active = invalid || focused;
  const extra = active ? 0 : BORDER - REST_BORDER;
  return {
    borderWidth: active ? BORDER : REST_BORDER,
    // Flat look: the resting border is there only to keep the size (design.md).
    borderColor: invalid ? colors.error : focused ? colors.accent : 'transparent',
    paddingHorizontal: spacing.md + extra,
    paddingVertical: extra,
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: { flex: 1, textAlign: 'center' },
  slot: { width: minTouch, height: minTouch },
  roundButton: {
    width: minTouch,
    height: minTouch,
    borderRadius: radii.full,
    borderWidth: REST_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  segmentTrack: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    // The 1 dp border plus 1 dp of extra padding, like the fields (design.md).
    borderWidth: REST_BORDER,
    padding: TRACK_PADDING,
    gap: spacing.xxs,
    borderRadius: radii.segmentTrack,
  },
  segment: {
    flex: 1,
    minHeight: minTouch,
    borderRadius: radii.segment,
    // Reserved so selecting a segment never shifts the layout.
    borderWidth: SEGMENT_BORDER,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountBlock: { paddingHorizontal: spacing.xl, alignItems: 'center', gap: spacing.xs },
  amountRow: {
    alignSelf: 'stretch',
    minHeight: minTouch,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  amountInput: { minWidth: minTouch, padding: 0, textAlign: 'center' },
  underline: { width: 160, height: 3, borderRadius: 2 },
  fields: { paddingHorizontal: spacing.md, gap: spacing.lg },
  fieldLabel: { paddingLeft: spacing.xs, marginBottom: spacing.xs },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    // Reserved border with an 8 dp inset: an error outline never shifts the chips (design.md).
    borderWidth: BORDER,
    borderRadius: radii.input,
    padding: spacing.xs - BORDER,
    margin: -spacing.xs,
  },
  // Four per row; they grow with large text instead of cutting their labels (FR-031).
  tile: {
    flexBasis: '22%',
    flexGrow: 1,
    minHeight: 76,
    borderWidth: REST_BORDER,
    borderRadius: radii.input,
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { textAlign: 'center' },
  details: { borderRadius: radii.input, overflow: 'hidden' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    borderBottomWidth: 1,
  },
  lastDetailRow: { borderBottomColor: 'transparent' },
  dateValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xxs,
  },
  noteInput: { flex: 1, textAlign: 'right' },
  chip: {
    minHeight: minTouch,
    borderWidth: REST_BORDER,
    paddingHorizontal: spacing.md + BORDER - REST_BORDER,
    paddingVertical: BORDER - REST_BORDER,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pair: { flexDirection: 'row', gap: spacing.sm },
  pairStacked: { flexDirection: 'column', gap: spacing.lg },
  // Border and padding come from fieldBorderStyle().
  box: { minHeight: 52, borderRadius: radii.input },
  dateBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  error: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.xs },
  deleteSlot: { overflow: 'hidden', justifyContent: 'center' },
  textButton: {
    alignSelf: 'center',
    minHeight: minTouch,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  saveButton: {
    minHeight: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
