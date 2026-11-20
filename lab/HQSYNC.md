# Quint HQ sync

The scheduled **Quint Lab nightly** session does this every weeknight at **23:25 UK**, after Trading Mastery's Jarvis dream run (22:40) has written its report. It copies a short, private summary of the owner's Trading Mastery data into Quint HQ's private storage, so the hub can answer "how much have my bots made?", read last night's report aloud, and know the owner's pinned rules.

**Hard rules**
- **Read-only on Trading Mastery** (https://claude.ai/artifact/4AhyMBBvRs9j4P3LKEmhnZ). Use the ArtifactData tool to read; never write, publish or delete anything there.
- **Write only one document:** `feeds/tm` in Quint HQ's storage (https://claude.ai/artifact/NF7M9VSX3YrsyUPWWL1uim).
- **Never commit any of this to git.** The Quint repo is public; this is the owner's money.
- No TradingView calls. No account numbers, emails or tokens: shorten account names to their last 4 characters.
- Never mix account types: live/prop, sim, playback and backtest stay separate, and only `live` counts as real money.
- Every number comes from what you read tonight. If something is missing, leave it out.

## Steps
1. Load the ArtifactData tool. Read from Trading Mastery, saving to a scratch folder rather than printing:
   - `dream/latest` (get);
   - `bots` (query, limit 100);
   - `bot_trades` for the current and previous month (query, where `ym` is one of those months), only if needed for per-type numbers;
   - `brain` (query, limit 300): keep notes that are pinned or have `cat` "rules" or "goals".
2. Summarise with a short Python script into this shape (keep it under 20 KB):
```
{
  "at": "<ISO time now>",
  "source": "Trading Mastery (read-only)",
  "dream": { "date": "", "status": "", "top": "<the single most important finding>",
             "priorities": [], "health": [], "risk": [], "learning": [] },
  "bots": [ { "name": "", "status": "running|paused|retired", "note": "", "lastImport": "<ISO>",
              "byType": { "live": { "n": 0, "net": 0, "wr": 0, "pf": 0, "maxDD": 0, "worstDay": 0,
                                    "today": { "n": 0, "net": 0 }, "last5": { "n": 0, "net": 0 } },
                          "sim": { … }, "playback": { … }, "backtest": { … } } } ],
  "rules": [ { "title": "", "text": "<300 characters at most>" } ],
  "goals": [ { "title": "", "text": "" } ]
}
```
   Keep at most 5 items in each `dream` list, 12 rules and 5 goals. "today" is the New York session that ended at 17:00 New York today; "last5" is the last five sessions. Leave out a type a bot never traded.
3. Write it with ArtifactData `set` on `feeds/tm` in Quint HQ (get it first and pass its version as `if_version` if it exists). Read it back once to confirm.
4. Finish with one line: synced or not, and why. Send a push notification only if the sync failed two nights running.

Nothing here is financial advice.
