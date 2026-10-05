# Design: Record Transactions and Monthly Summary

Visual design for 001, approved by the developer on 2026-10-05. It sets *how the screens look*.
What they contain and how they behave stays in `spec.md` and `contracts/ui-screens.md`; if the two
ever disagree, the contract wins and this file is updated.

Mockups: the HTML sources of the 10 approved artboards (light and dark, every drawn screen) are in
[`design/mockups/`](design/mockups/). Each `.dc.html` file is plain HTML with inline styles and
can be read as a reference. The live canvas is
https://claude.ai/artifact/LnJb7boknHJq2bTT5JjwWN, which only the developer can open. Where this
file and the mockups differ, this file wins: **every value in this file overrides the mockups**. The main differences are 48 dp
touch targets (mockups: 44), no scroll fade, the contrast fixes, a border on the selected segment
(mockups: a shadow), on-scale paddings and radii, a full-width amount field, and the card label
"Balance" (mockups: "Balance this month").

## Direction

Clean and calm, with one clear focal point. The month's **balance** is the most visible element,
on a softly tinted card at the top. Everything else (breakdown, list, form) sits on plain white
(or dark) cards with generous spacing, so nothing competes with it. Color is used sparingly and
always means something:

- **Accent**: actions (Add, Save, the selected category and type).
- **Income**: income amounts and icons.
- **Negative**: the negative-balance card tone, always with the minus sign (FR-015).
- **Error**: validation and failure messages.

The reference is the clarity of modern banking apps (for example Revolut). No brand elements,
colors or assets are copied.

## Typography

- **Typeface**: Manrope (`@expo-google-fonts/manrope`, loaded with `expo-font`), in the weights
  Regular 400, Medium 500, SemiBold 600 and Bold 700. The reason is purely visual: it is part of
  the approved design, and its tabular figures keep amounts aligned. On Android each weight is
  its own font family (`Manrope_600SemiBold`, …), and `theme.ts` maps the tokens below to those
  names.
- **Fallback**: if the font fails to load, `theme.ts` returns the system font with the same
  numeric `fontWeight`, so weights still differ.
- **Numbers**: every token that shows amounts uses tabular figures
  (`fontVariant: ['tabular-nums']`).

| Token | Size (dp) | Weight | Use |
| --- | --- | --- | --- |
| `display` | 54 | Bold, letter spacing −1.5 | Balance amount |
| `amountInput` | 48 | Bold, letter spacing −1 | Amount field in the form |
| `currencySuffix` | 32 | SemiBold | The € next to the amount field |
| `title` | 17 | SemiBold | Form title |
| `monthTitle` | 16 | SemiBold | Month name on the balance card |
| `statAmount` | 16 | Bold | Income and Expenses amounts on the balance card |
| `button` | 16 | SemiBold | Add, Save |
| `section` | 15 | SemiBold | "Spending by category", "Transactions" |
| `body` | 15 | Medium | Rows, chips, inputs, unselected segment |
| `bodyStrong` | 15 | SemiBold | Amounts in rows, category name in list items, selected chip and segment |
| `label` | 14 | Medium | Field labels, "Balance", helper lines |
| `avatarInitial` | 15 | Bold | Category initial in the list avatar |
| `labelStrong` | 14 | SemiBold | Validation and failure messages, text buttons (Delete, Dismiss) |
| `caption` | 13 | Regular | Note and date under a list item |
| `statLabel` | 12 | Medium | "Income" / "Expenses" on the balance card |
| `pill` | 12 | SemiBold | Percent pill |

## Large text (FR-031)

All sizes scale with the system font size. `theme.ts` exposes `isLargeText = fontScale >= 1.3`
(`useWindowDimensions().fontScale`). Nothing may be cut off or overlap, including at the maximum
amount (`999.999,99 €`) and for month totals larger than that.

