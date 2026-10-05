# Device checks: Hermes `Intl` output (T011)

Recorded on 2026-10-05 in Expo Go (Expo SDK 57, Hermes) on the developer's Android phone, with
the temporary screen from T011 (research R7 and R13, quickstart scenario 11). These outputs are
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
