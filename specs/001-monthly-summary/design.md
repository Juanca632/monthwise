# Design: Record Transactions and Monthly Summary

Visual design for 001, approved by the developer on 2026-10-05 and revised on 2026-10-06 with a
glass look and motion (sections Glass surfaces, Motion and Haptics). It sets *how the screens look
and move*.
What they contain and how they behave stays in `spec.md` and `contracts/ui-screens.md`; if the two
ever disagree, the contract wins and this file is updated.

Mockups: the HTML sources of the 15 approved artboards (light and dark, keyboard open, edit, loading and error) are in
[`design/mockups/`](design/mockups/). Each `.dc.html` file is plain HTML with inline styles and
can be read as a reference. The live canvas is
https://claude.ai/artifact/LnJb7boknHJq2bTT5JjwWN, which only the developer can open. The
2026-10-06 glass and motion revision has its own sources in
[`design/mockups-glass/`](design/mockups-glass/) (summary dark and light, form, the full
add/keyboard/save/edit/delete flow, and the motion table) and its own canvas,
https://claude.ai/artifact/GBwzqQje2bi89cnwZ3f6z9. Where the two sets differ, the glass set wins, except the form, which follows the
first set's `FormFilledDark` look on the glass set's sliding sheet (developer, 2026-10-06);
the first set still documents layout, states and sizes the glass set does not show. Where this
file and the mockups differ, this file wins: **every value in this file overrides the mockups**. The main differences are 48 dp
touch targets (mockups: 44), no scroll fade, the contrast fixes, a border on the selected segment
(mockups: a shadow), on-scale paddings and radii, a full-width amount field, and the card label
"Balance" (mockups: "Balance this month").

## Direction

Calm, alive and fluid, with one clear focal point. The month's **balance** is the most visible
element, on a tinted glass card at the top. Everything else (breakdown, list, form) sits on
translucent glass cards over a soft ambient background, with generous spacing, so nothing
competes with it. The look is inspired by iOS's Liquid Glass, built with what Android does well
(see Glass surfaces). Motion is short and purposeful: it shows where things come from and go,
and confirms what happened (see Motion and Haptics). Color is used sparingly and always means
something:

- **Accent**: actions (Add, Save, the selected category and type).
- **Income**: income amounts and icons.
- **Negative**: the negative-balance card tone, always with the minus sign (FR-015).
- **Error**: validation and failure messages.
- **Ambient background**: the top glow follows the balance tone (accent when positive or zero,
  coral when negative) and the bottom glow is the income color, so the screen hints at how the
  month is going before anything is read.

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
| `label` | 14 | Medium | Field labels, "Balance", helper lines, list day names |
| `avatarInitial` | 15 | Bold | Category initial in the list avatar |
| `labelStrong` | 14 | SemiBold | Validation and failure messages, text buttons (Delete, Dismiss), list day nets |
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
| `formBackground` | `#FFFFFF` | `#0D0F13` | Form sheet fill (flat form look, Components) |
| `surfaceMuted` | `#F1F3F6` | `#1A1E26` | Form controls: close button, unselected chips, Date, Note; solid fallback for `glassFillStrong` |
| `avatar` | `#F1F3F6` | `#232833` | Solid fallback for `glassAvatar` |
| `segmentTrack` | `#F1F3F6` | `#171A21` | Segmented track (Type) |
| `segmentSelected` | `#FFFFFF` | `#262B35` | Selected segment fill, with a 1.5 dp `accent` border |
| `divider` | `#EEF0F3` | `#232833` | Row separators |
| `text` | `#0E1116` | `#F2F4F7` | Primary text, chevron and close icons, expense arrow |
| `textMuted` | `#5B6472` | `#B0B8C6` | Labels, captions, placeholders, unselected segment |
| `accent` | `#2F5BEA` | `#7D96FF` | Add, Save, selected chip, selected segment border, focused underline, text buttons |
| `onAccent` | `#FFFFFF` | `#0D0F13` | Text and icons on `accent` |
| `accentSoft` | `#EAF0FF` | `#1E2640` | Percent pill, empty-state icon circle, summary banner |
| `income` | `#0B6B5E` | `#45D3A8` | Income amounts (`+`), income icon and avatar initial |
| `incomeSoft` | `#E3F4EE` | `#12332C` | Income icon circle and avatar |
| `error` | `#B3362A` | `#FF8A7A` | Validation and failure messages, error outlines, Delete |
| `underlineIdle` | `#8A93A3` | `#626B7C` | Amount underline when the field is not focused (≥ 3:1) |
| `ripple` | `#5B6472` at 12 % | `#9AA3B2` at 12 % | Touch feedback on surfaces |
| `rippleOnAccent` | `#FFFFFF` at 20 % | `#0D0F13` at 20 % | Touch feedback on `accent` |

