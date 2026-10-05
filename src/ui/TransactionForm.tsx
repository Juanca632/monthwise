import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Alert,
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import { currencyPosition, formatAmountForInput } from '@/format/money';
import { getToday } from '@/hooks/useToday';
import { useRegion } from '@/hooks/useRegion';

import { iconSize, minTouch, radii, spacing, useTheme } from './theme';

/** `null` means the operation succeeded; a string is the form-level failure message to show. */
export type FormResult = string | null;

type Props = {
  title: string;
  initial: TransactionDraft;
  /** New form only: the amount is focused so typing can start right away (SC-001). */
  autoFocusAmount?: boolean;
  onSave(input: TransactionInput): Promise<FormResult>;
  /** Edit form only: shows Delete. */
  onDelete?(): Promise<FormResult>;
  /** Leaves the form after a successful save or delete; the discard guard is already off. */
  onDone(): void;
  /** The close button. Leaving with changes still asks "Discard changes?". */
  onClose(): void;
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

/** The add and edit form (design.md, Transaction form; contracts/ui-screens.md). */
export function TransactionForm({
  title,
  initial,
  autoFocusAmount = false,
  onSave,
  onDelete,
  onDone,
  onClose,
}: Props) {
  const { colors, type, isLargeText } = useTheme();
  const { tag } = useRegion();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [draft, setDraft] = useState<TransactionDraft>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);
  const keyboardOpen = useKeyboardOpen();

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

  const confirmDiscard = (leave: () => void) => {
    if (!dirty) return leave();
    Alert.alert('Discard changes?', undefined, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: leave },
    ]);
  };

  // Covers the close button, Android's back button and gestures. While an operation runs, leaving
  // waits for it (contract, Form states).
  usePreventRemove(dirty || working, ({ data }) => {
    const leave = () => navigation.dispatch(data.action);
    if (finished.current) return leave();
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
    setWorking(true);
    setFailure(null);
    let result: FormResult;
    try {
      result = await operation();
    } finally {
      busy.current = false;
      setWorking(false);
    }
    if (result === null) {
      finished.current = true;
      pendingLeave.current = null;
      onDone();
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
      return;
    }
    setErrors({});
    void run(() => onSave(result.input));
  };

  const close = () => {
    if (busy.current) return;
    onClose();
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

  const amountBlockPadding = keyboardOpen
    ? { paddingTop: spacing.md, paddingBottom: spacing.sm }
    : { paddingTop: spacing.xxxl, paddingBottom: spacing.xl };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.screen, { backgroundColor: colors.formBackground }]}
    >
      <View testID="form-header" style={[styles.header, { paddingTop: spacing.xs + insets.top }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={close}
          android_ripple={{ color: colors.ripple }}
          style={[styles.roundButton, { backgroundColor: colors.surfaceMuted }]}
        >
          <Feather name="x" size={iconSize.button} color={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={[type.title, styles.title, { color: colors.text }]}>
          {title}
        </Text>
        <View style={styles.slot} />
      </View>

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Type"
          style={[styles.segmentTrack, { backgroundColor: colors.segmentTrack }]}
        >
          {(['expense', 'income'] as const).map((option) => {
            const checked = draft.type === option;
            const label = option === 'expense' ? 'Expense' : 'Income';
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ checked }}
                onPress={() => changeType(option)}
                android_ripple={{ color: colors.ripple }}
                style={[
                  styles.segment,
                  checked && { backgroundColor: colors.segmentSelected, borderColor: colors.accent },
                ]}
              >
                <Text
                  style={[
                    checked ? type.bodyStrong : type.body,
                    { color: checked ? colors.text : colors.textMuted },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.amountBlock, amountBlockPadding]}>
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
              autoFocus={autoFocusAmount}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              maxFontSizeMultiplier={AMOUNT_MAX_SCALE}
              style={[
                type.amountInput,
                styles.amountInput,
                { color: colors.text },
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
        </View>

        <View style={styles.fields} onLayout={(e) => (fieldsTop.current = e.nativeEvent.layout.y)}>
          <View onLayout={(e) => (fieldY.current.category = e.nativeEvent.layout.y)}>
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
              {categoriesFor(draft.type).map((c) => {
                const selected = draft.category === c.key;
                return (
                  <Pressable
                    key={c.key}
                    accessibilityRole="button"
                    accessibilityLabel={c.label}
                    accessibilityState={{ selected }}
                    onPress={() => update('category', c.key)}
                    android_ripple={{ color: selected ? colors.rippleOnAccent : colors.ripple }}
                    style={[
                      styles.chip,
                      { backgroundColor: selected ? colors.accent : colors.surfaceMuted },
                    ]}
                  >
                    <Text
                      style={[
                        selected ? type.bodyStrong : type.body,
                        { color: selected ? colors.onAccent : colors.text },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {categoryError && <FieldError message={categoryError} />}
          </View>

          <View
            style={[styles.pair, isLargeText && styles.pairStacked]}
            onLayout={(e) => (fieldY.current.date = e.nativeEvent.layout.y)}
          >
            <View style={!isLargeText && styles.flex}>
              <Text
                ref={dateLabelRef}
                accessibilityLabel={fieldLabel(
                  'Date',
                  formatSpokenDate(draft.date),
                  dateError,
                )}
                style={[type.label, styles.fieldLabel, { color: colors.textMuted }]}
              >
                Date
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={fieldLabel('Date', formatSpokenDate(draft.date), dateError)}
                onPress={openDatePicker}
                android_ripple={{ color: colors.ripple }}
                style={[
                  styles.box,
                  styles.dateBox,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: dateError ? colors.error : 'transparent',
                  },
                ]}
              >
                <Feather name="calendar" size={iconSize.button} color={colors.textMuted} />
                <Text style={[type.body, { color: colors.text }]}>
                  {formatNumericDate(draft.date, tag)}
                </Text>
              </Pressable>
              {dateError && <FieldError message={dateError} />}
            </View>

            <View style={!isLargeText && styles.flex}>
              <Text style={[type.label, styles.fieldLabel, { color: colors.textMuted }]}>
                Note (optional)
              </Text>
              <TextInput
                ref={noteRef}
                accessibilityLabel={fieldLabel('Note (optional)', draft.note, noteError)}
                value={draft.note}
                // Cut by visible characters, not maxLength, which counts UTF-16 units (FR-007).
                onChangeText={(text) => update('note', cutToGraphemes(text, NOTE_MAX_GRAPHEMES))}
                placeholder="Add a note"
                placeholderTextColor={colors.textMuted}
                onFocus={() => setNoteFocused(true)}
                onBlur={() => setNoteFocused(false)}
                style={[
                  type.body,
                  styles.box,
                  {
                    color: colors.text,
                    backgroundColor: colors.surfaceMuted,
                    // When focused and invalid, the error border wins (design.md).
                    borderColor: noteError
                      ? colors.error
                      : noteFocused
                        ? colors.accent
                        : 'transparent',
                  },
                ]}
              />
              {noteError && <FieldError message={noteError} />}
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: keyboardOpen ? spacing.sm : spacing.xxl + insets.bottom },
        ]}
      >
        {failure && <FieldError message={failure} />}
        {onDelete && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete"
            onPress={() => void run(onDelete)}
            android_ripple={{ color: colors.ripple }}
            style={styles.textButton}
          >
            <Text style={[type.labelStrong, { color: colors.error }]}>Delete</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save"
          onPress={save}
          android_ripple={{ color: colors.rippleOnAccent }}
          style={[styles.saveButton, { backgroundColor: colors.accent }]}
        >
          <Text style={[type.button, { color: colors.onAccent }]}>Save</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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

/** The layout tightens while the keyboard is open, so amount, chips and Save fit (SC-001). */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(Keyboard.isVisible());
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setOpen(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return open;
}

const BORDER = 2;

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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scrollContent: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  segmentTrack: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    padding: spacing.xxs,
    gap: spacing.xxs,
    borderRadius: radii.segmentTrack,
  },
  segment: {
    flex: 1,
    minHeight: minTouch,
    borderRadius: radii.segment,
    // Reserved so selecting a segment never shifts the layout.
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
  chip: {
    minHeight: minTouch,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pair: { flexDirection: 'row', gap: spacing.sm },
  pairStacked: { flexDirection: 'column', gap: spacing.lg },
  box: {
    minHeight: 52,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    borderWidth: BORDER,
  },
  dateBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, overflow: 'hidden' },
  error: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.xs },
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
    overflow: 'hidden',
  },
});
