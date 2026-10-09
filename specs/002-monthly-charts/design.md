# Design: Monthly charts and insights

Visual design for 002, approved by the developer on 2026-10-08 from the mockups below. It sets
*how* the Spending pace card, the Insights screen and the month picker look and move. 001's
[design.md](../001-monthly-summary/design.md) still holds for everything this file does not
change (type scale, spacing, radii, touch targets, touch feedback, dialogs, motion rhythm,
**Performance rules**), including its **Phone review** values, which are what ships today. What
the screens contain and say stays in `spec.md` and
[contracts/ui-screens.md](contracts/ui-screens.md); if this file and the contract ever disagree,
the contract wins and this file is updated.

Mockups: the HTML sources of the 13 approved artboards are in
[`design/mockups/`](design/mockups/) (`.dc.html`, plain HTML with inline styles and a small
script). `Main.dc.html` (summary and picker) and `Insights.dc.html` (every Insights state) hold
the drawing; the other files only set their options (dark, state, picker year). The live canvas
is https://claude.ai/artifact/1k5EwNcLxBCL5DnmePKzHF, which only the developer can open. Where
this file and the mockups differ, **this file wins**. The developer approved them on 2026-10-08
with fine-tuning on the phone still to come (AGENTS.md, Fine-tuning mode).

## Direction

Like 001, the reference is the clarity of modern banking apps such as Revolut (developer,
2026-10-09: it applies to every 002 screen): few words, short lists, one number per line that
matters, details on demand rather than all at once. The charts follow 001's calm look: solid `surface` cards on the plain background, one accent,
and color only where it means something. Each chart answers one question at a glance, and its
sentence or headline says the answer in words above it, so the chart confirms rather than
explains. The **current month is always the strong mark** (accent, solid, thick) and anything
it is compared with is quiet (grey, dashed or outlined). Nothing in a chart relies on color
alone (FR-002): lines differ by style and weight, bars by fill and shape, changes by their sign.

## Color

New tokens, added to `theme.ts` by T015. Everything else uses 001's shipped tokens (`accent`,
`income`, `error`, `text`, `textMuted`, `surface`, `background`, `incomeSoft`, `onAccent`, …).

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `chartCurrent` | `accent` (an alias, `chartCurrent: accent`) | `accent` | The selected month's line, its markers, positive saved marks |
| `chartArea` | `accent` at 22 % → 0 % (top to bottom) | same | Fill under the selected month's line |
| `chartPrevious` | `#7D8696` | `#7D8696` | The previous month's dashed line and marker |
| `chartGrid` | `#0E1116` at 7 % | `#FFFFFF` at 7 % | The two faint guide lines of the pace chart; the card chart's baseline |
| `chartAxis` | `#0E1116` at 28 % | `#FFFFFF` at 28 % | The pace chart's baseline and day ticks |
| `chartZero` | `#0E1116` at 50 % | `#FFFFFF` at 50 % | The trend's zero line, which carries meaning (saved below zero) |
| `chartBand` | `accent` at 10 % | `accent` at 16 % | The selected day's band and the open trend month's column |
| `chartGuide` | `text` at 32 % | `text` at 32 % | The selected day's vertical line |
| `insetFill` | `#F1F3F6` | `#262A33` | The one "inset on a card" token: detail boxes, picker cells and buttons, the neutral percent pill. Light equals `surfaceMuted` on purpose; dark differs because 001's dark `surfaceMuted` is darker than `surface` and would vanish on a card |
| `errorSoft` | `error` at 12 % | `error` at 18 % | Percent pill of a category that went up |

Saved marks use `chartCurrent` when the saved amount is zero or more and `error` when it is
negative; incomes use `income`. Percent pills: up (spent more) `error` on
`errorSoft`, down `income` on `incomeSoft`, zero `textMuted` on `insetFill`. The sign is always
written, so the pill's color only repeats it.

**Contrast** (WCAG, measured 2026-10-08 on the card `surface`, light `#FFFFFF` / dark `#1B1D24`;
T015 adds each pair to `tests/unit/contrast.test.ts`):

