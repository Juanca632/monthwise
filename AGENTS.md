# Monthwise

Personal finance mobile app: month by month, it shows how much money comes in, how much goes out
and where, and how much is left to save. Portfolio project, Android first (Google Play).
UI in English, currency EUR.

## Status

No app code yet. The tech stack is decided in the first feature's `/speckit-plan`. As soon as
code exists, add setup, commands and project structure to this file.

## How we work: Spec-Driven Development (GitHub Spec Kit)

- Project principles live in `.specify/memory/constitution.md`. Read it before planning; it wins
  over this file if they conflict.
- Every feature follows: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.
- Each feature lives in `specs/NNN-feature-name/` (`spec.md`, `plan.md`, `tasks.md`).
- No app code without an approved spec, plan and tasks. If the code must deviate, update the spec
  or plan first.
- The developer reviews the output of each step before moving to the next.

Roadmap (one feature at a time):

1. `001` Record income and expenses, see the monthly summary
2. `002` Monthly charts
3. `003` Savings goal
4. `004` Recurring expenses
5. `005` Automatic expense detection from bank notifications (Android)

## Setup and commands

TBD once the stack is chosen.

## Testing

- Every behavior change ships with tests; money calculations are unit-tested.
- Tests never hit the network.
- Commands: TBD once the stack is chosen.

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
