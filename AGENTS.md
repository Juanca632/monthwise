# Monthwise

Personal finance mobile app: month by month, it shows how much money comes in, how much goes out
and where, and how much is left to save. Portfolio project, Android first (Google Play).
UI in English, currency EUR.

## Status

Feature `001` (record transactions, monthly summary) is implemented and tested; its APK
verification (tasks T052–T053) is pending. Feature `002` (monthly charts) is in progress; see
`PROGRESS.md`. Stack: Expo SDK 57 (React Native 0.86, TypeScript), Expo Router for screens,
`expo-sqlite` for on-device storage, Jest with React Native Testing Library for tests, and EAS
Build for APKs. The app stores everything on the phone and makes no network calls.

## How we work: Spec-Driven Development (GitHub Spec Kit), kept light

- Project principles live in `.specify/memory/constitution.md`. Read it before planning; it wins
  over this file if they conflict.
- Every feature follows: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → one doc
  review → `/speckit-implement`. Run `/speckit-clarify` only when the spec has real open
  questions. `/speckit-analyze` is not part of the flow: the doc review covers consistency.
- Each feature lives in `specs/NNN-feature-name/`.
- No app code without an approved spec, plan and tasks. If the code must deviate, update the spec
  or plan first.
- The developer reviews the output of each step before moving to the next.
- Feature `002` was planned under the earlier, heavier flow. Its docs stay as they are, but the
  review rules below apply to its remaining blocks.

### Plan only what the code needs

- Pick sensible defaults and write them down in one line. Ask the developer only real decisions:
  new libraries, the data model, money rules, and anything that costs money.
- Visual and motion details (exact sizes, durations, easing, copy polish) are settled on the
  phone in fine-tuning, not planned up front.
- Each session reads only the doc sections its task needs.

### Doc budget

These limits win over the defaults of the Spec Kit skills and templates. Going over budget is a
sign of over-planning: cut before adding.

- `spec.md`, about 150 lines: user stories, requirements, edge cases, success criteria. No
  implementation details.
- `plan.md`, about 100 lines: approach, Constitution Check, new dependencies with their
  justification, test approach, and a "Data" section when the data changes (it replaces
  `data-model.md`).
- `research.md` only when choosing between libraries or approaches with real trade-offs. No
  `quickstart.md`, `data-model.md` or `checklists/`.
- `contracts/`: only the public surface the `spec-tester` needs (module paths and signatures,
  screen texts, accessibility labels). Other docs link to it and never restate it.
- `tasks.md`, about 150 lines: one or two lines per task (what, where, which test), linking to
  the spec or contract section. Shared conventions go once at the top.
- `design.md`, about 100 lines: intent, hierarchy, states and mockups. `src/ui/theme.ts` is the
  source of truth for visual values (colors, sizes, spacing, motion); `design.md` names tokens
  and does not copy their numbers.

### Reviews

- Docs: one `sdd-reviewer` round per feature (`.claude/agents/sdd-reviewer.md`), on spec, plan
  and tasks together after `/speckit-tasks`; show its findings to the developer. Fix or
  explicitly accept every CRITICAL and MAJOR finding, then re-run the reviewer once, scoped to
  those fixes. MINOR findings are fixed or accepted without another review; anything left after
  the confirmation goes to the developer.
- Design: features with UI get a `design.md`, approved by the developer from mockups, before UI
  tasks are implemented. Run the `design-reviewer` agent (`.claude/agents/design-reviewer.md`)
  once when it is written, the same way.
- Code: after an implementation block, run a reviewer agent only when the block touches money or
  data logic (`src/domain/`, `src/data/`, money in hooks). UI blocks are checked on the phone.

### Acceptance tests and learning

- From feature `002`, each user story's phase in `/speckit-implement` starts with the
  `spec-tester` agent (`.claude/agents/spec-tester.md`): it reads only `spec.md` and
  `contracts/`, never the code, and writes black-box acceptance tests in
  `tests/acceptance/NNN/`. The phase ends with them green. Never change an acceptance test to
  match the code: a failing one is either a bug or a spec/contract gap, and gaps go to the
  developer (fix the spec or contract first, then the test). `/speckit-tasks` adds one task per
  story for it.