| Pair | Light | Dark | Needs |
| --- | --- | --- | --- |
| `chartPrevious` on `surface` | 3.67 | 4.59 | 3:1 (graphics) |
| `chartCurrent` on `surface` | 5.52 | 6.15 | 3:1 |
| `income` on `surface` | 6.40 | 8.92 | 3:1 |
| `error` on `surface` (negative saved) | 6.04 | 7.35 | 3:1 |
| `error` on `errorSoft` over `surface` | 5.03 | 5.29 | 4.5:1 (pill text) |
| `income` on `incomeSoft` | 5.62 | 7.25 | 4.5:1 |
| `textMuted` on `insetFill` | 5.38 | 7.20 | 4.5:1 |
| `text` on `insetFill` | 17.01 | 13.04 | 4.5:1 |
| `accent` on `insetFill` (This month) | 4.96 | 5.25 | 4.5:1 |
| `accent` on `chartBand` over `surface` (open month label) | 4.80 | 4.75 | 4.5:1 |
| `onAccent` on `accent` (selected picker month) | 5.52 | 7.01 | 4.5:1 |
| `textMuted` on `surface` (day labels, legend) | 5.98 | 8.43 | 4.5:1 |
| `chartZero` on `surface` (trend zero line) | 3.54 | 5.14 | 3:1 |

The two lines are 1.17:1 apart in color on purpose: they are told apart by style (solid 3 dp
versus dashed 2 dp), not hue. `chartGrid`, `chartAxis` and `chartGuide` are decorative and need no
ratio; the trend's zero line carries meaning, so it has its own `chartZero` at 3:1 or more. Disabled picker months (40 % opacity) are exempt (WCAG 1.4.3, inactive components).

## Typography

001's tokens, plus one:

| Token | Size (dp) | Weight | Use |
| --- | --- | --- | --- |
| `legend` | 13 | Medium, tabular figures (`numeric`) | Chart legends, day labels, trend month labels, "No data" in a column, "Compared by day N", column titles |

| Element | Token | Color |
| --- | --- | --- |
| "Spending pace" on the card | `labelStrong` | `textMuted` |
| Pace sentence, trend headline | `title` (17 SemiBold) | `text` |
| Insights section titles | `heading` (22 Bold) | `text` |
| "Insights" label | `label` | `textMuted` |
| Month control on Insights | `heading` | `text` |
| Month control on the balance card | `monthTitle` | `cardInk` |
| Detail first line ("Day 8", "July") | `labelStrong` | `text` |
| Detail lines, category amounts | `body` | `text` (last month's amount: `textMuted`) |
| Detail difference line, change amount, category label | `bodyStrong` | `text` |
| Percent pill | `pill` | per pill tone |
| Picker title and year | `title` | `text` |
| Picker months | `body`; selected `bodyStrong` | `text`; selected `onAccent` |

Every amount uses tabular figures, as in 001. `legend` differs from 001's `caption` (13
Regular) only by weight: Medium stays readable on the chart tints and next to the swatches.

## Components

### Month control (FR-026)

