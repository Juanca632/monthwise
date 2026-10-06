# Monthwise

Personal finance mobile app: month by month, it shows how much money comes in, how much goes out
and where, and how much is left to save. Portfolio project, Android first (Google Play).
UI in English, currency EUR.

## Status

Feature `001` (record transactions, monthly summary) is implemented and tested; its APK
verification (tasks T052–T053) is pending. Stack: Expo SDK 57 (React Native 0.86, TypeScript),
Expo Router for screens, `expo-sqlite` for on-device storage, Jest with React Native Testing
Library for tests, and EAS Build for APKs. The app stores everything on the phone and makes no
network calls.

## How we work: Spec-Driven Development (GitHub Spec Kit)

- Project principles live in `.specify/memory/constitution.md`. Read it before planning; it wins
  over this file if they conflict.
- Every feature follows: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.
- Each feature lives in `specs/NNN-feature-name/` (`spec.md`, `plan.md`, `tasks.md`).
- No app code without an approved spec, plan and tasks. If the code must deviate, update the spec
  or plan first.
- After `/speckit-specify`, `/speckit-clarify`, `/speckit-plan` and `/speckit-tasks`, run the
  `sdd-reviewer` agent (`.claude/agents/sdd-reviewer.md`) on the artifact that step produced, and
  show its findings to the developer before they approve the step. Fix or explicitly accept every
  CRITICAL and MAJOR finding, then re-run the reviewer once, as a confirmation scoped to those
  fixes. Two rounds per step at most: MINOR findings are fixed or accepted without another
  review, and anything left after the confirmation goes to the developer to decide.
- Features with UI get a `design.md` (visual design, approved by the developer from mockups)
  before UI tasks are implemented. After writing or changing it, run the `design-reviewer` agent
  (`.claude/agents/design-reviewer.md`) the same way.
- The developer reviews the output of each step before moving to the next.
- **Fine-tuning mode**: after a phone test, small UI tweaks that stay within spec.md and plan.md
  (look, spacing, text, motion feel) are made in code only, with their related tests, and the
  developer checks them on the phone. Once the developer approves a batch, design.md (and any
  other doc the batch touches) is updated once and reviewed in one round before the commit. A
  tweak that changes a requirement, the data, or adds a library follows the full flow above
  (constitution, principle I).

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
tests/        # unit/, integration/ (real SQL on better-sqlite3), component/, fixtures/, helpers/
plugins/      # Expo config plugins
specs/        # Spec Kit artifacts per feature
```

Dependencies point inward: `app/` → `ui/` and `hooks/` → `data/` and `domain/`. `domain/`
imports nothing from React, Expo or SQLite.

## Testing

- Every behavior change ships with tests; money calculations are unit-tested.
- Tests never hit the network.
- `npm test` (Jest), `npm run lint` (ESLint) and `npm run typecheck` (TypeScript). CI runs all
  three on pull requests into `develop` and `main` and on pushes to them.

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
