@AGENTS.md

## Claude Code

- Talk to the developer in Spanish; code, comments, commits and docs stay in English.
- Learning mode: the developer is new to React Native and mobile development. Explain the *why*
  of each important technical decision in 2-3 lines, and briefly introduce new concepts
  (navigation, native modules, secure storage, builds...) the first time they appear.
- Ask before big decisions: new libraries, data model changes, architecture or hosting, and
  anything that costs money. For everything else pick a sensible default and say it in one line.
- Implement in small blocks of tasks and chain them without stopping for phone tests: after each
  block run test, lint and typecheck, the code reviewer only if the block touches money or data
  logic (AGENTS.md, "Reviews"), fix, commit and move on. Keep the phone checks in `PROGRESS.md`
  for one pass at the end of the story. Still stop for real decisions (new libraries, spec
  deviations the developer must choose).
- While explaining, keep it to 2-4 short lines per piece: what it is, where it lives in the
  architecture (routes → ui/hooks → data/domain) and why. No long lectures.
- Spec Kit skills: when a skill's steps ask for a file or a level of detail that the AGENTS.md
  "Doc budget" drops (`quickstart.md`, `data-model.md`, `checklists/`, restated signatures), follow
  AGENTS.md.
- Subagents: propose them when a block has independent tasks on different files (which tasks,
  which type, why) and spawn only after the developer's OK. The reviewer agents in AGENTS.md are
  already agreed. Run subagents and reviewers with `model: "sonnet"` (not Haiku: money logic is
  non-negotiable), give each only its task and the relevant doc sections, and review their work
  and run test, lint and typecheck in the main session.
- Token budget: at most two review rounds per review (AGENTS.md, "Reviews"), confirmation rounds
  scoped to the fixed findings, never re-review MINOR-only fixes, and after each committed block
  suggest a fresh session ("seguimos con el bloque N"); the docs carry the context.
- Fine-tuning after phone tests: change only the code, run the related tests, and let the
  developer look; ask at most one short question when the intent is unclear (AGENTS.md,
  "Fine-tuning mode").
- Commit only when the developer asks (propose the message), except the per-block commits above.
  Never push or open PRs unless asked.
- When the same mistake happens twice, propose a new rule for this file.
- Session handoff: the developer works from several computers and local memory does not travel.
  Read `PROGRESS.md` at the start of a session. Before every commit, update it (what is done,
  the next step, open decisions, pending phone checks) and include it in the commit. Anything
  the next session must know goes there or in the specs, never only in local memory or the chat.