- **Balance card**: 001's header row (two arrows and a title) becomes one centered pill: minHeight
  48, `paddingLeft` 20 and `paddingRight` 16 (the chevron's own side bearing evens them out), no
  vertical padding, fully rounded, `monthButton` fill with a 1 dp `cardRim` border (the
  dark tinted glass of 001's card controls). It holds the month (`monthTitle`, `cardInk`) and a
  16 dp `chevron-down` in `cardInk`, 8 apart. The card's body (balance, pills) is unchanged.
- **Insights**: under the "Insights" label, the month (`heading`) with a 20 dp `chevron-down` in
  `textMuted`, 8 apart, minHeight 48, left-aligned with the label.
- Both use 001's touch feedback for pressables with their own shape (pressed overlay and press
  scale) and work in every state.

### Spending pace card (summary)

Between the balance card (or the 001 banner) and "Spending by category", 12 dp below the card
above, side margins 16. A `surface` card, radius 20, padding 16, gap 8, `tileShadow` in light.
The whole card is one pressable (pressed overlay clipped to radius 20, press scale; no
`android_ripple`).

1. Title row: "Spending pace" (`labelStrong`, `textMuted`), then a 20 dp `chevron-right` in
   `textMuted` on the right, which says the card opens something.
2. The sentence (`title`, `text`), wrapping.
3. The **compact chart**, 4 dp below: full inner width, 64 dp tall (Chart geometry).
4. The **legend**: one item per line drawn, wrapping (gap 4 × 16): an 18 × 6 dp swatch of the
   line's own style, 8 dp, the month name (`legend`, `textMuted`).
- **One line** (previous month has no data): no previous line, its legend item is not drawn.
- **Loading**: the title (without the chevron) and a centered `ActivityIndicator` in `accent` in
  an area of `minHeight` 122 dp (one sentence line, the chart and one legend line at scale
  1.0), so the card usually does not jump when it loads; a two-line sentence or large text may
  still grow it, which is accepted. Not pressable.

### Insights screen

On `background`, a vertical scroll that ends with `28 + insets.bottom` of padding.

- **Header**: top padding `8 + insets.top`, side padding 16. The 48 dp **Back** button (001's
  `/transactions` back button: `chevron-left` in `text` on `surface`, borderless ripple), 12 dp,
  then a column with the "Insights" label and the month control.
- **Sections**: each title in `heading` with padding 16 top, 8 bottom and 24 at the sides, then
  its card: `surface`, radius 20, padding 16, side margins 16, `tileShadow` in light.
- **Detail boxes** (day and month): `insetFill`, radius 16, `paddingVertical` 12,
  `paddingHorizontal` 16, lines 4 apart, 4 dp
  below the chart. One Text per line (contract).
- **Loading**: each section title, then a card 140 dp tall with a centered `ActivityIndicator`.
  The pace section shows the pace handed over by the summary when it has it (contract).
- **Error**: the header, then a card 24 dp below it (padding 32 × 24, centered, gap 16) with
  "Couldn't load your data." (`body`) and **Try again** (001's error-screen button: `fieldFill`,
  `fieldBorder`, `bodyStrong`, fully rounded, minHeight 48, padding 0 × 24).

#### Section 1: Spending pace

Sentence, legend (as on the card), the **full chart** 4 dp below, then the day detail when a day
is selected:

- "Day 8" (`labelStrong`).
- "October: 1.012,30 €" and "September: 968,10 €" (`body`), each after its line's 18 × 6 swatch
  (decorative), 8 apart.
- "+44,20 € · +5%" (`bodyStrong`), indented 26 dp so it lines up with the amounts above.

#### Section 2: Categories vs last month

A compact list in the style of 001's transaction rows (developer, 2026-10-09: "like Revolut,
easy to read and minimal"); no table and no column titles.

- "Compared by day 12" (`legend`, `textMuted`) above the rows, when the contract shows it.
- **Each row**: padding 12 vertical, a 1 dp `glassDivider` line between rows (none above the
  first). Left, the category's 36 dp icon circle as in 001 (its icon in the category color on its
  tint, decorative); 12 dp after it, two lines:
  - line 1: the label (`bodyStrong`, `text`) and, right-aligned, this month's amount
    (`bodyStrong`, `text`);
  - line 2, 2 dp below: the change line "+60,00 € vs last month" (`caption`, `textMuted`) and,
    right-aligned, the percent pill (padding 2 × 6, radius 8).
  With nothing last month the change line says so and there is no pill.
- **Show all (N)** / **Show less**: under the third row, a text button in `accent`
  (`bodyStrong`), minHeight 48, centered, with a 1 dp `glassDivider` line above. The rows below
  appear and leave with the layout transition of "Detail in" / "Detail out".
- **Large text**: the two parts of each line wrap under each other; nothing is cut.
- **No data last month**: line 1 only.
- **No spending**: "No spending to compare yet" (`body`, `textMuted`), no rows.

#### Section 3: Savings trend

- **Headline** (`title`); no legend (one bar per month needs none).
- **The chart**, 8 dp below (Chart geometry, Trend), then the month detail when a month is
  selected: the month name (`labelStrong`), "Income: …", "Expenses: …", "Saved: …", "Savings
  rate: …" (`body`), or "No data"; then **View month**, 8 dp below: a pill on `surface` (it sits
  on `insetFill`), minHeight 48, `paddingLeft` 16, `paddingRight` 12, no vertical padding, `bodyStrong` in `accent` with a 16 dp
  `chevron-right`, aligned left.
- **Every month without data**: "No data yet" (`body`, `textMuted`) alone in the card.

### Month picker

