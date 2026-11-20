# The sequence analyst: what each pillar of WYLD's strategy is worth

As of 2026-11-19, on 22 sessions of 5-minute MNQ candles. Every average has a 95% range from 10,000 bootstrap resamples; nothing below 30 trades is a finding. Costs included ($0.50 a side and 1 tick of slippage). Not financial advice. Built by `lab/brain/anatomy.js`.

## What Quint learned tonight
- With WYLD's own pools only (15m equal highs and lows), no setup started: all 52 pools marked before the open had already been run before 9:30, so there was nothing left to sweep in the window.
- With your settings (prior-day and overnight highs and lows count too): 23 sweeps → 4 held a level (17%) → 4 PDRs → 0 confirmations → 0 entries.
- Which pools were swept: ONH 11, ONL 11, PDH 1 (EQH/EQL: 15m equal highs/lows, PDH/PDL: prior day, ONH/ONL: overnight).
- Most sweeps die at ②: 19 of 23 had no higher-timeframe level hold nearby in time. Pillar ② is the main filter.
- Every PDR ended before a 5-minute confirmation formed (Point B reached 2, broken 2). WYLD confirms on the 1-minute chart; this needs 1-minute candles to judge.
- ① the sweep: 0 trades with it, 16 without. Too few to judge (needs 30 in both).
- ② the HTF level: 0 trades with it, 3 without. Too few to judge (needs 30 in both).
- ③ the PDR: 0 trades with it, 3 without. Too few to judge (needs 30 in both).
- The 3-hour window: 0 trades with it, 0 without. Too few to judge (needs 30 in both).
- Most trades to study: without ① the sweep (price simply trades into a level), 16 trades, average -0.67R (95% range -1.02R to -0.26R). Below 30 trades, so a description, not a finding.
- Why losers lost: 3 of 13 were +1R up first (break-even at 1R would have saved them), 7 were +0.5R up first.
- How winners won: they went a median 0.48R against first, and 0 of 3 came within a quarter of the stop.
- No confirmation has 30 trades yet: break 3, wick 7, ifvg 5, retest 13, fvgRetest 7.

## The funnel: how far setups get
| Run | Sweeps | Held ② | PDRs ③ | Confirmations ④ | Entries | Trades | Avg R (95% range) | Net |
|---|---|---|---|---|---|---|---|---|
| WYLD's own pools only (15m equal highs and lows) | 0 | 0 | 0 | 0 | 0 | 0 | — | — |
| Your settings (prior-day and overnight highs/lows count too) | 23 | 4 | 4 | 0 | 0 | 0 | — | — |
| Without ① the sweep (price simply trades into a level) | 115 | 104 | 103 | 106 | 16 | 16 | -0.67R (95% range -1.02R to -0.26R) | $-688 |
| Without ② the HTF level (a close back beyond the swept pool) | 24 | 18 | 18 | 62 | 3 | 3 | +3.46R (95% range +1.70R to +5.80R) | $2618 |
| Without ③ the PDR (a fixed 2R target) | 23 | 4 | 4 | 9 | 3 | 3 | -1.01R (95% range -1.02R to -1.00R) | $-609 |
| Without the 3-hour window (until 15:30 New York) | 28 | 4 | 4 | 0 | 0 | 0 | — | — |

## Each pillar: with it against without it
| Pillar | Trades with / without | Avg R with | Avg R without | Difference (95% range) | Verdict |
|---|---|---|---|---|---|
| ① the sweep | 0 / 16 | — | -0.67R | — | too few trades to judge |
| ② the HTF level | 0 / 3 | — | +3.46R | — | too few trades to judge |
| ③ the PDR | 0 / 3 | — | -1.01R | — | too few trades to judge |
| the 3-hour window | 0 / 0 | — | — | — | too few trades to judge |

## Each confirmation on its own
| Confirmation | Trades | Avg R (95% range) | Net |
|---|---|---|---|
| a held level broke | 3 | -0.03R (95% range -1.01R to +0.81R) | $78 |
| a wick held and price closed beyond it | 7 | -0.52R (95% range -1.02R to +0.12R) | $-255 |
| an FVG inverted | 5 | -0.81R (95% range -1.08R to -0.34R) | $-458 |
| the HTF level retest held | 13 | -0.86R (95% range -1.03R to -0.53R) | $-776 |
| price traded into a new FVG and held | 7 | -1.02R (95% range -1.04R to -1.01R) | $-748 |

## Why trades worked or didn't (without ① the sweep (price simply trades into a level), 16 trades)
- How they ended: stop 13, target 1, close 2.
- Losers: 13. Up +0.5R first: 7. Up +1R first: 3. Median time 5 minutes.
- Winners: 3. Median heat taken first: 0.48R. Came within a quarter of the stop: 0. Median time 330 minutes.

**What made the trades** (a description until each line has 30 trades):
- pool: HTF level 16 (-0.67R)
- confirm: retest 12 (-0.85R) · wick 3 (+0.15R) · ifvg 1 (-1.01R)
- side: long 9 (-0.77R) · short 7 (-0.54R)
- level: daily 12 (-0.74R) · weekly 3 (-1.01R) · monthly 1 (+1.20R)
- pastHalf: before the 0.5 16 (-0.67R)
- entry: first entry 15 (-0.79R) · re-entry 1 (+1.12R)
- time: after 11:30 6 (-1.02R) · 10:30–11:30 5 (-1.03R) · 10:00–10:30 4 (+0.39R) · 9:30–10:00 1 (-1.03R)
- room: 1–2R to B 7 (-0.72R) · 3R+ to B 6 (-0.44R) · 2–3R to B 3 (-1.02R)
- stop: stop > 10 pts 16 (-0.67R)

## Proposals for the queue (pre-register before testing)
- **one-minute-data** (already queued): Fetch 1-minute MNQ candles nightly and run the analyst on them once there are 10 sessions. Why: Every PDR ended before a confirmation on 5-minute candles. Pass mark: At least 30 confirmations across the 1-minute sessions.
- **wyld-hold-60** (already queued): Let a level hold within 60 minutes of the sweep (holdMinutes 60) instead of 30. Why: 19 of 23 sweeps died at ②. Pass mark: On sessions after 2026-11-19 only: 30+ trades, average R not worse than as written, and more setups reaching ③.