Form controls on the sheet use the flat look: solid `surfaceMuted` with no resting border, as in
the approved mockups; each keeps its always-visible label above it, which identifies it (focus
and error borders are ≥ 3:1).

### Balance card tones

The card has two tones: **positive or zero** and **negative** (balance < 0). The tone changes
the whole card, and a negative amount always keeps its minus sign, so meaning never relies on
color alone. In the loading and error states (no balance yet) the card uses the positive tone.

| Token | Light, positive | Light, negative | Dark, positive | Dark, negative |
| --- | --- | --- | --- | --- |
| `cardBackground` | `#E8EDFF` | `#FCEAE7` | `#161D38` | `#2A1A19` |
| `cardInk` (month title, stat amounts, chevrons) | `#0E1116` | `#0E1116` | `#F2F4F7` | `#F2F4F7` |
| `cardAmount` (balance) | `#1D34A6` | `#B3362A` | `#F2F4F7` | `#FF9A8C` |
| `cardLabel` ("Balance", stat labels, card messages) | `#4A5578` | `#7A4A44` | `#D5DBF0` | `#E6D6D2` |
| `monthButton` | `#FFFFFF` | `#FFFFFF` | `#222A48` | `#3A2523` |
| `statPill` | `#FFFFFF` | `#FFFFFF` | `#1E2541` | `#35211F` |
| `expenseIcon` (circle) | `#ECEEF2` | `#F6DCD8` | `#2A3150` | `#4A2E2B` |
| `cardDecor` | `#2443C7` at 6 % | `#B3362A` at 6 % | `#9DB0FF` at 6 % | `#FF9A8C` at 6 % |

With the glass revision, `cardBackground` is the solid fallback; the card itself draws the
`cardGlass` gradient from Glass surfaces on top of the ambient background. `cardDecor` (the
decorative circle) is dropped: the ambient glow replaces it.

## Spacing, shape and touch

- **Spacing scale (dp)**: 4, 8, 12, 16, 20, 24, 28, 32. Every padding and gap uses it.
- **Inner spacing**:
  - Content cards (breakdown, list, empty, banner): side margin 16.
  - Section titles: padding 16 top and 8 bottom, 24 at the sides.
  - Field labels: an 8 dp left indent and an 8 dp gap above the field.
  - Stat pills: a 12 dp gap between the icon and the text, and 4 between the label and the amount.
  - List items: a 12 dp gap between the avatar and the text, and 4 between the lines.
  - Breakdown rows: an 8 dp gap between the amount and the percent pill.
  - Balance card body: 4 between "Balance" and the amount; 28 above the error message.
  - Banner: 12 above it. Empty-state card: 28 above it and a 12 dp gap between its items.
- **Insets**: screens use `react-native-safe-area-context`. The balance card's top margin is
  `12 + insets.top`. The form sheet's top edge is `36 + insets.top`, and its header's top padding is 8, under the grab handle. The root error screen
  centers its content inside all insets. The Add button and the form's Save footer sit `28 + insets.bottom` above the
  bottom edge. The list's bottom padding is `56 + 28 + 16 + insets.bottom`. Status bar icons
  follow the theme (`expo-status-bar`, `style="auto"`).
- **Radii**: balance card 28; cards 20; stat pills 16; banner, inputs, date field and segmented track 16;
  segments 12; percent pill 8; chips, buttons and icon circles fully rounded.
- **Touch targets**: every tappable element is at least **48 × 48 dp** (FR-031). Text buttons
  (Delete, Dismiss) have `minHeight` 48 and horizontal padding 16. The filled **Try again** button
  has `minHeight` 48 and horizontal padding 24. List rows are at least 64 dp tall.
