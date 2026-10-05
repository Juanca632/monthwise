# 001 — Product decisions

Working file to settle what feature 001 does (record income and expenses, see the monthly
summary) before running `/speckit-specify`. Product decisions only; the tech stack is decided
later in `/speckit-plan`.

## How to use it

1. Each question has context, options and a **Recommendation**.
2. Write your decision after **Answer:**. "ok" is enough if you agree with the recommendation.
   You can answer in Spanish.
3. When you finish a round, tell Claude in the chat. Claude reviews the answers, records each
   closed decision under **Decisions** and adds the next round.
4. When no open questions remain, the **Decisions** section is the input for `/speckit-specify`.

## Round 1 — basics

### Q1. User and data

Is 001 for a single person, with no account or login, and data stored only on the phone? The
alternative is an account with cloud sync from day one: no data loss when changing phones, but
much more work, and financial data leaves the device. The constitution asks to keep as little
financial data off the device as possible.

**Recommendation:** single person, no login, data only on the phone. Backup and sync are a
future feature.

**Answer:** 1. me parece bien que los datos queden para una persona, ps es una app personal no? datos en el telefono y la parte
de respaldo y sincronizacion si para una feature futura, eso si va 100% pero si se puede hacer despues me parece

### Q2. What a transaction has

A transaction is either income or an expense. Proposed fields:

| Field    | Required | Detail              |
| -------- | -------- | ------------------- |
| Type     | Yes      | Income or expense   |
| Amount   | Yes      | EUR, greater than 0 |
| Date     | Yes      | Defaults to today   |
| Category | Yes      | See Q3              |
| Note     | No       | Short text          |

Anything missing or extra? For example, payment method (cash or card) or tags.

**Recommendation:** exactly these five. No payment method or tags, to keep it simple.

**Answer:** eeee o sea si un movimiento tiene eso que colocaste, lit eso, ps hay movimientos que son fijos como las subscripciones y pago de vivienda y cosas asi q se dan todos los meses y otras q si son otro tipo de gastos, habría que ver como se maneja eso. aunque eso va en 004 no?

### Q3. Categories

Three options:

- **(a) Fixed list** that ships with the app.
- **(b) Editable starter list**: the user can create, rename and delete categories.
- **(c) No categories** in 001.

Also: do income and expenses have separate categories? For example, Salary only for income and
Food only for expenses.

**Recommendation:** (a), separate per type. Expenses: Food, Transport, Housing, Bills, Health,
Shopping, Leisure, Other. Income: Salary, Freelance, Gifts, Other. Editing can come later; in 001
it raises questions like what happens to transactions of a deleted category.

**Answer:** si, podemos por ahora trabajar con categorias ya predefinidas, despues se podran editar, estoy de acuerdo

### Q4. Edit and delete

Can a saved transaction be edited? Deleted? If it can be deleted, does it ask for confirmation,
or can it be undone?

**Recommendation:** yes to both. Deleting asks for a simple confirmation ("Delete this
transaction?"), with no undo.

**Answer:** i agree

### Q5. What the monthly summary shows

For the selected month:

- Total income
- Total expenses
- Balance = income − expenses, what is left to save (can be negative)
- Expenses per category: amount of each, highest first
- List of the month's transactions, newest first

Is all of that in 001? Anything else, like the percentage per category?

**Recommendation:** all of it, as numbers and a list; charts are 002. Yes to the percentage per
category: cheap and useful.

**Answer:** si si me parece bien

### Q6. Out of scope

Not in 001:

- Login and sync
- Charts (002)
- Savings goal (003)
- Recurring expenses (004)
- Automatic detection from bank notifications (005)
- Other currencies
- Search and filters
- Data export

**Recommendation:** confirm all of it as out of scope.

**Answer:** i agree

## Round 2 — month, main screen and details

Round 1 is closed (see **Decisions**). About your Q2 note: yes, fixed monthly payments
(subscriptions, rent) are exactly feature 004. In 001 you record them by hand each month like
any other expense; 004 will automate that.

### Q7. Month navigation and dates

The app opens on the current month. From there:

- Can you go back to previous months? (They would only show what you recorded then.)
- Can you go to future months?
- Can a transaction have a future date (for example, rent due on the 30th, recorded on the 5th)?

**Recommendation:** previous months yes, with no limit. No future months and no future dates in
001: anything planned belongs to recurring expenses (004). The date can be changed to any past
day.

**Answer:** i agree

### Q8. Main screen and adding a transaction

The constitution says recording an expense must take a few seconds, from the main screen. Proposal:

- The main screen is the current month's summary (Q5), with a big **Add** button always visible.
- **Add** opens a short form: type defaults to **Expense**, the amount field is focused with the
  keyboard open, date defaults to today, and you pick a category from the list.
- One tap on a transaction in the list opens it for editing or deleting.

Should the form remember anything, like the last category used?

**Recommendation:** exactly that, with no category preselected: a wrong preselected category is
easy to save without noticing, which corrupts the per-category numbers.

**Answer:** i agree

### Q9. Balance across months

The balance (income − expenses) is per month. When a month ends with money left over (or a
deficit), does it carry over to the next month, or does each month start from zero?

**Recommendation:** each month starts from zero; no carry-over in 001. Accumulated savings
across months belongs to the savings goal (003).

**Answer:** i agree

### Q10. Amount rules and display

- Amounts have 2 decimals (cents) and must be greater than 0. Maximum per transaction?
- Note: maximum length?
- How amounts look: format follows the phone's language and region settings (for example
  `1.234,56 €` on a Spanish phone, `€1,234.56` on an English one), or always one fixed format?

