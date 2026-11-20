# Futures prop firms: overnight and weekend holding research

**Research date:** 19 November 2026  
**Scope:** Futures prop accounts relevant to MNQ/NQ-style trading. This is a rules comparison, not a recommendation to buy an evaluation. Firm rules, account products, execution access and payout terms can change. Re-check the exact plan's live contract and help-centre rules before enabling an account.

## The important distinction

- **Overnight hold:** a position remains open through the daily CME maintenance break and into the next session.
- **Weekend hold:** a position remains open through Friday's close and the Sunday reopen.
- **Overnight session trading is not overnight holding.** A firm may let you trade Globex from the evening reopen but still require every position to be closed before its daily cutoff.

A strategy can use daily/weekly charts without being allowed to carry a position overnight. Quint must model the account's actual holding permissions, not infer them from the strategy timeframe.

## Strongest candidates found

| Firm / exact account | Daily close hold | Weekend hold | MNQ-relevant published restriction / note | Evidence |
| --- | --- | --- | --- | --- |
| **Phidias — Premium** | Yes | Yes | Official rules explicitly allow overnight and over-week positions on Premium. Fundamental and Express to Live accounts must be flat. Premium lists 50K/100K/150K and up to 100 micro contracts on 50K; verify current size rules and drawdown exposure carefully. | [Official rules](https://phidiaspropfirm.com/rules) |
| **Elite Trader Funding — Diamond Hands** | Yes | Yes | Official product page explicitly advertises holding overnight and weekends. A 100K evaluation listing showed max 20 micros; verify the exact current product and overnight margin charges. | [Official product page](https://elitetraderfunding.com/products/example) |
| **Elite Trader Funding — Direct to Funded (DTF)** | Yes | Yes | Secondary research identifies DTF as exempt from the normal flatten rule alongside Diamond Hands. Obtain written confirmation from ETF for the exact DTF product, MNQ size, overnight margin and weekend terms before treating it as eligible. | [ETF product page](https://elitetraderfunding.com/products/example); [ETF account explanation](https://elitetraderfunding.app/blog/swing-trading-prop-firms-which-allow-overnight-holds-2026) |
| **DayTraders.com — futures accounts** | Yes | Yes | Official help centre says overnight and weekend holding are allowed, but not recommended due to mark-to-market adjustments. No firm-set liquidation time; Rithmic can liquidate at drawdown/daily-loss limits. The trader can set an auto-liquidation time in rTrader Pro, which does not adjust for daylight saving time. Verify account type, MNQ eligibility, payout conditions and automation/API access. | [Official trading-hours and overnight rules](https://daytraders.com/help/articles/17704089-trading-hours-holidays-and-overnight-positions) |
| **The5ers — Futures Swing** | Limited | No | Official FAQ allows up to 1 mini or 10 micro contracts overnight; larger positions must be reduced before the cutoff. No weekend holding. Day Trade plan does not allow overnight holding. | [Official overnight FAQ](https://the5ers.com/futures-faqs/overnight-holding-2/); [official market-hours FAQ](https://the5ers.com/futures-faqs/futures-market-hours/) |

### Practical shortlist

1. **Phidias Premium** is the clearest official-rule match found for both daily overnight and weekend holding on a simulated funded futures account.
2. **DayTraders.com** is another direct match: its own help centre expressly allows both. Investigate its mark-to-market and Rithmic risk behaviour carefully.
3. **Elite Trader Funding Diamond Hands** is a credible candidate because its own product page explicitly advertises overnight and weekend holding. Confirm all margin/fee mechanics and exact MNQ limits in the current account agreement. Treat DTF as unverified until ETF confirms it in writing.
4. **The5ers Futures Swing** is useful for limited overnight exposure, not weekend swing trading. The published cap is 10 micros or 1 mini.

This is a short list of rule-compatible candidates, not a ranking of firm reliability, payout quality or value. Do not choose based on headline buying power.

## Firms checked that do NOT support multi-day futures holding on the cited account rules

| Firm | Published restriction | Evidence |
| --- | --- | --- |
| Lucid Trading | Must be flat by 4:45 PM ET; no holding through market close. | [Lucid official help centre](https://support.lucidtrading.com/) |
| Topstep | All positions closed by 3:10 PM CT each weekday; no swing holding. | [Official trading hours](https://help.topstep.com/en/articles/8284206-when-and-what-products-can-i-trade) |
| Apex Trader Funding | Positions must be closed before 4:59 PM ET. | [Official trading times](https://apextraderfunding.com/help-center/getting-started/futures-trading-times/) |
| FTMO Futures | Positions and resting orders must be closed/cancelled before 4:10 PM ET or the relevant market close, whichever is sooner. | [Official FAQ](https://ftmo.com/en/futures/faq/ftr-can-i-hold-positions-overnight-or-over-the-weekend) |
| Earn2Trade funded accounts | Positions and working orders must be closed between 3:50 PM CT and 5:00 PM CT; no overnight positions. | [Official funded-account rules](https://help.earn2trade.com/en/articles/6877364-what-happens-when-i-complete-my-evaluation) |

**Do not confuse evening-session access with holding across the close.** Topstep, for example, lets traders resume at 5:00 PM CT after requiring them to be flat at 3:10 PM CT.

## What Quint must implement

### 1. Separate strategy intent from account permissions

A bot declares what it wants to do; the account's verified rule profile determines whether it is allowed:

- `DailyFlatRequired`: must exit before the firm's daily cutoff.
- `OvernightAllowed`: may carry through the daily maintenance break.
- `WeekendAllowed`: may carry through Friday's close.
- `MaxOvernightMicros` / `MaxOvernightMinis`: optional reduced size cap.
- `CutoffTime`, timezone, product-specific close, holiday calendar and early-close policy.
- `RestingOrdersMustCancel`: whether stop/target/other working orders must also be cancelled.
- `AutoLiquidationBehaviour`: firm auto-liquidates, broker/Rithmic risk engine liquidates, or trader must flatten.
- Rule source URL, account product, effective date, last verified date and verification status.

Do not apply a firm's rule to all its products. The profile key must include firm + exact plan/product + account stage (evaluation, simulated funded, live).

### 2. Strategy compatibility

- Scalping and intraday bots can run on daily-flat and swing-enabled accounts, subject to other rules.
- Swing bots that require overnight holding are **ineligible** on daily-flat accounts. They may optionally run in a separately declared intraday-only mode only if that mode has independently tested entry/exit rules; never silently truncate a swing trade.
- Weekend-hold strategies are eligible only where the exact account explicitly permits weekend holding.
- A monthly/daily trend signal can be used for context on a day-trading account, but the bot must be labelled intraday execution, not genuine multi-day holding.

### 3. Risk and execution safeguards

- Before entry, calculate position size from stop distance, MNQ tick/point value, fees, conservative slippage and a gap allowance.
- For overnight/weekend holds, apply stricter configurable exposure limits and reduce size where required by the firm's rules.
- Do not assume a stop guarantees its trigger price. Model gap-through-stop losses, thin reopen liquidity, spread expansion, mark-to-market adjustments and possible liquidation.
- Confirm broker-held protective orders and reconcile actual position/order state after disconnects, restarts and market reopen.
- If protection cannot be confirmed or account state is uncertain, block new entries and enter the defined safe response.
- The firm rule engine must not rely on an LLM or network access at the moment of execution.
- Holiday/early-close schedules and US daylight-saving changes must be handled from exchange/session data, not a hard-coded UK clock offset.

### 4. User experience

Each account card should show:
- Exact firm, plan, stage and rule verification date.
- Overnight and weekend permissions separately.
- Mandatory flat deadline and timezone.
- Maximum permitted overnight size, if any.
- Strategy compatibility: eligible / ineligible / requires smaller size.
- Source links and warnings.

Before enabling a swing bot, show the user the account rule and require explicit confirmation. If rules are stale or unverified, disable overnight/weekend automation by default.

### 5. Research and due diligence before recommending a firm

For each candidate, verify directly from the current official agreement/help centre:
- MNQ is an approved contract on that exact plan.
- Overnight and weekend holding apply to the purchased account stage, not just the evaluation or marketing page.
- Position caps, reduced overnight size and margin/mark-to-market adjustments.
- Stop/target order behaviour through market close and weekend.
- Drawdown calculation while the market is closed and on reopen.
- Daily loss limits, news restrictions, consistency rules and payout eligibility.
- Tradovate/Rithmic/NinjaTrader connectivity, API/automation and copier rules.
- Whether the firm can change simulated-to-live status or impose additional live risk limits.

No purchase recommendation until these checks are complete and the user's jurisdiction, platform and account type are confirmed.

## Sources and research notes

Official firm sources are prioritised. Secondary comparisons were used only to identify candidates and cross-check account names, not as the sole basis for a rule claim.

- Phidias official rules: https://phidiaspropfirm.com/rules
- Elite Trader Funding product page: https://elitetraderfunding.com/products/example
- DayTraders official help: https://daytraders.com/help/articles/17704089-trading-hours-holidays-and-overnight-positions
- The5ers official futures FAQ: https://the5ers.com/futures-faqs/overnight-holding-2/
- The5ers official futures hours: https://the5ers.com/futures-faqs/futures-market-hours/
- Lucid official support: https://support.lucidtrading.com/
- Topstep official rules: https://help.topstep.com/en/articles/8284206-when-and-what-products-can-i-trade
- Apex official rules: https://apextraderfunding.com/help-center/getting-started/futures-trading-times/
- FTMO Futures official FAQ: https://ftmo.com/en/futures/faq/ftr-can-i-hold-positions-overnight-or-over-the-weekend
- Earn2Trade official funded rules: https://help.earn2trade.com/en/articles/6877364-what-happens-when-i-complete-the-evaluation
- Cross-checks: https://www.helloweekends.com/rules/weekend-holding and https://www.pickmyfuturesprop.com/reviews/futures-prop-firms-that-allow-overnight-holding

**Conclusion:** Genuine multi-day futures prop trading exists, but only on a small subset of exact account products. Build Quint to support it through verified account capabilities and robust gap-risk controls; do not design around one firm's rules or market the candidate list as a guarantee of suitability.