- **Balance amount** (and the stat amounts): `numberOfLines={1}` plus `adjustsFontSizeToFit`, so
  the whole amount always shrinks to fit the width and never wraps mid-number. Android needs
  `numberOfLines` for this; `minimumFontScale` only works on iOS, so it is not relied on.
  `maxFontSizeMultiplier` is 1.3, because the text is already very large: at most 70 dp before
  shrinking. The space before `€` is non-breaking. All other text wraps.
- **Amount field**: the field takes the full row width with the `€` in the same row.
  `maxFontSizeMultiplier` is 1.3 on both the value and the `€`, because they are already 48 and
  32 dp. When the text is longer than 7 characters, the value steps down to 36.
- **When `isLargeText`**:
  - the two stat pills stack into one column;
  - breakdown rows and list items move the amount (and the percent pill) under the label,
    left-aligned;
  - Date and Note stack into one column.
- **Heights** are minimums (`minHeight`), never fixed, so scaled text grows the control.
- **Check**: quickstart scenario 10 runs at the largest text size with `999.999,99 €`, a month
  total above 10 million, and a 100-character note.

## Color

Chosen by `useColorScheme()` (FR-030). Measured contrast:
- Every text pair is ≥ 4.5:1. The lowest is `accent` on `accentSoft` (light), at 4.84:1, used
  by the percent pill and the banner's Dismiss.
- Control indicators that carry meaning (amount underline, selected segment border, focus and
  error outlines) are ≥ 3:1 against their background.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | `#F6F7F9` | `#0D0F13` | Summary screen background |
| `surface` | `#FFFFFF` | `#171A21` | Cards |
| `formBackground` | `#FFFFFF` | `#0D0F13` | Form screen background |
| `surfaceMuted` | `#F1F3F6` | `#1A1E26` | Chips, inputs, date field, close button, secondary buttons |
| `segmentTrack` | `#F1F3F6` | `#171A21` | Track of the Expense/Income control |
| `segmentSelected` | `#FFFFFF` | `#262B35` | Selected segment fill (plus a 1.5 dp `accent` border) |
| `avatar` | `#F1F3F6` | `#232833` | Category initial circle in list items |
| `divider` | `#EEF0F3` | `#232833` | Row separators |
| `text` | `#0E1116` | `#F2F4F7` | Primary text, chevron and close icons, expense arrow |
| `textMuted` | `#5B6472` | `#9AA3B2` | Labels, captions, placeholders, unselected segment |
| `accent` | `#2F5BEA` | `#7D96FF` | Add, Save, selected chip, selected segment border, focused underline, text buttons |
| `onAccent` | `#FFFFFF` | `#0D0F13` | Text and icons on `accent` |
| `accentSoft` | `#EAF0FF` | `#1E2640` | Percent pill, empty-state icon circle, summary banner |
| `income` | `#0B6B5E` | `#45D3A8` | Income amounts (`+`), income icon and avatar initial |
| `incomeSoft` | `#E3F4EE` | `#12332C` | Income icon circle and avatar |
| `error` | `#B3362A` | `#FF8A7A` | Validation and failure messages, error outlines, Delete |
| `underlineIdle` | `#8A93A3` | `#626B7C` | Amount underline when the field is not focused (≥ 3:1) |
| `ripple` | `#5B6472` at 12 % | `#9AA3B2` at 12 % | Touch feedback on surfaces |
| `rippleOnAccent` | `#FFFFFF` at 20 % | `#0D0F13` at 20 % | Touch feedback on `accent` |

Fields on `surfaceMuted` have a low-contrast fill. They are identified by their always-visible
label above them, as WCAG 1.4.11 allows. The label never disappears.

### Balance card tones

The card has two tones: **positive or zero** and **negative** (balance < 0). The tone changes
the whole card, and a negative amount always keeps its minus sign, so meaning never relies on
color alone. In the loading and error states (no balance yet) the card uses the positive tone.