**Recommendation:** max 999,999.99 € per transaction (catches typos like an extra zero), note up
to 100 characters, and the phone's regional format for amounts and dates.

**Answer:** i agree, but how it detects the region? because the app is going to be in english at first?

### Q11. Empty states

What the user sees when there is nothing to show:

- First launch, no transactions at all.
- A month with no transactions.
- A month with income but no expenses (the per-category section is empty).

**Recommendation:** no onboarding or tutorial. Each empty case shows one short line saying what
is missing, plus the **Add** button. Totals show `0,00 €` instead of being hidden.

**Answer:** i agree

### Q12. Backup on the roadmap

Since data lives only on the phone (Q1), uninstalling the app or losing the phone loses all
data. You said backup and sync are 100% a future feature. Should it be added to the roadmap in
`AGENTS.md` now so it isn't forgotten?

**Recommendation:** yes, as `006` Backup and restore. The exact approach (file export, Google
Drive, own backend) is decided when that feature is specified.

**Answer:** i agree

## Round 3 — last details

Round 2 is closed. This is the last round: after it, the decisions are ready for
`/speckit-specify`.

### Q13. Amount format when the app is in English

Your question on Q10: Android keeps two separate settings, the **language** (what the text is
written in) and the **region** (how numbers, dates and currency look). The app asks Android for
the region and formats amounts with it, even if the app's text is only in English. So on a phone
set to Spain you would see English labels with `1.234,56 €` and dates in the order Spain uses (`5/10/2026` for 5 October). Many apps work this way (Gmail, bank apps).

The options:

- **(a) Phone's region:** each user sees amounts the way they are used to. Mixed look (English
  words, Spanish numbers) on your own phone.
- **(b) Fixed format** matching the English UI: always `€1,234.56`, whatever the phone says.
  Consistent, but a Spanish user reads `1,234.56` differently from what they are used to.

**Recommendation:** (a). The audience is people paying in EUR, mostly in countries that write
`1.234,56 €`; showing amounts the way they read them every day matters more than matching the
UI language.

**Answer:** i agree, we can manage that after, but for now like that it works

### Q14. Changing the type when editing

When editing a transaction, can you switch it from expense to income (or back)? Categories are
separate per type (D3), so the category would have to be picked again.

**Recommendation:** yes; switching the type clears the category and asks you to pick one again.
It fixes the common mistake of saving an income as an expense without deleting and re-creating it.

**Answer:** i agree

### Q15. Light and dark mode

Does the app follow the phone's light/dark setting, or only one mode in 001?

**Recommendation:** follow the phone's setting from the start. Adding dark mode later means
revisiting every screen; doing it from day one is cheap.

**Answer:** i agree

## Round 4 — from the spec review

The `sdd-reviewer` agent read `spec.md` with no context and found gaps. Most are fixed in the spec
with defaults you can review there; these three need your decision.

### Q16. Adding while viewing a past month

The **Add** button is on every month, but the form's date defaults to today. If you are looking
at September and tap **Add**, the expense lands in October, a month you are not looking at.

- **(a)** Date defaults to today; after saving, the app jumps to the current month.
- **(b)** Date defaults to the **last day of the month you are viewing** (today, if it is the
  current month), so **Add** adds to the month on screen.
- **(c)** **Add** only exists on the current month.

In all cases, after any save (new or edited), the app shows the month of the transaction's date,
so you always see where it went.

**Recommendation:** (b). If you go back to September and tap **Add**, you are almost certainly
adding something you forgot from September.

**Answer:** i agree with u

### Q17. Android's automatic backup

By default, Android copies app data to the user's Google account (encrypted, about once a day)
and restores it on a reinstall or a new phone. That is free protection against losing data, but
it also means financial data leaves the phone, which the spec says must not happen.

- **(a)** Turn it off in 001. Strict "nothing leaves the phone"; uninstalling still loses
  everything until 006.