- **Touch feedback**: `overflow: 'hidden'` does not clip `android_ripple` to a rounded shape
  (the glass spike showed a square ripple at radius 999 and at 24; 2026-10-06), so the feedback
  depends on the shape:
  - **Circular icon buttons** (month arrows, the form's close button): `android_ripple` with
    `ripple`, `borderless: true` and `radius` = half the button (24), which draws a circle.
  - **Other pressables with their own rounded shape** (Add, Save, chips, Type segments, the
    Date box, **Try again** on the balance card and on the error screen): no `android_ripple`.
    An overlay inside the shape (clipped by `overflow: 'hidden'`, which does clip children) shows
    `ripple`, or `rippleOnAccent` on accent buttons, from press-in until release, with no fade;
    the press scale (Motion) comes with it. Under reduce motion the overlay stays and the scale
    goes.
  - **List rows and the banner's Dismiss** keep `android_ripple` with `ripple`, clipped by a
    parent view with `overflow: 'hidden'`: the banner's inner view for Dismiss, and for each list
    row the view that draws its part of the list card (rounded on the first and last rows; see
    Components). The spike only showed that a view does not clip its own ripple, so
    this is checked on the phone (first and last row, Dismiss): if the card's corners
    show a square ripple, they switch to the pressed overlay. **Delete** in the form footer has
    no card around it, so its ripple is its 48 dp-high rectangle, which is accepted.
  - Stat pills and breakdown rows are not pressable: no feedback and no button role.
- **Elevation**: see Glass surfaces. The balance and breakdown cards get a soft outer shadow and
  a 1 dp inner top highlight; the transaction list card gets only the highlight, and the banner
  and empty-state card get neither (Components). Accent buttons and the selected chip have no outer glow: on the phone it drew a white
  rectangle around the button (glass spike, 2026-10-06). Where `boxShadow` is not supported (outer
  shadows need Android 9, inset ones Android 10), there is no shadow, and that is acceptable.
- **Icons**: Feather from `@expo/vector-icons`: `chevron-left`, `chevron-right`, `plus`, `x`,
  `calendar`, `arrow-up`, `arrow-down`, `alert-circle`, `credit-card`, `check` (toast). 20 dp in buttons, 16 dp in
  card circles, 14 dp next to messages.
- **Screen reader**:
  - Decorative elements are hidden (`importantForAccessibility="no-hide-descendants"`): the
    ambient background, the avatars, the icon circles, the empty-state icon and the 14 dp icons next to
    messages.
  - "Balance" plus its amount, each stat pill, each breakdown row and each list row is one
    accessible element, with the label from the contract. Each list day header is a heading
    (`accessibilityRole="header"`) with the contract's label ("Today, net minus 30,00 €").
  - The Type control is a container with `accessibilityRole="radiogroup"` and the label "Type".
    Its segments use `accessibilityRole="radio"` with `accessibilityState={{ checked }}`.
  - Chips use `accessibilityRole="button"` with `accessibilityState={{ selected }}`.
  - Every `ActivityIndicator` has `accessibilityLabel="Loading"`.

## Glass surfaces

Android has no native Liquid Glass (`expo-glass-effect` is iOS 26 only). The look is built from
three layers that work on every Android version the app supports, with no real blur:

1. **Ambient background**: behind the summary, two large soft glows drawn as radial gradients on
   `background`: top-left, about 340 dp, `ambientTop` (follows the balance tone); bottom-right,
   about 300 dp, `ambientBottom` (income color). Decorative: hidden from the screen reader.
2. **Glass fill**: summary cards and controls are translucent (the form is flat, Components), so the glow shows through, with a 1 dp
   border and a 1 dp inner top highlight (`boxShadow` inset; Android 10+, none before, which is
   acceptable).
3. **Depth**: a soft outer shadow on cards (`boxShadow`; Android 9+). Accent buttons have no
   glow (see Elevation).

No real blur in 001: everything behind a surface is already a smooth glow, so blurring it would
look almost the same and cost frames while the sheet moves. (`expo-blur` was evaluated for this
and is not used. The spike tried it again on a clear-glass Add button over scrolling rows, with
the iOS Liquid Glass layers: on the phone it looked worse than the accent gradient, almost
invisible in light, so it stays out; 2026-10-06.)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `ambientTop` (positive or zero) | `#2F5BEA` at 22 % | `#7D96FF` at 30 % | Top glow |
| `ambientTop` (negative) | `#B3362A` at 16 % | `#FF9A8C` at 24 % | Top glow, negative month |
| `ambientBottom` | `#0B6B5E` at 12 % | `#45D3A8` at 18 % | Bottom glow |
| `glassFill` | `#FFFFFF` at 72 % | `#FFFFFF` at 5 % | Breakdown and list cards on the summary |
| `glassFillStrong` | `#FFFFFF` at 85 % | `#FFFFFF` at 8 % | Stat pills and month buttons on the balance card |
| `glassBorder` | `#FFFFFF` at 95 % | `#FFFFFF` at 10 % | 1 dp border of summary cards and stat pills |
| `glassBorderStrong` | `#0E1116` at 6 % | `#FFFFFF` at 14 % | 1 dp border of the balance card and month buttons; top edge of the sheet |
| `glassHighlight` | `#FFFFFF` | `#FFFFFF` at 10 % | `inset 0 1px 0` top highlight |
| `glassShadow` | `0 8px 24px` `#0E1116` at 5 % | `0 20px 40px` `#000000` at 35 % | Balance and breakdown cards (balance card in light: `0 18px 40px` `#1D34A6` at 12 %, the `cardShadow` token); not the list card (Components) |
| `glassDivider` | `#0E1116` at 6 % | `#FFFFFF` at 7 % | Row separators on glass cards (replaces `divider` there) |
| `glassAvatar` | `#F1F3F6` | `#FFFFFF` at 7 % | Expense avatar circle (income keeps `incomeSoft`) |
| `sheetFill` | `#FFFFFF` | gradient `#1E222E` → `#0E1016` | The toast (the form sheet is flat, `formBackground`) |
| `fieldFill` | `#0E1116` at 6 % | `#FFFFFF` at 6 % | The error screen's **Try again** (the form uses the flat look) |
| `fieldBorder` | `#7D8696` | `#FFFFFF` at 38 % | 1 dp border of the error screen's **Try again** |
| `scrim` | `#000000` at 45 % | `#000000` at 45 % | Dims the summary behind the sheet |
| `bannerFill` | `#EAF0FF` | `#1E2640` at 60 % | The banner (`accentSoft` tint, Components) |
| `accentGradient` | `#3D66EF` → `#2F5BEA` | `#A0B2FF` → `#7089FA` | Add and Save fill (see "Accent buttons") |
| `accentBorder` | `#FFFFFF` at 35 % | `#FFFFFF` at 40 % | 1 dp border of Add and Save |
| `bottomFade` | `background` at 0 → 45 % | `background` at 0 → 45 % | The 96 dp fade behind Add |
| `rowFlash` | `accent` at 22 % | `accent` at 22 % | An edited row's flash (Motion, "Saved") |

The balance-tone tokens `ambientTop` (above), `cardGlass` and `cardShadow` (below) live with the
other per-tone tokens in `theme.ts` (`cardTones`).

- **`cardGlass`** (balance card): a 160° linear gradient. Dark positive: `#9DB0FF` at 12 % →
  `#FFFFFF` at 3 %; dark negative: `#FF9A8C` at 12 % → 4 %. Light positive: `#FFFFFF` at 78 % →
  `#E8EDFF` at 55 %; light negative: `#FFFFFF` at 78 % → `#FCEAE7` at 60 %. Border
  `glassBorderStrong`, highlight `glassHighlight`, shadow as in `glassShadow`.
- **Accent button** (Add): `accentGradient`, a 1 dp `accentBorder` and the inner
  highlight; no glow. Text and icon in `onAccent` (dark ≥ 6.0:1, light ≥ 4.8:1 at every stop).
  The fill stays opaque: a translucent accent drops `onAccent` text below 4.5:1 (light 3.8:1 even
  at 85 %), and the developer preferred this look over clear glass on the phone.
- **Selected chip** (flat form look): solid `accent` with `bodyStrong` in `onAccent`; no highlight, no glow.
  It keeps the unselected chip's 1 dp border and 1 dp extra padding, with the border in `accent`
  (invisible on the `accent` fill), so selecting never adds or removes a border or shifts the
  layout.
- **Selected segment** (flat form look): one indicator that slides between the two options
  (Motion), filled `segmentSelected` on `segmentTrack`, with a 1.5 dp full `accent` border
  (dark 5.2:1 against its fill and 6.4:1 against the track; light 5.5:1 and 5.0:1).
- Cards and the toast put their outer shadow on an outer wrapper that does not clip; the fill,
  gradient and content go on an inner view that clips with `overflow: 'hidden'`. Pressables with
  their own shape clip their gradient and pressed overlay the same way (see Touch feedback).
- A border is never added or removed while the app runs (removing one from a view with a gradient
  closed Expo Go in the spike). Its color can change, and on form fields its width too, as
  "Borders never shift the layout" describes.

**Contrast over glass** (WCAG ratios computed by blending each layer at the glow's peak, the
worst case; 2026-10-06): dark `cardLabel` positive `#D5DBF0` 6.6:1, negative `#E6D6D2` 6.8:1;
dark negative `cardAmount` 4.7:1; dark `textMuted` `#B0B8C6` 4.9:1 on a list card at the peak;
light `textMuted` 5.4:1, light `cardLabel` 6.8:1. These new dark values replace the old ones in
the Color and Balance card tones tables.

## Motion

Built with `react-native-reanimated` (UI thread; the counted amounts are the one exception, see "Counting amounts"). Short, quiet and purposeful: motion shows
where things come from and confirms what happened. Curves: **ease-out** `(0.2, 0.8, 0.2, 1)`,
**sheet** `(0.2, 0.9, 0.25, 1)`, **ease-in** `(0.4, 0, 1, 1)`, **spring** damping 15, stiffness 300.

| Moment | What moves | Time | Curve |
| --- | --- | --- | --- |
| Summary appears (cold start) | Balance card, breakdown, then Add with the first row, then the other rows of the first screen (up to 8) rise 14 dp and fade in, 80 ms apart. Rows that appear later by scrolling never animate | 520 ms | ease-out |
| Open a form | The sheet slides up from the bottom; behind it the summary scales to 92 %, moves down 6 dp and rounds to radius 28, and the `scrim` fades in over it | 440 ms | sheet |
| Close a form | The sheet slides down; the summary and scrim return | 300 ms | ease-in |
| Drag the sheet | It follows the finger downward (never above its resting place); the summary and scrim follow in proportion. Released past 30 % of its height or with a fast downward fling, it closes; otherwise it springs back | follows the finger | spring |
| Change month | The month's content (the card's numbers, not its header row; the breakdown or empty card; the first 8 rows) slides 18 dp in from the side of the button tapped and fades in. The new month's amounts show at once: counting is only for a change within the month on screen (Saved, Deleted; developer, 2026-10-06) | 340 ms | ease-out |
| Press | Any button, chip or row scales to 96 % and springs back | spring, settles in about 400 ms with a slight overshoot | spring |
| Type switch | The selected segment indicator slides to the other option, clamped so it never passes it; the labels' weight and color switch at once | spring, settles in about 400 ms | spring |
| Pick a category | The chip's solid accent fill fades in and the previous chip's fades out; the label's color crossfades with the fill, so it stays readable; the border color switches at once | 220 ms | ease-out |
| Keyboard opens or closes | The footer (Delete, Save) moves with the keyboard frame by frame (`useAnimatedKeyboard`), and the amount block's vertical padding goes from 32/24 to 16/12 as the keyboard's first 120 dp come up. Date and Note stay in place and reachable by scrolling (contract) | follows the keyboard | — |
| Saved | The sheet closes; a new row grows into the list (height and fade, from 97 %); an edited row flashes `accent` at 22 % and fades; totals in the month on screen count to the new values; the toast shows | 560 ms | ease-out |
| Deleted | The sheet closes; the row slides 24 dp right, fades and collapses; totals count; the toast shows | 280 ms | ease-in |
| Invalid Save | The first invalid field (its label, control and message together) shakes 6 dp three times; the other invalid fields only show their messages | 300 ms | ease-in-out |
| Toast | Rises 16 dp and fades in, stays, fades out | 1800 ms in total | ease-out |
| Tone change | The balance card fill and the top glow crossfade between tones | 600 ms | ease-out |

