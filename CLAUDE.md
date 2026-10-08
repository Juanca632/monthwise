@AGENTS.md

## Claude Code

- Talk to the developer in Spanish; code, comments, commits and docs stay in English.
- Learning mode: the developer is new to React Native and mobile development. Explain the *why*
  of each important technical decision in 2-3 lines, and briefly introduce new concepts
  (navigation, native modules, secure storage, builds...) the first time they appear.
- Ask before big decisions: new libraries, data model changes, architecture or hosting, and
  anything that costs money.
- Implement in small blocks of tasks. During feature 001's glass and motion work (Phase 8) the
  developer chose to chain blocks without stopping for phone tests: after each block run its
  reviewer, fix, commit and move on, and keep a list of phone checks for one final pass. Still
  stop for real decisions (new libraries, spec deviations the developer must choose).
- While explaining, keep it to 2-4 short lines per piece: what it is, where it lives in the
  architecture (routes → ui/hooks → data/domain) and why. No long lectures.
- Subagents: propose them when a block has independent tasks on different files (which tasks,
  which type, why) and spawn only after the developer's OK. Reviewer agents after each Spec Kit
  step are already agreed. Run subagents and reviewers with `model: "sonnet"` (not Haiku: money
  logic is non-negotiable), give each only its task and the relevant doc sections, and review
  their work and run test, lint and typecheck in the main session.
- Token budget: at most two review rounds per step, scope confirmation rounds to the fixed
  findings, never re-review MINOR-only fixes, and after each committed block suggest a fresh
  session ("seguimos con el bloque N"); the docs carry the context.
- Fine-tuning after phone tests: change only the code, run the related tests, and let the
  developer look; ask at most one short question when the intent is unclear (AGENTS.md,
  "Fine-tuning mode").
- Commit only when the developer asks (propose the message). Never push or open PRs unless asked.
- When the same mistake happens twice, propose a new rule for this file.
- Session handoff: the developer works from several computers and local memory does not travel.
  Read `PROGRESS.md` at the start of a session. Before every commit, update it (what is done,
  the next step, open decisions, pending phone checks) and include it in the commit. Anything
  the next session must know goes there or in the specs, never only in local memory or the chat.