- **(b)** Leave it on. Data survives a reinstall or a new phone, stored encrypted in your own
  Google account; the spec's privacy rule gets an exception for it.

**Recommendation:** (a). It keeps 001's privacy promise simple, and 006 (Backup and restore) is
the place to choose how backup works on purpose, which may well end up being this same Google
backup.

**Answer:** i agree

### Q18. Typing amounts and month names

D13 says amounts and dates follow the phone's region. Two details follow from it:

- **Typing an amount:** on a Spanish phone, the decimal separator is a comma (`12,50`). Does the
  amount field use the region's separator, or always a dot?
- **Month names** in the month header: English ("October 2026", like the rest of the UI) or the
  region's language ("octubre 2026")?

**Recommendation:** the region's separator when typing (it is the key the phone's number keypad
shows), and month names in English, because they are interface text. Numeric dates keep the
region's order (`5/10/2026`).

**Answer:** la idea es q la app detecte la region e idioma del telefono y ps haya soporte a varios idiomas ps, pero por ahora será en ingles y el formato dependerá de la region ps

## Round 5 — from the second spec review

### Q19. Moving to a new phone

D17 turned off Android's automatic backup to Google. Android has a second, separate path: when you
set up a new phone, it can copy apps and their data **directly from the old phone** (by cable or
nearby connection). The data goes phone to phone, not to the cloud, but it still leaves the old
device.

- **(a)** Block it too. Fully consistent with "nothing leaves the phone"; changing phones means
  starting from zero until 006.
- **(b)** Allow it. Your data moves with you to your new phone; it never touches a server.

**Recommendation:** (b). The rule exists to keep financial data away from third parties, and a
direct transfer between two phones you own does not reach anyone else. Losing a whole history
when changing phones would be a big price for no privacy gain.

**Answer:** i agree but i insist, there decisions are for after, not now pls

## Decisions

All rounds are closed (2026-10-05). This list is the input for `/speckit-specify`.

- **D1 (Q1):** single user, no account or login; data stored only on the phone. Backup and sync
  are a future feature.
- **D2 (Q2):** a transaction has type (income/expense), amount in EUR > 0, date (defaults to
  today), category (required) and an optional note. No payment method or tags. Fixed monthly
  payments are recorded by hand in 001; automating them is 004.
- **D3 (Q3):** fixed category list, separate per type. Expenses: Food, Transport, Housing, Bills,
  Health, Shopping, Leisure, Other. Income: Salary, Freelance, Gifts, Other. Editing categories is
  a future feature.
- **D4 (Q4):** transactions can be edited and deleted; deleting asks for confirmation, no undo.
- **D5 (Q5):** the monthly summary shows total income, total expenses, balance (can be negative),
  expenses per category with amount and percentage (highest first), and the month's transactions
  (newest first). Numbers and lists only; no charts.
- **D6 (Q6):** out of scope: login and sync, charts (002), savings goal (003), recurring expenses
  (004), bank notification detection (005), other currencies, search and filters, data export.
- **D7 (Q7):** the app opens on the current month; previous months are reachable with no limit.
  No future months and no future dates; the date can be any past day.
- **D8 (Q8):** the main screen is the current month's summary with an always-visible **Add**
  button. The form opens with type Expense, the amount focused, date today and no category
  preselected. Tapping a transaction opens it to edit or delete.
- **D9 (Q9):** the balance is per month; each month starts from zero, no carry-over.
  Accumulated savings belong to 003.
- **D10 (Q10):** amounts have 2 decimals, must be > 0 and at most 999,999.99 € per transaction;
  the note is at most 100 characters. Display format: see D13.
- **D11 (Q11):** no onboarding. Each empty case shows a short line saying what is missing plus
  the **Add** button; totals show zero instead of being hidden.
- **D12 (Q12):** add `006` Backup and restore to the roadmap; its approach is decided when it is
  specified.
- **D13 (Q13):** amounts and dates are formatted with the phone's region settings, independent
  of the UI language (English). Can be revisited later.
- **D14 (Q14):** editing can switch the type (expense ↔ income); doing so clears the category and
  asks for a new one.
- **D15 (Q15):** the app follows the phone's light/dark setting from the start.
- **D16 (Q16):** **Add** adds to the month on screen: the date defaults to today on the current
  month and to the last day of the month on a past month. After any save, the app shows the month
  of the transaction's date.
- **D17 (Q17):** Android's automatic cloud backup is off in 001; nothing leaves the phone. Backup
  is designed on purpose in 006.
- **D18 (Q18):** amounts are typed with the region's decimal separator; month names are in English
  like the rest of the UI. Long term, the app should detect the phone's language and support more
  languages (future feature); for now the UI is English and formats follow the region.
- **D19 (Q19):** phone-to-phone transfer is not blocked, but not supported or tested in 001. It and
  any other backup or transfer question belong to feature 006.