| Token | Light, positive | Light, negative | Dark, positive | Dark, negative |
| --- | --- | --- | --- | --- |
| `cardBackground` | `#E8EDFF` | `#FCEAE7` | `#161D38` | `#2A1A19` |
| `cardInk` (month title, stat amounts, chevrons) | `#0E1116` | `#0E1116` | `#F2F4F7` | `#F2F4F7` |
| `cardAmount` (balance) | `#1D34A6` | `#B3362A` | `#9DB0FF` | `#FF9A8C` |
| `cardLabel` ("Balance", stat labels, card messages) | `#4A5578` | `#7A4A44` | `#A9B3D6` | `#C9B3AF` |
| `monthButton` | `#FFFFFF` | `#FFFFFF` | `#222A48` | `#3A2523` |
| `statPill` | `#FFFFFF` | `#FFFFFF` | `#1E2541` | `#35211F` |
| `expenseIcon` (circle) | `#ECEEF2` | `#F6DCD8` | `#2A3150` | `#4A2E2B` |
| `cardDecor` | `#2443C7` at 6 % | `#B3362A` at 6 % | `#9DB0FF` at 6 % | `#FF9A8C` at 6 % |

## Spacing, shape and touch

- **Spacing scale (dp)**: 4, 8, 12, 16, 20, 24, 28, 32. Every padding and gap uses it.
- **Inner spacing**:
  - Content cards (breakdown, list, empty, banner): side margin 16.
  - Section titles: padding 16 top and 8 bottom, 24 at the sides.
  - Field labels: an 8 dp left indent and an 8 dp gap above the field.
  - Stat pills: a 12 dp gap between the icon and the text, and 4 between the label and the amount.
  - List items: a 12 dp gap between the avatar and the text, and 4 between the lines.
  - Breakdown rows: an 8 dp gap between the amount and the percent pill.
  - Balance card body: 4 between "Balance" and the amount.
- **Insets**: screens use `react-native-safe-area-context`. The balance card's top margin is
  `12 + insets.top`. The form header's top padding is `8 + insets.top`. The root error screen
  centers its content inside all insets. The Add button and the form's Save footer sit `28 + insets.bottom` above the
  bottom edge. The list's bottom padding is `56 + 28 + 16 + insets.bottom`. Status bar icons
  follow the theme (`expo-status-bar`, `style="auto"`).
- **Radii**: balance card 28; cards 20; stat pills 16; inputs, date field and segmented track 16;
  segments 12; percent pill 8; chips, buttons and icon circles fully rounded.
- **Touch targets**: every tappable element is at least **48 × 48 dp** (FR-031). Text buttons
  (Delete, Dismiss) have `minHeight` 48 and horizontal padding 16. The filled **Try again** button
  has `minHeight` 48 and horizontal padding 24. List rows are at least 64 dp tall.
- **Touch feedback**: every pressable uses `android_ripple` with `ripple`, or `rippleOnAccent`
  on accent buttons. Rounded pressables clip the ripple with `overflow: 'hidden'` on the
  pressable itself. The Add button keeps its shadow on an outer wrapper that does not clip.
- **Elevation**: flat. Only the Add button has a shadow, in light mode only:
  `boxShadow: '0 6px 20px rgba(47,91,234,0.28)'`. Where `boxShadow` is not supported, there is no
  shadow, and that is acceptable.
- **Icons**: Feather from `@expo/vector-icons`: `chevron-left`, `chevron-right`, `plus`, `x`,
  `calendar`, `arrow-up`, `arrow-down`, `alert-circle`, `credit-card`. 20 dp in buttons, 16 dp in
  card circles, 14 dp next to messages.
- **Screen reader**:
  - Decorative elements are hidden (`importantForAccessibility="no-hide-descendants"`): the
    card's circle, the avatars, the icon circles, the empty-state icon and the 14 dp icons next to
    messages.
  - "Balance" plus its amount, each stat pill, each breakdown row and each list row is one
    accessible element, with the label from the contract.
  - The Type control is a container with `accessibilityRole="radiogroup"` and the label "Type".
    Its segments use `accessibilityRole="radio"` with `accessibilityState={{ checked }}`.
  - Chips use `accessibilityRole="button"` with `accessibilityState={{ selected }}`.
  - Every `ActivityIndicator` has `accessibilityLabel="Loading"`.

