# Device checks

Hermes `Intl` output (T011), every section before "Glass spike": recorded on 2026-10-05 in Expo
Go (Expo SDK 57, Hermes) on the developer's Android phone, with the temporary screen from T011 (research R7 and R13, quickstart scenario 11). These outputs are
the expected values for the formatting tests in T019 and T020: where Node (Jest) differs, the
device output wins.

## Decision: `countGraphemes` implementation

`typeof Intl.Segmenter` is `"undefined"` on Hermes. Per research R13, `countGraphemes` uses
**`unicode-segmenter`** (pre-approved, listed as conditional in the plan's Dependencies table).
It is installed in T015 with `npm i unicode-segmenter`.

## Phone locale

`getLocales()[0]`: `languageTag` = `es-US`, `regionCode` = `US`. The US is not in the euro-area
table, so on this phone `pickFormattingTag` returns `es-US` (research R7), and amounts show as
`EUR 1,234.00` (ISO code, not `€`). This is the specified behavior; the developer confirmed it
stays as is.

## Currency: `Intl.NumberFormat(tag, { style: 'currency', currency: 'EUR', numberingSystem: 'latn' })`

Strings use these escapes: ` ` no-break space, `‏` right-to-left mark, `‎`
left-to-right mark.

| Tag | 0 | -1 | 1234 | -1234 | 999999 | 12345678 |
| --- | --- | --- | --- | --- | --- | --- |
| `es-ES` | `0,00 €` | `-1,00 €` | `1.234,00 €` | `-1.234,00 €` | `999.999,00 €` | `12.345.678,00 €` |
| `en-GB` | `€0.00` | `-€1.00` | `€1,234.00` | `-€1,234.00` | `€999,999.00` | `€12,345,678.00` |
| `en-US` | `€0.00` | `-€1.00` | `€1,234.00` | `-€1,234.00` | `€999,999.00` | `€12,345,678.00` |
| `en-ES` | `€0.00` | `-€1.00` | `€1,234.00` | `-€1,234.00` | `€999,999.00` | `€12,345,678.00` |
| `ar-EG` | `‏0.00 €` | `‏‎-1.00 €` | `‏1,234.00 €` | `‏‎-1,234.00 €` | `‏999,999.00 €` | `‏12,345,678.00 €` |
| `es-US` | `EUR 0.00` | `-EUR 1.00` | `EUR 1,234.00` | `-EUR 1,234.00` | `EUR 999,999.00` | `EUR 12,345,678.00` |

Parts worth knowing for `format/money.ts`:

- `es-ES`: `integer group integer decimal fraction literal( ) currency`; the `€` goes after.
- `en-*`: `minusSign currency integer …`; the sign goes before the `€`, and there is no space.
- `ar-EG`: a leading `literal` part `‏`, then the `minusSign` part `‎-` (two code
  points), Latin digits and `.` as the decimal separator (the form separator rule gives `.`).
- `es-US`: the `currency` part is `EUR`, followed by a `literal` ` `.

## Without grouping or currency: `Intl.NumberFormat(tag, { useGrouping: false, numberingSystem: 'latn' })`

`1234` → a single part `integer:"1234"` for every tag above.

## Numeric date: `Intl.DateTimeFormat(tag, { day: '2-digit', month: '2-digit', year: 'numeric', numberingSystem: 'latn' })` of 2026-09-30

| Tag | Output |
| --- | --- |
| `es-ES`, `en-GB`, `en-ES`, `es-US` | `30/09/2026` |
| `en-US` | `09/30/2026` |
| `ar-EG` | `30‏/09‏/2026` |

## Differences between the device (Hermes) and Node 22 (ICU 77.1, Jest)

| Case | Device | Node | Note |
| --- | --- | --- | --- |
| `es-ES`, 4-digit euro amounts (1000–9999) | `1.234,00 €` | `1234,00 €` | Node follows CLDR's Spanish rule (group from 5 digits); Android's ICU groups from 4. The developer chose to keep the device behavior (2026-10-05). Resolved in T019 (developer's choice, 2026-10-05): the currency formatter uses `useGrouping: 'always'`, so Node gives `1.234,00 €` too. Hermes accepts the string value without error (see `min2` below) and already groups from 4 digits, so the phone output does not change. Re-check on the phone in Block 3b. |

Everything else above matches Node character for character, including the `ar-EG` marks.

`useGrouping: 'min2'` has no effect on Hermes (`es-ES` 1234 still gives `1.234,00 €`). It is
recorded only for reference; the app does not use it.

## Glass spike (T057)

Recorded on 2026-10-06 in Expo Go (Expo SDK 57, React Native 0.86) on the developer's Android
phone, with the temporary `src/app/spike.tsx` (deleted at the end of block 8a). Every value came
from design.md (Glass surfaces), drawn with `experimental_backgroundImage` and `boxShadow`, in
light and dark and in both balance tones. design.md was updated with the results the same day.

| Technique | Result | Decision |
| --- | --- | --- |
| Ambient glows (two `radial-gradient` disks, 340 and 300 dp plus a 70 dp fade) | Size, position and banding look right in light and dark | Keep |
| `cardGlass` 160° `linear-gradient`, glass fills and borders | Look right | Keep |
| Inset top highlight (`inset 0 1px 0`) and the card's outer shadow | Look right | Keep |
| Accent glow (`0 12px 32px` accent, outer `boxShadow` on the button's wrapper) | A white rectangle around the button, at radius 999 and at half the height | Dropped from accent buttons and the selected chip |
| Removing `borderWidth` at runtime from a view with a gradient | Expo Go closed | Borders are never removed at runtime; only their color changes |
| `android_ripple` on a 48 dp circle with `overflow: 'hidden'`, radius 999 and 24 | A square ripple in both | Circular icon buttons use `borderless: true, radius: 24`, which the developer liked; other rounded pressables use a pressed overlay (design.md, Touch feedback) |
| Clear-glass Add (glass fill, accent or plain border), then `expo-blur` (`dimezisBlurViewSdk31Plus`) with the iOS Liquid Glass layers (light blur, 10 % fill, lit rim, diagonal sheen) | The developer found it worse than the accent gradient, almost invisible in light | Add and Save keep the opaque accent gradient with the white border and highlight; `expo-blur` stays out |

A translucent accent fill was not tried on the phone: by calculation, `onAccent` text drops
below 4.5:1 (light 3.8:1 even at 85 % opacity).

## Glass and motion (T071)

The `design-reviewer` pass over `src/ui/`, `src/app/` and `theme.ts` ran on 2026-10-06 with no
critical or major findings; its minor findings were fixed or listed below. The phone checks are
the developer's single final pass (blocks 8b–8f were built back to back without stopping); each
one gets a result here. The developer passed every check on the phone on 2026-10-08.

| Check | Result |
| --- | --- |
| Light and dark: ambient glows (position, banding), card glass and the tone crossfade (positive ↔ negative) | Passed (2026-10-08) |
| Card shadows: no white rectangle around the balance and breakdown cards (shadow on a wrapper) | Passed (2026-10-08) |
| Ripples: month arrows and close are circles; first and last list row and Dismiss stay inside their card's corners | Passed (2026-10-08) |
| Form borders: chips, Type track, Date and Note; focusing Note or a date error moves nothing | Passed (2026-10-08) |
| Press scale and its spring (not too bouncy); entrance on a cold start; month slide; counting totals | Passed (2026-10-08) |
| Sheet: opens over the summary, X / back / drag close it, "Discard changes?" on a dirty form, a second back while closing does nothing, Discard really closes | Passed (2026-10-08) |
| Row changes: new row grows in, edited row flashes inside its card, deleted row slides out | Passed (2026-10-08) |
| Keyboard (SC-001, default font, 360 × 640 dp or this phone): amount, all expense chips and Save fit above it; footer moves with it, not twice | Passed (2026-10-08) |
| Type indicator, chip fill, invalid shake | Passed (2026-10-08) |
| Haptics, and whether Android's touch-feedback setting silences them | Passed (2026-10-08) |
| Toast over the closing sheet, "Saved" and "Deleted" | Passed (2026-10-08) |
| Largest font: nothing cut off (balance, stat pills, form) | Passed (2026-10-08) |
| TalkBack: summary labels, the Date field read once or twice (review finding), the failure message announced, the summary behind an open sheet not reachable | Passed (2026-10-08) |
| "Remove animations": nothing moves; sheet closes at once; drag is off | Passed (2026-10-08) |
| A seeded 1,000-row month scrolls smoothly; rough cold-start feel with the new libraries | Passed (2026-10-08) |

Known minor items left for the fine-tuning pass: sizes such as 56, 52, 64, 40 and the 1.5 dp
segment border are written in a few files instead of shared tokens; the chip's inner highlight
now sits 1 dp lower (inside the border); for 220 ms a picked chip's label has lower contrast.