How each is built:

- **Sheet**: the two form routes use a transparent modal presentation, so the summary stays
  drawn behind. One shared value in the root layout (0 closed, 1 open) drives the sheet's
  position, the summary's scale, offset and radius, and the scrim's opacity. Dimming is the
  scrim overlay, not `filter: brightness()`, so it works on every Android version.
- **While the edit form loads** there is no form yet, so nothing can be lost: X or back
  closes the sheet at once, without the slide (the summary behind returns at once too).
- **Closing always goes through the discard check** (FR-010): X, the back button or gesture,
  and a drag released past the threshold all first run the same check as today. With unsaved
  changes, the sheet springs back to open and "Discard changes?" appears; it slides down only
  after **Discard**, or right away when nothing changed. Save and Delete close it after their
  own flow (Delete after its confirmation, FR-013). There is no scrim tap to close. The drag
  uses `react-native-gesture-handler`, on the grab handle and header only, so it never fights
  the form's scroll.
- **Counting amounts** (only for a save or delete in the month on screen; a month change shows
  the new amounts at once): a timer on the JS thread moves the value from the old to the new cents
  along the ease-out curve and writes the rounded value into React state every 50 ms (the
  value only ever reaches the screen through React state, so a Reanimated value would add a
  thread hop and nothing else), and a normal `Text` shows it, so `numberOfLines={1}`, `adjustsFontSizeToFit` and `maxFontSizeMultiplier` (Large
  text) keep working. The amount `Text` is not accessible on its own; its parent element keeps
  the label built from the final data ("Balance, minus 150,00 €"), so TalkBack never reads a
  number in between.