## Components

### Summary screen

There is no native header (`headerShown: false`); the balance card holds the month controls.

1. **Balance card**: margin `12 + insets.top` top and 12 at the sides; padding 12, with 16 at
   the bottom; radius 28; `overflow: 'hidden'` (for the decorative circle); in the balance tone.
   - Header row: the previous-month button (48 dp circle, `monthButton`, `chevron-left` in
     `cardInk`), the month title (`monthTitle`, `cardInk`) centered, then the next-month button or
     an empty 48 dp slot (FR-021). On January 2000 the previous button is likewise replaced by an
     empty 48 dp slot, so the title stays centered.
   - Body: "Balance" (`label`, `cardLabel`) above the amount (`display`, `cardAmount`), centered,
     with 28 dp above and 24 dp below.
   - Two stat pills in a 2-column grid (gap 8; one column when `isLargeText`), each `statPill`,
     with padding 12 × 16 and radius 16. A pill holds:
     - a 32 dp icon circle: `incomeSoft` with `arrow-up` in `income`, or `expenseIcon` with
       `arrow-down` in `text`;
     - the label (`statLabel`, `cardLabel`);
     - the amount (`statAmount`, `cardInk`).
   - Decorative circle: 260 dp, `cardDecor`, at the top right and partly off the card.
   - **Loading**: header row, then a centered `ActivityIndicator` in `accent` (120 dp tall area).
     No amount and no pills.
   - **Error**: header row, then "Couldn't load your data." (`label`, `cardLabel`) and a
     **Try again** button (`surfaceMuted`, `bodyStrong`, `text`, fully rounded, minHeight 48),
     centered.
2. **Spending by category** (ready state only): a section title (`section`, 24 dp side padding),
   then a card with padding 4 × 16 and its rows:
   - Each row is at least 48 dp tall: the label (`body`) on the left; the amount (`bodyStrong`)
     and the percent pill (`pill` in `accent` on `accentSoft`, padding 4 × 8, radius 8, min width
     32) on the right.
   - Rows are separated by `divider`. Numbers only, no bars (charts are feature 002).
   - With expenses at 0: "No expenses this month." (`body`, `textMuted`) inside the card, with
     padding 16.
3. **Transactions**: a section title, then a card with rows at least 64 dp tall:
   - A 40 dp avatar with the category initial (`avatar` with `textMuted`; income uses
     `incomeSoft` with `income`).
   - The avatar initial uses `avatarInitial`.
   - The category label (`bodyStrong`, `text`) above the note (if any) and the numeric date,
     joined by " · " (`caption`, `textMuted`).
   - The amount on the right (`bodyStrong`): expenses in `text`, income in `income`, both from
     `formatSignedMoney` (`+` / `−` as the region formats them).
4. **Add button**: floating and centered, `28 + insets.bottom` above the bottom. minHeight 56,
   padding 0 × 28, fully rounded. `accent` background, with the `plus` icon and "Add" (`button`)
   in `onAccent`.
5. **Empty month**: the balance card at zero, then a card with padding 32 × 24, centered (no
   "Transactions" title): a 56 dp
   icon circle (`accentSoft`, `credit-card` in `accent`), "No transactions this month yet."
   (`bodyStrong`) and the contract's helper line (`label`, `textMuted`). No breakdown section.
6. **Banner** ("Couldn't open this transaction."): a card on `accentSoft`, radius 16, padding 16,
   placed right under the balance card (above the breakdown). It holds the `alert-circle` icon
   and the message, both in `text` (`label`), and a **Dismiss** text button (`labelStrong`,
   `accent`).
7. **Section titles** use `section` in `text`.

### Transaction form (modal)

There is no native header (`headerShown: false`).

- **Header**: top padding `8 + insets.top`. The close button (48 dp circle, `surfaceMuted`, `x` in
  `text`) is on the left and the title (`title`, `text`) centered.