001's `ConfirmDialog` shell: a `Modal` with the `scrim` backdrop (a tap closes), a centered card
at most 360 dp wide with 24 dp side margins, `surface`, radius 28, padding 24, gap 16.

1. "Choose month" (`title`, header).
2. **Year row**: the "Previous year" button (48 dp circle, `insetFill`, 20 dp `chevron-left` in
   `text`), the year centered (`title`), the "Next year" button. A disabled button is drawn at
   40 % opacity and gives no press feedback.
3. **Month grid**: 3 columns × 4 rows, gap 8. Each cell minHeight 48, radius 16, the short name
   centered. Every cell has a 1.5 dp border, transparent unless said otherwise, so nothing shifts:
   - available: `insetFill`, `body` in `text`;
   - the selected month: `accent` fill and border, `bodyStrong` in `onAccent`;
   - the current month, when it is not the selected one: `insetFill` with an `accent` border, so
     "today" is always findable;
   - after the current month: no fill, text at 40 % opacity, not pressable.
4. **Footer**, `marginTop` 8 on top of the card's gap 16 (24 under the grid): two pills side by side, gap 12, each `flex: 1`, minHeight 48,
   fully rounded, `insetFill`, `button` text: **This month** in `accent`, **Close** in `text`.

Pressed feedback: the overlay inside each cell and pill, and the press scale (001).

## Chart geometry

Shared by both pace charts and the trend. Coordinates are floats used only for drawing
(conventions in tasks.md).

- **Days**: the pace charts always span 31 days. Day N's band is `[(N−1)·w/31, N·w/31)`; its
  point is the band's center, `x = (N − 0.5)·w/31` (`dayAtX` and the path points in
  `ui/charts/geometry.ts`). Lines start at day 1's point and are straight segments with round
  joins, no smoothing (smoothing would draw spending that did not happen).
- **Vertical scale**: 0 at the baseline; the top is the largest value of the lines drawn × 1.08,
  so the highest point never touches the edge. Both lines share the scale. When every value is 0
  (no spending), the selected month's line lies on the baseline.
- **Previous month past its end**: its line stops at its last day; its marker for a later day
  sits on that end point.