- From feature `002`, the developer writes one piece per feature (a small component or hook)
  and Claude reviews it; `tasks.md` marks that task.
- **Fine-tuning mode**: after a phone test, small UI tweaks that stay within spec.md and plan.md
  (look, spacing, text, motion feel) are made in code only, with their related tests, and the
  developer checks them on the phone. Once the developer approves a batch, update `design.md`
  only if its intent changed; no reviewer round. A tweak that changes a requirement, the data,
  or adds a library follows the full flow above (constitution, principle I).

Monthwise is a portfolio project, built step by step; it is not going to Google Play soon. Do not
plan store listings, release signing, Play policies or launch work in feature plans or tasks
unless asked. Verification builds are APKs installed on the developer's phone. Keep things that
become permanent once published (such as the package name) correct.

Roadmap (one feature at a time):

1. `001` Record income and expenses, see the monthly summary
2. `002` Monthly charts
3. `003` Savings goal
4. `004` Recurring expenses
5. `005` Automatic expense detection from bank notifications (Android)
6. `006` Backup and restore
7. `007` Multi-language support (needs a constitution amendment: the UI is English-only today)

## Setup and commands

Needs Node 22 and the Expo Go app on an Android phone.

```bash
npm install                          # install dependencies
npm start                            # dev server; scan the QR code with Expo Go
npm start -- --tunnel                # same, when the phone cannot reach the computer (e.g. WSL2);
                                     # Expo's shared ngrok tunnel is rate-limited and often fails
                                     # ("reading 'body'"): prefer WSL2 networkingMode=mirrored
EXPO_PUBLIC_DEV_TOOLS=1 npm start    # also show the dev tools (seed data, simulated storage error)
npx eas-cli build --platform android --profile preview      # installable APK with dev tools
npx eas-cli build --platform android --profile production   # installable APK, no logs or dev tools
```

- Use `npm start`, not `npx expo start`: the script sets `APP_VARIANT=development`. Without it
  the app config falls back to `production`, which blocks the INTERNET permission Expo Go needs.
- Add native-compatible dependencies with `npx expo install <package>`, so versions match the SDK.
- Build profiles live in `eas.json`; the variant-dependent config is in `app.config.ts`.

Project structure (details in `specs/001-monthly-summary/plan.md`):

```text
src/
├── app/      # screens and routes (Expo Router): summary, new and edit transaction forms
├── ui/       # presentational components and theme tokens from design.md
├── domain/   # pure TypeScript business rules: amounts in cents, months, summary, validation
├── data/     # SQLite: database provider, migrations, transaction repository
├── format/   # cents and dates to text for the UI (Intl, EUR)
├── hooks/    # useMonthSummary, useToday, useRegion
├── state/    # React contexts: selected month, summary notices
├── lib/      # app variant, logging rules, error reporting (codes only)
└── dev/      # preview-only dev tools, never in production builds
tests/        # unit/, integration/ (real SQL on better-sqlite3), component/, acceptance/ (spec-tester),
              # fixtures/, helpers/
plugins/      # Expo config plugins
specs/        # Spec Kit artifacts per feature
```

Dependencies point inward: `app/` → `ui/` and `hooks/` → `data/` and `domain/`. `domain/`
imports nothing from React, Expo or SQLite.

## Testing

- Every behavior change ships with tests; money calculations are unit-tested.
- Tests never hit the network.
- `npm test` (Jest), `npm run lint` (ESLint) and `npm run typecheck` (TypeScript). CI runs all
  three, plus `npm audit --audit-level=critical`, only on pull requests into `develop` and `main`.

## Code style

- Code, comments, commit messages and docs in English.
- Money is always integer cents, never floats; format as EUR only in the UI.
- Comments explain *why*, not *what*.

## Security and data

- Never commit secrets: use a git-ignored `.env` and a documented `.env.example`.
- Never log financial data (amounts, descriptions, categories tied to a user).

## Git workflow

- `main` holds released versions; `develop` is the integration branch.
- Feature branches are named after their spec (`001-feature-name`), branch off `develop` and
  merge back through a PR. Releases go from `develop` to `main` through a PR.
- Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`).
