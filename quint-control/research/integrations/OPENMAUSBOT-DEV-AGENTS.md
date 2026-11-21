# OpenMausBot-inspired development agents for Quint

**Status: proposed workflow; documentation only.** Quint Control is currently on HOLD. This document does not authorise dashboard, engine or trading-runtime implementation.

## Decision

Use OpenMausBot as an optional **development-time agent workspace**, not as a component of Quint's deployed trading system.

Its useful pattern is a roster of independent agents with separate responsibilities, tools and working context, coordinated through a human-visible workflow. Quint can adopt that pattern without embedding the OpenMausBot desktop application or granting agents unrestricted control of the trading system.

## Recommended Quint agent roles

| Agent | Job | Permitted work |
|---|---|---|
| Research analyst | Find and summarise MNQ/NQ evidence | Read-only research; source citations and uncertainty labels |
| Strategy challenger | Challenge assumptions and identify failure modes | Read-only review; no strategy promotion |
| Backtest engineer | Design tests and inspect backtest implementation | Work on a dedicated branch after implementation approval; fixtures and tests |
| Code auditor | Find bugs, unsafe paths and missing tests | Read-only review by default; proposed patches on a separate branch only when authorised |
| Integration reviewer | Check Firecrawl, data and API boundaries | Read-only architecture and licence review |
| Release reviewer | Check diffs, tests, security and documentation | Read-only release checklist; cannot merge or deploy |

Agents should disagree constructively. The coordinator must preserve conflicting findings rather than averaging them into false consensus. A strategy's status can only change through Quint's explicit evidence gates and owner approval.

## Safe operating model

1. Give every task a written objective, scope, expected output and prohibited actions.
2. Give agents the minimum filesystem, repository and tool permissions needed.
3. Keep agent work isolated: one task/branch per implementation agent; no concurrent edits to the same files.
4. Default research and review agents to read-only access.
5. Require a human to approve branch creation if it affects protected work, merges, releases, deployments, secrets, account connections or any action outside the task.
6. Require tests and an independent review before a patch is proposed for merge.
7. Never give a development agent broker credentials, prop-firm logins, live account access or authority to enable live trading.
8. Never allow an agent to weaken Guardian rules, account limits, kill switches, authentication or OrderRouter safeguards.
9. Record the model, task, branch, files changed, tools used, test results and human approvals for each task.
10. If an agent loses context or encounters a conflict, stop and request review; do not guess or overwrite another agent's work.

## Suggested development workflow

```text
Owner defines task and approves scope
              |
              v
Coordinator creates isolated task brief
              |
       +------+------+------+
       |             |      |
       v             v      v
 Researcher     Code auditor  Strategy challenger
       |             |      |
       +------+------+------+
              |
              v
     Coordinator consolidates
     evidence and disagreements
              |
              v
       Owner approves patch work
              |
              v
     Implementer works on branch
              |
              v
     Independent reviewer + tests
              |
              v
       Owner reviews and merges
```

This is a proposed workflow, not a claim that OpenMausBot exposes a stable Quint integration API. Do not build against undocumented internal endpoints. Initially, agents can exchange task briefs and review reports through normal GitHub issues/branches/PRs.

## Where this fits in Quint

- Use agents to help develop Quint Control and its research library.
- Use Firecrawl as an optional source-ingestion tool for the research analyst, subject to its separate integration specification.
- Keep deterministic trading decisions in the versioned strategy code, Guardian and OrderRouter.
- Keep AI outside the live execution loop. An agent may propose a strategy or explain a test; it cannot approve itself, change a live setting or place an order.
- Do not add an always-on agent service to the trading runtime. That would add operational, security and cost dependencies without improving deterministic order execution.

## Licensing and reuse

The owner's OpenMausBot repository declares Apache-2.0. If Quint later copies specific code, preserve the required licence and copyright notices, include the licence and note material modifications. Review each file's headers and third-party dependencies before reuse; a repository-level licence does not override separately licensed dependencies or assets.

Prefer borrowing the architecture and workflow first. Do not vendor the Electron desktop application, local agent harness, VM/computer-control layer or connected-app integrations into Quint.

## Acceptance checks before any future integration

- Agent permissions are explicit, least-privilege and revocable.
- Read-only agents cannot write files or invoke mutations.
- Implementation agents are restricted to their assigned branch and paths.
- No agent has broker credentials or live trading permissions.
- No automatic merge, deployment or live-enable action exists.
- Agent output is treated as untrusted; code and claims are independently reviewed.
- Task logs preserve provenance, changed files, tests, model and approvals.
- A failed or unavailable agent never blocks Quint's trading engine.
- Agent/API/model costs are metered and bounded.
- No undocumented OpenMausBot endpoint is assumed.

## References

- Owner's fork: https://github.com/charlieaustin1107/OpenMausBot
- Upstream project: https://github.com/milind-soni/OpenMausBot