- **Gradient crossfades**: a gradient string cannot be interpolated, so each tone change stacks
  the old and new gradient layers and fades the new one's opacity in.
- **Lists**: row enter and exit animations apply only to the row added, edited or deleted, once a
  reload that reflects the change arrives (after the sheet closes; for a save that moved the
  summary to another month, once that month has loaded),
  never to rows mounting while scrolling, which keeps SC-004's 1,000-row month smooth.
- **Entrance and month slide** are decided once, when the content mounts. A month slide wins
  when the month changed less than 1 s before; otherwise content mounting less than 1.5 s after
  the summary first mounted rises in. Content arriving later (a very slow first query or month)
  just appears. Only the first 8 items of the list (day headers and rows) can do either. Content that arrives after its entrance
  turn (a slow first query) keeps the 80 ms spacing among itself instead of appearing at once.

**Reduce motion** (Android's "Remove animations", read with Reanimated's `useReducedMotion`):
nothing moves, scales or slides. Every change above becomes an instant swap or a fade of at most
200 ms: the sheet and scrim fade in (200 ms) and close at once, dragging the sheet is off (X and
back still close it), rows fade in and out, the entrance and month-slide content
appears at once, the indicator and chips swap, the toast
fades, counts jump to the final value, and the shake and press scale are dropped. The one
exception is the footer following the keyboard, and the amount block's padding that tracks it,
because the system itself moves the keyboard.