- **Loading** (edit form, contract): the header, then a centered `ActivityIndicator` in `accent`.
- **Type**: a segmented control. The track is `segmentTrack`, radius 16, padding 4. Each segment
  has minHeight 48 and radius 12.
  - Selected: `segmentSelected` fill, a 1.5 dp `accent` border, and `bodyStrong` text in `text`.
  - Unselected: transparent, `body` text in `textMuted`.
- **Amount**: centered.
  - The label is above, and the value (`amountInput`, `text`) and `€` (`currencySuffix`,
    `textMuted`) share one row.
  - The `€` goes before or after the number, following where the formatting tag's `currency` part
    sits (FR-029).
  - Below the value is a 3 dp underline, 160 dp wide: `accent` when focused, `underlineIdle`
    otherwise, `error` when invalid.
- **Category**: a label, then wrapping chips with gap 8. Each chip has minHeight 48, padding 0 ×
  16, and is fully rounded.
  - Selected: `accent` with `bodyStrong` text in `onAccent`.
  - Unselected: `surfaceMuted` with `body` text in `text`.
- **Date** and **Note**: side by side in 2 columns with gap 12 (one column when `isLargeText`).
  Each field has a label above it, then a box on `surfaceMuted` with minHeight 52, radius 16 and
  padding 0 × 16.
  - The date box shows the `calendar` icon (`textMuted`) and the numeric date (`body`, `text`).
    The note's value is `body` in `text`.
  - The note's placeholder is `textMuted`. When focused, the note gets a 2 dp `accent` border.
- **Borders are reserved**: Date, Note and the chip group always have a 2 dp border, transparent
  by default, so focus or an error never shifts the layout. When a field is both focused and
  invalid, the `error` border wins.
- **Validation** (contract messages):
  - Amount: the underline turns `error`.
  - Category: a 2 dp `error` outline around the chip group, with radius 16 and an 8 dp inset.
  - Date and Note: a 2 dp `error` border on the box.
  - The message (`labelStrong`, `error`, `alert-circle` 14 dp) sits under the field with an 8 dp
    gap.
- **Keyboard open** (SC-001; the target is a 360 × 640 dp screen at the default text size):
  - The form uses `KeyboardAvoidingView` with `behavior="padding"`, and the footer sits right
    above the keyboard with a 12 dp bottom gap; `28 + insets.bottom` applies only when the
    keyboard is closed.
  - The amount block's vertical padding drops from 32/24 to 16/12, so the amount, all expense
    chips and Save fit above the keyboard.
  - **Fallback**, if Block 3b shows they still do not fit on the phone: the chips become a single
    horizontally scrolling row, 48 dp tall. Each chip is still one tap, so SC-001's 4 interactions
    hold. This needs no spec change.
- **Footer**: the fields scroll above it. From top to bottom, it holds:
  - a form-level failure message ("Couldn't save. Your changes are still here.", "Couldn't
    delete.", "This transaction no longer exists."), when there is one, styled like the
    validation message;
  - **Delete** (edit form only): a text button, `labelStrong` in `error`, centered;
  - **Save**: full width, minHeight 56, fully rounded, `accent` with `button` text in `onAccent`.

### Dialogs and the error screen

- "Delete this transaction?" and "Discard changes?" use React Native's `Alert`, the platform's
  native dialog, so they look like Android dialogs and are accessible by default.
- **"Something went wrong."** (root error boundary): on `background`, centered, the message
  (`body`, `text`) and **Try again** (same style as the balance card's Try again).

## Implementation notes

- `src/ui/theme.ts` exports both palettes, the four balance-card tones and `balanceTone()`, the
  type tokens (with the font fallback), spacing, radii, `minTouch = 48` and `isLargeText`.
  Components never hard-code a color or size that has a token.
- The scroll fade above the Add button in the mockups is not built, to avoid a gradient
  dependency; bottom padding does the job.
