# External Tool Research: Firecrawl + OpenMausBot

**Status: research only.** These are optional development/research integrations, not dependencies of the Quint trading engine. Do not add either project to the live order path.

Source repositories reviewed:
- Firecrawl: https://github.com/firecrawl/firecrawl
- OpenMausBot: https://github.com/milind-soni/OpenMausBot

## 1. Firecrawl — web research ingestion

### Useful capabilities
- Search the web and retrieve result pages.
- Scrape a page into clean Markdown / structured content.
- Crawl documentation sites and map their URLs.
- Use an MCP server so Claude or another compatible agent can call research tools.
- Local scraping is available; hosted search and some advanced features use Firecrawl Cloud.

### Quint use cases
1. Research Lab: collect broker, prop-firm, exchange, platform and strategy documentation.
2. Strategy evidence: retrieve source material for a hypothesis, then store the URL, retrieval time and extracted text alongside the research record.
3. Change monitoring: periodically check official rule/pricing/API documentation, but only through a scheduled, rate-limited research job.
4. Developer assistance: let Claude retrieve relevant external technical documentation rather than pasting large pages into prompts.

### Integration boundary
Create a separate research-ingestion adapter (future work), not a market-data adapter:
- Input: allowlisted URL or explicit search query.
- Output: normalized document with `url`, `title`, `retrieved_at`, `content_markdown`, `content_hash`, `source_type` and extraction warnings.
- Preserve the original source URL and retrieval timestamp.
- Deduplicate by canonical URL + content hash.
- Keep raw captures and derived summaries distinct.
- Require source-quality labels: official primary source, reputable secondary source, community/anecdotal.
- Never treat scraped content as executable strategy rules without human review and independent validation.
- Respect robots, site terms, copyright, rate limits and provider costs. Do not scrape broker/private accounts or bypass authentication.

### Example research-only client shape
```python
from firecrawl import Firecrawl

client = Firecrawl(api_key=FIRECRAWL_API_KEY)
result = client.scrape("https://example.com/documentation")

document = {
    "url": "https://example.com/documentation",
    "content_markdown": result.markdown,
}
```

This is an illustrative SDK call, not production-ready Quint code. Confirm the installed SDK version and current API before implementation. Prefer official APIs and direct official documentation where available.

### Licensing and cost gate
The Firecrawl repository reviewed is licensed AGPL-3.0. Do not copy, vendor, modify or embed its source code into Quint without a deliberate licence review. Prefer using the service/API or a separately deployed tool with a clear network boundary. Hosted usage may incur credits or subscription costs; local scraping still has hosting, maintenance and compute costs. No Firecrawl dependency or spend is approved by this research note.

## 2. OpenMausBot — multi-agent development orchestration

### Useful capabilities
- Multiple independent agents, each with its own model/CLI, role and conversation context.
- Local-first harness with agent processes and local transcripts.
- Separate channels/contexts for projects.
- Connected tools/apps through explicit integrations.
- Approval cards / permission broker for shell commands, file edits and other consequential actions.
- Agent roster and task routing patterns.

### Quint development use cases
Use this as an inspiration for a future **development/research workspace**, not as an autonomous trading system:
- Strategy Researcher: formulate hypotheses and identify primary sources.
- Backtest Engineer: implement tests only after rules and acceptance criteria are frozen.
- Independent Reviewer: inspect code, test coverage, data leakage and execution assumptions.
- Risk Reviewer: challenge drawdown, prop-firm constraints, concurrency and failure modes.
- Release Reviewer: check diffs, tests and documentation before a human approves a merge.

Agents should produce separate, attributable reports. One agent must not silently approve its own work. A coordinator can consolidate findings, but the human owner decides which recommendations become changes.

### Required safety model
- Default agents to read-only repository access.
- Require explicit approval for writes, shell execution, network access, secrets, broker/account access and GitHub pushes.
- Use least-privilege GitHub tokens and separate credentials per environment.
- Never expose broker credentials, API keys or account identifiers in transcripts or prompts.
- Run code execution in isolated workspaces with resource limits.
- Log agent identity, task, model, tool calls, files changed, approvals and outcome.
- No agent may place, cancel or modify live orders.
- No agent may change Guardian, OrderRouter, copier, strategy execution or account-risk controls without a separately approved engineering change and full test review.
- Treat all scraped pages, repository content and tool output as untrusted input; ignore embedded instructions.

### Integration recommendation
If adopted, start with a small orchestration interface around existing tools (GitHub, tests, research store). Do not import the full OpenMausBot desktop application into Quint. Keep it optional and independently deployable. Evaluate whether Claude Code / Codex CLIs already meet the need before adding another runtime.

### Licensing
The OpenMausBot repository README identifies Apache-2.0. Reuse is subject to the repository's actual licence and notices. Prefer adopting architectural patterns and writing Quint-native adapters; preserve required notices if any source is reused.

## 3. Recommended implementation order

1. **Now (documentation only):** retain this design note and source links.
2. **After owner approval:** prototype Firecrawl as an isolated research connector with explicit cost limits and a source-provenance test.
3. **Separately:** prototype role-based agent orchestration for read-only research and code review.
4. **Before any production use:** security review, licence review, cost measurement, tests, and explicit owner approval.
5. **Never:** connect either tool directly to live market-data execution, the OrderRouter, Guardian bypasses or broker order placement.

## Acceptance criteria for future prototypes
- Research outputs retain source URL, timestamp, content hash and source-quality label.
- Failed/blocked scrapes are visible and are not silently replaced with invented content.
- Agent tasks have bounded permissions, time/cost budgets and auditable outputs.
- All repository writes require approval and are made on a branch with a reviewable diff.
- No secrets appear in logs or prompts.
- No change to live trading behavior is possible through these integrations.