Motion never blocks input: a tap during an animation acts right away. The one exception is a
second way out (X, back, a drag) while the sheet already slides down: it is dropped, because the
navigation is already on its way.

## Haptics

`expo-haptics`, used sparingly: one haptic per action, for its result. Whether Android's system
"touch feedback" setting silences them is checked on the phone when they are built.

| Moment | Haptic |
| --- | --- |
| Tap Add | `impactAsync(Light)` |
| Change month | `impactAsync(Light)` |
| Type switch, pick a category | `selectionAsync()` |
| Saved | `notificationAsync(Success)` (no extra tap haptic on Save) |
| Deleted (after confirming) | `impactAsync(Medium)` |
| Invalid Save | `notificationAsync(Error)` |

## Toast

A small glass pill, centered, its bottom 12 dp above the Add button
(`28 + insets.bottom + 56 + 12`). minHeight 44, padding 0 × 16, fully rounded, on `sheetFill`
with `glassBorderStrong`, the inner highlight and `glassShadow`. It holds a 16 dp `check` icon
and the text, both in `text` (`labelStrong`). It ignores touches (`pointerEvents="none"`), is
not focusable and is announced once with `announceForAccessibility`. It is mounted in the root
layout above the navigator, so it shows over the summary while the sheet closes. Shown after a
successful save ("Saved") or delete ("Deleted"); never after a failure (contract, FR-032).

## Components

With the glass revision, components use the tokens in Glass surfaces as follows; every size,
padding and radius below stays as written. Old summary tokens that this table replaces
(`surface`, `avatar`, `divider`, and the tone table's `cardBackground`, `monthButton`,
`statPill`) remain only as solid fallbacks where a gradient cannot be drawn. The form's flat
tokens (`formBackground`, `surfaceMuted`, `segmentTrack`, `segmentSelected`) are its primary
fills.

| Component | Fill | Border | Extras |
| --- | --- | --- | --- |
| Summary screen | `background` + ambient glows | — | — |
| Balance card | `cardGlass` | `glassBorderStrong` | highlight, shadow |
| Month buttons | `glassFillStrong` | `glassBorderStrong` | — |
| Stat pills | `glassFillStrong` | `glassBorder` | — |
| Breakdown and list cards | `glassFill` | `glassBorder` | highlight, `glassShadow` (breakdown only, see below); rows separated by `glassDivider` |
| List avatars | `glassAvatar` (income: `incomeSoft`) | — | — |
| Banner, empty-state card | empty-state: `glassFill`; banner: `bannerFill` (`accentSoft` at 100 % in light, 60 % in dark) | `glassBorder` | — |
| Add | accent button | 1 dp white border (Glass surfaces) | highlight |
| Save | `accent`, solid | none | — |
| Form sheet | `formBackground`, solid | top edge `glassBorderStrong` | grab handle 40 × 5 dp, `textMuted` at 40 % |
| Close button, unselected chips, Date, Note | `surfaceMuted` | none at rest (a transparent 1 dp keeps the size); focus `accent`, error `error` (see "Borders never shift the layout") | — |
| Segmented track | `segmentTrack` | none | — |
| Selected chip, selected segment | chip: `accent`; segment: `segmentSelected` | chip: 1 dp `accent`, same width as at rest; segment: 1.5 dp `accent` | — |
| Toast | `sheetFill` | `glassBorderStrong` | highlight, `glassShadow` |
| Balance card **Try again** | `glassFillStrong` | `glassBorderStrong` | — |
| Error screen **Try again** | `fieldFill` | `fieldBorder` | — |

The transaction list card has no outer shadow (T060, 2026-10-06): the list is a `FlatList`
that draws the cards row by row, so there is no single view to carry the shadow, and a shadow on
each row would show through the translucent rows around it. Each day has its own card; each row
draws its part of its day's card (fill, a 1 dp border whose top and bottom are transparent
inside the card, and the day's first and last rows' corners), so a row that becomes first or
last of its day changes only colors, its corner radii and its 4 dp of top or bottom padding; it
never adds or removes a border.

**Form controls without a resting border** (developer, 2026-10-06): Date, Note, the chips and the
close button sit on `surfaceMuted` against `formBackground` (about 1.1:1), as in the approved
mockups. Each has a visible label or icon that identifies it, and focus and error borders are
≥ 3:1; the missing resting boundary is an accepted exception to WCAG 1.4.11.

### Summary screen

There is no native header (`headerShown: false`); the balance card holds the month controls.

