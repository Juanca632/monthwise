# Monthwise Constitution

Monthwise is a personal finance mobile app that shows, month by month, how much money comes in,
how much goes out and where, and how much is left to save. It is also a portfolio project, so
engineering quality is part of the product.

## Core Principles

### I. Spec-Driven Development

- No production code is written without an approved spec, plan and task list for the feature
  (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks`).
- If implementation must deviate from the spec or plan, the spec or plan MUST be updated first,
  and the change approved, before the code changes.
- Each feature lives in its own `specs/NNN-feature-name/` directory.

Rationale: the spec is the source of truth; keeping it current makes AI-assisted work reviewable
and keeps the project explainable.

### II. Tested Behavior (NON-NEGOTIABLE)

- Every behavior change MUST ship with automated tests in the same change. Tests may be written
  before or after the code.
- All money calculations (totals, balances, savings, rounding) MUST be covered by unit tests.
- Tests MUST NOT hit the network; external services are mocked or faked.
- A feature is done only when CI is green.

Rationale: a finance app that miscalculates loses all trust; tests are the only proof it works.

### III. Financial Data Integrity & Privacy

- Monetary amounts MUST be stored and computed as integer cents. Floating-point numbers MUST NOT
  be used for money.
- The currency is EUR; amounts are formatted for display only at the UI edge.
- Secrets (API keys, tokens, credentials) MUST NOT be committed; they live in git-ignored
  environment files with a documented `.env.example`.
- Financial data (amounts, descriptions, categories tied to a user) MUST NOT appear in logs,
  analytics or error reports.
- The app MUST keep as little financial data off the device as the chosen architecture allows.

Rationale: integer cents avoid rounding errors (`0.1 + 0.2 ≠ 0.3`); personal finance data is
sensitive and must be treated that way by default.

### IV. Simplicity First

- A new dependency MUST NOT be added without a written justification in the feature's
  `plan.md` (what it solves, why the platform or existing code is not enough).
- Build the smallest solution that meets the spec; no speculative features, abstractions or
  configuration for needs that do not exist yet.

Rationale: a solo developer can only maintain what stays small, and every part must be
explainable in an interview.

### V. Fast, Mobile-First UX

- Recording an expense MUST take only a few seconds: reachable from the main screen and
  completable in a single short form.
- Every screen MUST define clear empty, loading and error states.
- The UI language is English.

Rationale: if logging an expense is slow, the user stops logging, and the monthly numbers become
meaningless.

## Platform & Technical Constraints

- Android first: the app targets Android and is published on Google Play.
- iOS and web are out of scope for now; they may be revisited through a constitution amendment.
- The tech stack, including local-first versus backend storage, is decided per feature in
  `/speckit-plan` and MUST comply with the principles above.

## Development Workflow

- One branch per feature, named after its spec directory (e.g. `001-monthly-summary`).
- Small, focused commits using Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`,
  `chore:`).
- Pull requests are merged only with green CI.
- Code, comments, commit messages and documentation are written in English.

## Governance

- This constitution supersedes all other project practices. Where another document conflicts
  with it, the constitution wins.
- Amendments go through `/speckit-constitution`, are reviewed and committed like any other
  change, and bump the version with semantic versioning:
  - MAJOR: a principle is removed or redefined in an incompatible way.
  - MINOR: a principle or section is added or materially expanded.
  - PATCH: clarifications and wording fixes.
- Every `plan.md` MUST pass the Constitution Check; any justified exception is recorded in the
  plan's complexity tracking section.
- Day-to-day development guidance for humans and AI agents lives in `AGENTS.md` and `CLAUDE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-10-04 | **Last Amended**: 2026-10-04
