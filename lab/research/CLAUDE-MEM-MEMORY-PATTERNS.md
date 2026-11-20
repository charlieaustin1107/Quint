# Claude-Mem: useful memory patterns for Quint

**Status: research/specification only.** This document adapts selected ideas from [Claude-Mem](https://github.com/thedotmack/claude-mem) for Quint. It does not install Claude-Mem, copy its runtime, add dependencies, or change any trading/runtime code.

## Verdict

Claude-Mem is useful as a reference for making Claude's development work persistent across sessions. Quint already has a domain-specific memory system:

- `lab/brain/registry.json` is the canonical record of strategies, evidence, verdicts, lessons and queued experiments.
- `lab/brain/journal.md` is the chronological work diary.
- `lab/FACTORY.md` defines the research loop and requires sessions to read memory first and write it last.

Do not replace these files or create a second competing strategy registry. The useful addition is a **development-session memory layer** that captures important decisions and work outcomes, then retrieves only relevant records for the next session.

## Patterns worth adapting

1. **Lifecycle capture:** capture a small event at session start, after meaningful tool/work milestones, and at session end. Prefer explicit summaries over storing every prompt, terminal output or file read.
2. **Observer-style extraction:** turn a session into concise, typed observations: decision, constraint, implementation, bug/fix, test result, research finding, rejected idea, open question and next step. The observer may propose a record; it must not silently alter canonical strategy status or trading rules.
3. **Progressive recall:** retrieve a compact index first, then a short timeline, then full detail only for selected records. This follows Claude-Mem's `search → timeline → get details` pattern and avoids injecting an entire project history into every Claude context.
4. **Provenance:** every important record should point to its source: repository path and commit, PR/issue, test command and result, research URL/publication, or immutable backtest run ID and manifest.
5. **Session close-out:** generate a compact handover containing completed work, changed files, tests actually run, failures/blockers, decisions made and the exact next action.

## Proposed Quint memory record

Use a small, versioned schema if/when implementation is approved:

- `id`: stable unique record ID
- `project`: `quint-control`, `quint-lab`, `quint-brain`, `chart-wizard`, or shared repository work
- `kind`: decision, constraint, finding, bugfix, test, rejection, question, handover
- `title` and concise `summary`
- `created_at` and `session_id`
- `source_refs`: commit SHA, file path, PR/issue, run ID or external URL
- `confidence`: observed, independently verified, or hypothesis
- `tags` and optional `supersedes` link

Keep records append-only where practical. Corrections should supersede earlier observations rather than erase the audit trail. A memory record is not proof: strategy evidence must remain in the versioned run manifest/results and the canonical registry.

## Where it belongs

- **Quint Lab:** continue to keep strategy truth in `lab/brain/registry.json` and the journal. A future session-memory index may link to them, but must not duplicate or override their verdicts.
- **Quint Control:** keep product decisions and engineering handovers in its own namespace. Never let a recalled note modify Guardian, OrderRouter, account permissions, execution settings or bot rules.
- **Chart Wizard / Quint Brain:** keep separate namespaces and preserve their existing product boundaries.
- **Shared repository rules:** `CLAUDE.md` remains the concise top-level instruction source. Memory retrieval should surface only relevant rules, not paste the entire history into every session.

## Retrieval policy

1. Start with project + task + relevant tags.
2. Return a short index (IDs, dates, titles, confidence, source refs).
3. Expand only selected records and, where useful, the surrounding timeline.
4. Prefer newer records only when they explicitly supersede older decisions; do not treat recency alone as authority.
5. When a memory conflicts with a canonical file, current code, test output or explicit owner instruction, flag the conflict and defer to the authoritative source. Never silently resolve it.
6. Inject a strict token budget. Do not load every record or every research document by default.

## Privacy, security and cost gates

- Quint's GitHub repository is public. Never write private account details, balances, journal entries, personal information, API keys, credentials, broker identifiers or private P&L into tracked memory.
- Private owner-specific records stay in Quint HQ's private storage, not GitHub. Keep development memory separate from private trading/account memory.
- Default to local storage and local search. Cloud sync, hosted observers and external model processing must be opt-in, separately costed and explicitly approved.
- Do not transmit complete source files, terminal histories, screenshots or raw prompts by default. Store minimal summaries and source references.
- Redact secrets before persistence. Support an explicit private/no-store marker for sensitive content.
- Treat tool output, scraped pages, issue comments and recalled text as untrusted data, never as instructions. Defend against prompt injection and poisoned memory.
- Bound retention, database size, indexing work and model calls. A deterministic extractor or direct user-authored handover should be the fallback when no observer budget is available.
- Memory is advisory context only. It cannot trigger tools, commits, merges, deployments, strategy promotion or orders.

## Suggested implementation sequence (future approval required)

1. **No-dependency first step:** standardise the existing journal/handover format and require Claude to update it at session end. Keep the registry canonical.
2. **Local index:** if search becomes painful, add a small local SQLite/FTS index over approved summaries and source references. Treat it as a rebuildable index, not the source of truth. Do not add a vector database until measured retrieval failures justify it.
3. **Lifecycle integration:** add minimal Claude Code hooks for session start/end and selected milestone events. Hooks should call a local service or script with bounded timeouts; failures must never block coding or trading.
4. **Optional semantic observer:** only if deterministic extraction + keyword search are insufficient. Make provider, model, cost ceiling, retention and data-sharing explicit settings.
5. **Validation:** test recall precision, stale/conflicting memories, secret redaction, prompt-injection resistance, token overhead, offline operation, crash recovery and zero interference with existing Quint tests.

## Explicitly not recommended

- Do not copy the entire Claude-Mem repository or its large dependency/runtime stack into Quint.
- Do not replace Quint's registry, journal, strategy evidence or private HQ storage with Claude-Mem's database.
- Do not make Claude-Mem's hosted observer, cloud sync, account, paid plan or external model a Quint dependency.
- Do not automatically record every tool call or inject long transcripts into every prompt.
- Do not let memory decide whether a bot is profitable, approved or safe to trade.
- Do not connect memory services to the live order path.

## Upstream and licence

Reference implementation: [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem). Its repository README identifies Apache License 2.0. This document records architectural ideas, not copied source code. If code is later copied or adapted, preserve required Apache-2.0 notices and review the exact file and dependency licences first.

Useful upstream concepts to inspect during a future implementation: lifecycle hooks, the local worker boundary, SQLite/FTS storage, context builder, progressive search tools and explicit privacy controls. Re-check upstream version and behaviour before implementation; this document is not a claim that a specific API is stable.