1. **Balance card**: margin `12 + insets.top` top and 12 at the sides; padding 12, with 16 at
   the bottom; radius 28; a glass card in the balance tone (`cardGlass`, Glass surfaces). Its
   shadow sits on an outer wrapper and the inner view clips with `overflow: 'hidden'`.
   - Header row: the previous-month button (48 dp circle, `glassFillStrong`, `chevron-left` in
     `cardInk`), the month title (`monthTitle`, `cardInk`) centered, then the next-month button or
     an empty 48 dp slot (FR-021). On January 2000 the previous button is likewise replaced by an
     empty 48 dp slot, so the title stays centered.
   - Body: "Balance" (`label`, `cardLabel`) above the amount (`display`, `cardAmount`), centered,
     with 28 dp above and 24 dp below.
   - Two stat pills in a 2-column grid (gap 8; one column when `isLargeText`), each `glassFillStrong`,
     with padding 12 × 16 and radius 16. A pill holds:
     - a 32 dp icon circle: `incomeSoft` with `arrow-up` in `income`, or `expenseIcon` with
       `arrow-down` in `text`;
     - the label (`statLabel`, `cardLabel`);
     - the amount (`statAmount`, `cardInk`).
   - **Loading**: header row, then a centered `ActivityIndicator` in `accent` (120 dp tall area).
     No amount and no pills.
   - **Error**: header row, then "Couldn't load your data." (`label`, `cardLabel`) and a
     **Try again** button (`glassFillStrong` with `glassBorderStrong`, `bodyStrong`, `cardInk`, fully rounded,
     minHeight 48), centered.
2. **Spending by category** (ready state only): a section title (`section`, 24 dp side padding),
   then a card with padding 4 × 16 and its rows:
   - Each row is at least 48 dp tall: the label (`body`) on the left; the amount (`bodyStrong`)
     and the percent pill (`pill` in `accent` on `accentSoft`, padding 4 × 8, radius 8, min width
     32) on the right.
   - Rows are separated by `glassDivider`. Numbers only, no bars (charts are feature 002).
   - With expenses at 0: "No expenses this month." (`body`, `textMuted`) inside the card, with
     padding 16.
3. **Transactions**: a section title, then the rows grouped by day (FR-017; developer,
   2026-10-06). Each day has a header and its own card.
   - **Day header**: padding 16 top (0 for the first day, right under the "Transactions" title)
     and 8 bottom, 24 at the sides. The day ("Today", "Yesterday", "Mon 5 Oct"; no year, a month
     never crosses one) in `label`, `textMuted`, on the left; the day's net on the right in
     `labelStrong`, `income` above zero and `textMuted` otherwise, with `+` above zero, minus
     below and no sign at zero. When `isLargeText`, the net moves under the day, left-aligned.
     A heading for the screen reader (Screen reader, above). `textMuted` on `background` at
     the glow's peak is ≥ 4.5:1 (contrast test).
   - **The day's card** holds its rows, each at least 64 dp tall:
     - A 40 dp avatar with the category initial (`glassAvatar` with `textMuted`; income uses
       `incomeSoft` with `income`), in `avatarInitial`.
     - The category label (`bodyStrong`, `text`) above the note, if any (`caption`,
       `textMuted`). The date is the day header's, above.
     - The amount on the right (`bodyStrong`): expenses in `text`, income in `income`, both
       from `formatSignedMoney` (`+` / `−` as the region formats them).
4. **Add button**: floating and centered, `28 + insets.bottom` above the bottom. minHeight 56,
   padding 0 × 28, fully rounded, styled as an accent button (Glass surfaces), with the `plus`
   icon and "Add" (`button`) in `onAccent`. Behind it, a 96 dp bottom fade from transparent to
   `background` at 45 % lets the list pass under it softly; it is a gradient, not a blur.
5. **Empty month**: the balance card at zero, then a card with padding 32 × 24, centered (no
   "Transactions" title): a 56 dp
   icon circle (`accentSoft`, `credit-card` in `accent`), "No transactions this month yet."
   (`bodyStrong`) and the contract's helper line (`label`, `textMuted`). No breakdown section.
6. **Banner** ("Couldn't open this transaction."): a card on `bannerFill` with a `glassBorder`, radius 16, padding 16,
   placed right under the balance card (above the breakdown). It holds the `alert-circle` icon
   and the message, both in `text` (`label`), and a **Dismiss** text button (`labelStrong`,
   `accent`).
7. **Section titles** use `section` in `text`.

### Transaction form (modal)

Presented as a sheet over the summary (Motion, "Open a form"), on `formBackground`. The form
keeps the flat look of the approved mockup `FormFilledDark` (solid fills, no resting borders,
a solid Save) on the sliding sheet with all its motion (developer, 2026-10-06). Because the
summary stays visible behind it, the root `Stack` uses a transparent modal presentation for the
two form routes and the app draws the sheet and the summary's scale-down itself. The root layout
is wrapped in `GestureHandlerRootView` for the drag to close.

There is no native header (`headerShown: false`).