- **Layers**, back to front: the selected-day band (an `Animated.View`); the static SVG (grid,
  previous line, area, selected line, baseline, end dot); the guide and the two markers (each an
  `Animated.View`). Everything that follows the finger is a view moved with `translateX` and
  `translateY` from shared values (the markers' y per day comes from a shared array), never an
  animated SVG prop, which would not stay on the UI thread. The SVG only redraws when the data
  changes.

### Compact chart (card)

326 × 64 dp at a 390 dp width (it takes the card's inner width). Plot from y 4 to 60; a 1 dp
`chartGrid` baseline at 60. No axis, no labels, no touch (the card is the button). The selected
line ends with a 4.5 dp `chartCurrent` dot with a 2 dp `surface` ring ("today" for the current
month).

### Full pace chart (Insights)

The card's inner width × 180 dp: a 12 dp top inset and a 168 dp plot (y 12 to 180), which is
also the touch area; the day labels follow under it.

- Two `chartGrid` lines at a third and two thirds of the plot height; a 1 dp `chartAxis`
  baseline.
- **Day marks**: days 1, 8, 15, 22 and 29 (a week apart), each a 4 dp `chartAxis` tick under the
  baseline and its number (`legend`, `textMuted`) centered under the day. The numbers are Text
  views in a row under the SVG, so they scale with the font; they are 1 or 2 digits, so they
  never collide (at the largest size they still sit a week, about 74 dp, apart). The label row
  does not clip: day 1's label may reach into the card's 16 dp padding.
- **Lines**: selected month 3 dp `chartCurrent`, round cap, with `chartArea` under it; previous
  month 2 dp `chartPrevious`, dashes 6 on 4 off.
- **No y-axis labels**: the sentence and the detail give the amounts, and amounts in a fixed slot
  would have to shrink (research R11).
- **Selected day**: the day's band in `chartBand` (radius 3, the plot's full height), a 1 dp
  `chartGuide` vertical line through its point, and a marker on each line that has a value that
  day: selected month a 6 dp `chartCurrent` dot with a 2.5 dp `surface` ring; previous month a
  5 dp hollow circle (`surface` fill, 2.5 dp `chartPrevious` stroke). Filled versus hollow
  repeats solid versus dashed. With no selection, only the end dot shows.
- **Touch area**: the whole 180 dp chart (31 bands), research R5.

### Trend

Six equal columns across the card's inner width, each at least 48 dp wide and a pressable with
padding 8 vertical and radius 12: a 160 dp plot, then the short month name (`legend`), 8 below.

- **Plot box**: 160 dp for the scale plus a 6 dp inset under it, so a saved dot at 0 on a
  bottom zero line is never clipped (166 dp in all).
- **Width**: Monthwise targets screens 360 dp wide and up, where each column is at least 48 dp
  ((360 − 64) / 6 ≈ 49). Narrower screens are out of scope.
- **Scale**: top = the largest saved amount × 1.04; bottom = the most negative saved amount ×
  1.25, or 0 when none is negative. The zero line (1 dp `chartZero`) sits where 0 falls in that
  range and crosses all six columns; a month never has its own baseline.
- **Mark** (developer, 2026-10-09: saved only, like Revolut): one bar per month, centered, 16 dp
  wide (`trendBar`), growing from the zero line with 4 dp corners at its far end: up in
  `chartCurrent` when saved is 0 or more, down in `error` when negative. Saved at exactly 0 is a
  2 dp `chartCurrent` line on the zero line. Up versus down repeats the color.
- **No data**: no marks; "No data" (`legend`, `textMuted`) centered in the plot (never a zero).
- **Selected month** (detail open): the column fills with `chartBand` and its name turns `accent`
  Bold. The **screen's month** (the one in the month control) has its name in `text` Bold; the
  other names are `textMuted` Medium.

## Large text (FR-022, research R11)

001's rules apply (`isLargeText` = font scale ≥ 1.3; heights are minimums; nothing is cut).
In addition (the `LargeText` mockup is at 200 %):

- Sentences, legends, the headline and detail lines wrap. Legend items stack one per line when
  they do not fit side by side.
- Chart drawings keep their size: the card chart 64 dp, the pace chart 180 dp (168 dp plot),
  the trend plot 160 dp. Only their text grows (day numbers, month names, "No data").
- **Trend columns** stay six across; a month name never wraps (three letters). "No data" may wrap
  to two lines inside the column.
- **Picker**: the grid stays 3 columns; cells grow in height.
- **Month control**: the month wraps under itself if needed; the chevron stays after the last
  word.

## Motion

001's rhythm (fast 200 ms, standard 300 ms, ease-out in, ease-in out, its spring), Reanimated on
the UI thread, every motion through `useReduceMotion`.

| Moment | What moves | Time | Curve |
| --- | --- | --- | --- |
| Summary appears | The pace card joins 001's entrance stagger right after the balance card (rise 14 dp and fade, 60 ms apart). Its chart draws in with it (next row) | 300 ms (standard) | ease-out |
| A pace chart appears | The lines are revealed left to right: a `surface` cover over the plot slides off to the right (`translateX`, the chart clips it). Only on the screen's first data (a `hasRevealed` ref per screen): never on a focus reload, and never after a month change from any source | 300 ms (standard) | ease-out |
| The trend appears | All marks grow from the zero line: the marks' layer scales vertically from 0 to 1 with `transformOrigin` at the zero line (`scaleY` on one view, not each bar). Dots and outlines are briefly squashed while it grows, which is accepted. Same first-data rule as the pace reveal | 300 ms (standard) | ease-out |
| Detail in | The box fades in and settles from 6 dp above; the sections below move down with a layout transition | 200 ms (fast) | ease-out |
| Detail changes (another day or month, or a drag) | The text and the markers switch at once; during a drag the band, guide and markers follow the finger with no easing | — | — |
| Detail out | The box fades out, then leaves; the sections below move up with the layout transition | 200 ms (fast) | ease-in |
| Picker opens / closes | As 001's dialog: fades in and settles from 94 %; closing is instant | 200 ms (fast) | ease-out |
| Year changes | The month grid slides 12 dp in from the side of the arrow tapped and fades in | 200 ms (fast) | ease-out |
| Month changes (picker, **This month**, **View month**) | 001's month slide: the month's content slides 18 dp in and fades in, **from the left when the new month is earlier, from the right when it is later** (compared with `compareMonths`). The new month's charts do not draw in again: one motion at a time | 300 ms (standard) | ease-out |
| Open and leave Insights | Android's own stack push and pop, as `/transactions` | system | system |
| Press | The card, trend columns, picker cells and pills: 001's press scale and overlay. The pace chart has no press scale (it is a touch surface) | spring | spring |

**Reduce motion**: nothing slides, scales or draws in. Lines, bars and the picker grid appear at
once; the detail box and the picker fade (at most 200 ms) or appear; the layout transition is
off, so sections below jump; the month change is an instant swap.

## Haptics

`expo-haptics`, as in 001 (one per action, for its result):

| Moment | Haptic |
| --- | --- |
| A day becomes selected by a tap, or the day under the finger changes while dragging | `selectionAsync()` |
| A trend month is selected or hidden | `selectionAsync()` |
| Previous or next year in the picker | `selectionAsync()` |
| A month is chosen (picker month, **This month**, **View month**) | `impactAsync(Light)`, 001's month-change haptic |
| Hiding a day's detail, opening the card or the picker | none |

## Screen reader

The contract holds the labels, roles and states. Visually:

- Charts (`Svg`), legends' swatches, category dots, trend legend and the trend's marks are hidden
  (`importantForAccessibility="no-hide-descendants"`). The pace card's legend and lines are inside
  the card's single element.
- The per-day elements (screen reader on, research R6) are 31 transparent views over the plot,
  one per band; they draw nothing. Each is about 10.5 × 180 dp, under 48 dp wide: an accepted
  exception (31 days cannot each get 48 dp on a phone; the contract counts the chart as one
  touch target, FR-023), which Accessibility Scanner will flag. TalkBack still reaches every day
  by swiping.

## Performance rules for 002

001's **Performance rules** hold. The charts add:

- **Geometry once per data**: path strings, scales and bar sizes are computed when the data
  changes (memoized), never per frame or per touch.
- **Touch on the UI thread**: during a drag the band, guide and markers are views translated
  from shared values (the day under the finger), on the UI thread (Layers); JS gets one event per **day change** and only
  then re-renders the detail text. Nothing re-renders per pixel.
- **Small drawings**: a pace chart is at most 3 paths, 3 lines, a band and 3 circles; the trend at
  most 24 marks. No per-day SVG elements; no shadows or gradients except the one area fill.
- **Motion is transforms**: the line reveal is a translated cover, the bars' growth one `scaleY`;
  no animated path, size, `strokeDashoffset` or corner radius.
- **No work during transitions**: the card's pace rides on the summary's read; Insights reads
  after its push transition (research R3), and its first frame shows the handed pace.
- **Check on the phone** with the preview APK or `npm start -- --no-dev --minify`: a drag across
  the whole chart and a scroll of Insights with 1,000 transactions per month must not stutter
  (constitution V).

## Implementation notes (T015)

`src/ui/theme.ts` gains, per palette: `chartCurrent`, `chartArea` (its top color),
`chartPrevious`, `chartGrid`, `chartAxis`, `chartBand`, `chartGuide`, `insetFill`,
`errorSoft` and `chartZero` (`chartCurrent` as an alias of `accent`); the `legend` type token
(`numeric`); and `chart` sizes: `cardHeight` 64, `cardInset` 4 (card plot y 4 to 60), `paceHeight`
180, `paceTop` 12, `pacePlot` 168, `trendPlot` 160, `trendBottomInset` 6, `currentWidth` 3, `previousWidth` 2, `previousDash` `[6, 4]`,
`markerCurrent` 6, `markerPrevious` 5, `endDot` 4.5, `ringCurrent` 2.5, `ringEnd` 2,
`previousRing` 2.5, `bandRadius` 3, `tickLength` 4, `trendBar` 16, `barRadius` 4, `zeroBar` 2, `lineSwatch` 18 × 6, `yHeadroom` 1.08, `trendTopHeadroom` 1.04, `trendBottomHeadroom` 1.25.
Drawing fractions that are not sizes (the grid lines at 1/3 and 2/3 of the plot, 1 dp
hairlines, the area fill's 0 % bottom stop) are named constants in `ui/charts/geometry.ts`.
`tests/unit/contrast.test.ts` gets every pair of the Contrast table.