- **Header**: top padding 8, under the grab handle (the sheet already sits below the status bar). The close button (48 dp circle, `surfaceMuted`,
  `x` in `text`) is on the left and the title (`title`, `text`) centered.
- **Loading** (edit form, contract): the header, then a centered `ActivityIndicator` in `accent`.
- **Type**: a segmented control. The track is `segmentTrack`, radius 16,
  padding 4. Each segment has minHeight 48 and radius 12.
  - Selected: the sliding indicator from Glass surfaces (1.5 dp `accent` border), and
    `bodyStrong` text in `text`.
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
  - Selected: `accent` with `bodyStrong` text in `onAccent`, keeping a 1 dp border in `accent`
    (Glass surfaces).
  - Unselected: `surfaceMuted` and `body` text in `text`.
- **Date** and **Note**: side by side in 2 columns with gap 12 (one column when `isLargeText`).
  Each field has a label above it, then a box on `surfaceMuted` with minHeight 52, radius 16 and
  padding 0 × 16.
  - The date box shows the `calendar` icon (`textMuted`) and the numeric date (`body`, `text`).
    The note's value is `body` in `text`.
  - The note's placeholder is `textMuted`. When focused, the note gets a 2 dp `accent` border.
- **Borders never shift the layout**: at rest, Date, Note and chips have a transparent 1 dp
  border plus 1 dp of extra padding (the selected chip's is `accent`); on focus or error the
  border becomes 2 dp (`accent` or `error`) and the extra padding goes, so the size stays the
  same. The chip group's error outline stays a separate 2 dp outline, transparent by default.
  When a field is both focused and invalid, the `error` border wins.
- **Validation** (contract messages):
  - Amount: the underline turns `error`.
  - Category: a 2 dp `error` outline around the chip group, with radius 16 and an 8 dp inset.
  - Date and Note: a 2 dp `error` border on the box.
  - The message (`labelStrong`, `error`, `alert-circle` 14 dp) sits under the field with an 8 dp
    gap.
- **Keyboard open** (SC-001; the target is a 360 × 640 dp screen at the default text size):
  - The footer follows the keyboard with Reanimated's `useAnimatedKeyboard` (no
    `KeyboardAvoidingView`, which would move it twice) and sits right above it with a 12 dp
    bottom gap; `28 + insets.bottom` applies only when the keyboard is closed. It rises by
    `keyboard + 12 − (28 + insets.bottom)` (never below 0), and the fields' scroll view gets the
    same amount as bottom room, so every field stays reachable above it. Both of the hook's
    translucent-bar flags are on, because the app is edge-to-edge and pads with the safe area
    insets itself. (Reanimated marks the hook deprecated in favor of
    `react-native-keyboard-controller`; it still works in Reanimated 4.5. Switching would add a
    dependency, which is the developer's call if the phone check fails.)
  - The amount block's vertical padding drops from 32/24 to 16/12 over the keyboard's first 120 dp, so the amount, all expense
    chips and Save fit above the keyboard.
  - **Fallback**, if Block 3b shows they still do not fit on the phone: the chips become a single
    horizontally scrolling row, 48 dp tall. Each chip is still one tap, so SC-001's 4 interactions
    hold. This needs no spec change.
- **Footer**: the fields scroll above it. From top to bottom, it holds:
  - a form-level failure message ("Couldn't save. Your changes are still here.", "Couldn't
    delete.", "This transaction no longer exists."), when there is one, styled like the
    validation message;
  - **Delete** (edit form only): a text button, `labelStrong` in `error`, centered;
  - **Save**: full width, minHeight 56, fully rounded, solid `accent` (no border or highlight) with
    `button` text in `onAccent`.

### Dialogs and the error screen

- "Delete this transaction?" and "Discard changes?" use React Native's `Alert`, the platform's
  native dialog, so they look like Android dialogs and are accessible by default.
- **"Something went wrong."** (root error boundary): on `background`, centered, the message
  (`body`, `text`) and **Try again** (`fieldFill` with `fieldBorder`, `bodyStrong`, `text`,
  fully rounded, minHeight 48).

## Implementation notes

- `src/ui/theme.ts` exports both palettes, the four balance-card tones and `balanceTone()`, the
  type tokens (with the font fallback), spacing, radii, `minTouch = 48` and `isLargeText`.
  Components never hard-code a color or size that has a token.
- Gradients (glass fills, ambient glows, the bottom fade, accent buttons) use React Native's
  built-in `experimental_backgroundImage` with `linear-gradient` / `radial-gradient`, so no
  gradient library is added. The bottom padding still keeps the last row clear of Add.
- The first glass task was a spike on the developer's phone (T057, results in
  `device-checks.md`, "Glass spike"): the radial-gradient glows, `cardGlass`, glass fills and
  the inset highlight render well in light and dark; the accent glow does not (dropped), and
  `android_ripple` is not clipped to rounded shapes (Touch feedback).
