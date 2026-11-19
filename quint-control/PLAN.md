# Quint Control: plan and research

Nov 18, 2026 · @Charlie Austin

## Summary

Build Quint Control as a NinjaTrader add-on that trades and copies across all your prop accounts, steered by a black, futuristic website dashboard. NinjaTrader supplies the live charts, market data, order execution and backtesting, so the bot spends no Claude or TradingView credits while it trades. It costs about $30–$40 a month for a Windows server, or nothing extra on your own Windows PC.

- **Why not a website on its own:** a website can't place NinjaTrader orders, and a NinjaTrader strategy can only trade one account, so copying needs an add-on inside NinjaTrader ([NinjaTrader forum](https://forum.ninjatrader.com/forum/ninjatrader-8/strategy-development/1340402-how-to-access-multiple-accounts-in-strategy)). The website is the screen; the add-on is the engine.
- **Copying:** several Tradovate-based accounts at once (LucidFlex, MyFundedFutures, Tradeify and others). Rithmic-based firms connect one at a time.
- **Credits:** AI is only used by Quint, the pop-up assistant, never in the trading loop.
- **Phone:** optional. Remote Desktop into the server to check on it, and Chart Wizard stays as your practice app.
- **The honest catch:** none of your strategies has proven an edge yet, so simulation is the default for new bots, but you can switch any bot onto your prop account whenever you choose.

Copy-paste prompts for every build phase are in Fable prompts.

## How it fits together

```
 Your Lucid accounts (Tradovate)          Your phone
            |                              |  Telegram alerts, Remote Desktop
            v                              |
 +---------------- NinjaTrader 8 on your Windows computer ----------------+
 |  Live MNQ candles, orders, Strategy Analyzer                            |
 |                                                                         |
 |  Quint Engine (add-on)                                                  |
 |    bots -> Guardian.Check -> OrderRouter -> every switched-on account    |
 |    copier / Manual Copy, kill switches, journal, self-tests             |
 |    local server on 127.0.0.1:8765                                       |
 +-----------------------------------|-------------------------------------+
                                     | WebSocket (protocol.md)
                                     v
 Quint Control website in your browser: Command, Bots, Accounts, Journal,
 Backtests, Brain, Settings, setup wizard, Quint assistant (your Claude API key)
```

The Quint Engine lives inside NinjaTrader and does all the trading. The website is its screen and remote control, and your phone can reach the whole computer through Remote Desktop.

## Lucid Trading: what a bot has to obey

Lucid allows bots and trade copiers on evaluation and funded accounts, but you're responsible for anything your software does wrong ([Lucid help center](https://intercom.help/lucid-trading/en/articles/11404728-other-trading-activities)). Four rules matter most for a bot:

- **No high-frequency trading.** A first offence gets a written warning. Repeat offences remove the HFT profits and close the accounts ([PickMyTrade summary](https://pickmytrade.trade/prop-firm-faq/lucid-trading-faq/)).
- **No microscalping.** Lucid reportedly flags an account when more than 50% of its profit comes from trades lasting 5 seconds or less ([Phidias summary](https://phidiaspropfirm.com/es/?p=17782)). Quint's strategies hold for minutes, so this shouldn't bite, but the bot should log every hold time.
- **No hedging across accounts.** Two of your accounts can't face opposite ways, and that includes correlated pairs such as long NQ on one account and short ES on another ([Phidias](https://phidiaspropfirm.com/?p=17780)). A copier can cause this by accident, so Quint Control must block it.
- **News depends on the plan.** Trading red-folder news is a hard breach on LucidDaily. It's allowed on Flex, Pro and Direct ([Lucid help center](https://intercom.help/lucid-trading/en/articles/11404728-other-trading-activities)).

The 50K plans compare like this. Review sites disagree on some figures, so check your own plan's page before trusting any number:

| Plan (50K) | Profit target | Max loss (end-of-day trailing) | Daily loss limit | Consistency rule |
| --- | --- | --- | --- | --- |
| [LucidFlex](https://proptradingvibes.com/blog/lucid-trading-lucidflex-account) | $3,000 | $2,000 | None | 50% in the evaluation, none once funded |
| [LucidPro](https://pipback.com/blog/lucid-trading-review) | $3,000 | $2,000 | $1,200 (pauses trading until the next session) | None in the evaluation, 35–40% once funded |
| [LucidDirect](https://www.luxalgo.com/prop-firms/lucid-trading/) | No evaluation | $2,000 | $1,200 soft breach | 20% on every payout |

A 50K account allows up to 4 minis or 40 micros ([daytradingz](https://daytradingz.com/lucid-trading-review/)), and you can hold up to 5 funded accounts ([QuantCrawler](https://quantcrawler.com/learn/lucid-trading-review)). A VPS is allowed but a VPN isn't ([SaveOnPropFirms](https://saveonpropfirms.com/prop-firms/lucid-trading/rules)).

**Your plan, LucidDaily:** the max loss is $2,000 on a 50K account, the same as Flex and Pro ([LuxAlgo](https://www.luxalgo.com/prop-firms/lucid-trading/)). Its funded drawdown reportedly trails during the day rather than only at the close ([PropTradingVibes](https://proptradingvibes.com/blog/lucid-trading-lucidmaxx)), so the guardian measures room from the day's highest balance, open trades included. Red-folder news is a hard breach, and an account with a news violation can't take on-demand payouts for 30 days ([Lucid help center](https://intercom.help/lucid-trading/en/articles/11404728-other-trading-activities)). Check your plan page for the exact figures.

**Checked on Lucid's own help center (18 Nov 2026), 50K LucidDaily:**
- **Profit target** $3,000 and **max loss** $2,000. The max loss trails until the balance reaches $52,100, then locks at $50,100 ([drawdown](https://support.lucidtrading.com/en/articles/15998425-luciddaily-drawdown)).
- **Size** up to 4 minis or 40 micros, in the evaluation and once funded ([evaluation](https://support.lucidtrading.com/en/articles/15996664-luciddaily-evaluation)).
- **Drawdown type** is chosen at checkout for the evaluation: end of day or intraday. Funded accounts use intraday as standard, and can only be end of day if the evaluation was ([customization](https://support.lucidtrading.com/en/articles/16033858-luciddaily-customization)).
- **Daily loss limit** is your choice at checkout. If it's on, it's a fixed $1,200 that doesn't trail. Hitting it is a soft breach: no more trades until the next session ([daily loss limit](https://support.lucidtrading.com/en/articles/16085900-luciddaily-daily-loss-limit)).
- **Consistency** applies only in the evaluation: your best day divided by your total profit. 40% is standard, with 50% and 30% add-ons. Lucid's evaluation page still says 50%, so check your own account ([consistency](https://support.lucidtrading.com/en/articles/15998336-luciddaily-consistency)).
- **News:** on a funded account, trading a high-impact USD release is a hard breach, so the account is lost. You must be flat from 1 minute before to 1 minute after ([funded account](https://support.lucidtrading.com/en/articles/15997244-luciddaily-funded-account)). Quint stays flat for 2 minutes either side, and does the same in evaluations.
- **Accounts:** up to 5 funded and 10 evaluation accounts per household, with no more than 10 in total ([maximum number of accounts](https://support.lucidtrading.com/en/articles/11404617)).

**What you can trade:** 36 CME Group contracts ([Lucid's approved products](https://support.lucidtrading.com/en/articles/11508978-approved-products-and-commissions)):

- **Stock indexes:** ES, MES, NQ, MNQ, RTY, M2K, YM, MYM, NKD
- **Energy:** CL, MCL, QM, NG, QG
- **Metals:** GC, MGC, SI, SIL, HG, PL
- **Full-size currencies:** 6A, 6B, 6C, 6E, 6J, 6S, 6N
- **Farm:** ZC, ZS, ZL, ZM, ZW, HE, LE

There's no crypto, no Treasuries and no micro currencies. Micros cost $0.50 a side in commission (MGC $0.80, SIL $1.60). Quint Control uses Lucid's real $0.50 a side for MNQ. The repo's earlier backtests used $0.75, so their results were slightly cautious.

For a bot, the best Lucid markets are MNQ and MES (same strategies, very liquid, cheap), then MGC and MCL as second markets that don't move with the Nasdaq. Holding MNQ and MES in the same direction is fine, but the copier must never hold them in opposite directions across accounts.

## Copy trading inside NinjaTrader

The Quint Engine add-on makes each trade decision once, then places it on every account you've switched on, sized for each account. NinjaTrader allows this: an add-on can subscribe to any connected account and send it orders with `Account.CreateOrder` and `Account.Submit` ([NinjaTrader forum](https://forum.ninjatrader.com/forum/ninjatrader-8/strategy-development/1340402-how-to-access-multiple-accounts-in-strategy)).

How many accounts can trade at once depends on the firm's connection ([CrossTrade connection guide](https://docs.crosstrade.io/getting-started/prop-firm-connection-guide)):

| Connection in NinjaTrader | Firms (examples) | At the same time | Notes |
| --- | --- | --- | --- |
| Tradovate (the "NinjaTrader" connection) | LucidFlex, MyFundedFutures, Tradeify, TradeDay | Several connections at once | No licence key needed on NinjaTrader 8.1+ for most prop firms |
| Rithmic | LucidBlack, Bulenox, Earn2Trade | Only one Rithmic connection | Switching firm means disconnect, close NinjaTrader, reopen, connect |

So the best setup for copying is several Tradovate-based accounts, which suits LucidFlex well. CrossTrade's guide notes that LucidBlack connects through Rithmic while LucidFlex uses Tradovate's connection.

**Rules the copier must follow:**

- **Turn on NinjaTrader's multi-provider mode** (Tools → Options → General) so prop accounts connect side by side.
- **One decision, separate orders.** Every account gets its own entry, stop and targets, checked against that account's guardian rules first, so one account's problem can't spread to the others.
- **Never opposite directions across accounts**, including correlated pairs such as MNQ and MES. Lucid and Tradeify ban hedging across accounts.
- **Check positions before every order.** If an account's real position differs from what the engine expects, it stops trading that account and alerts you.
- **Mixing in a personal broker account** alongside prop accounts may need NinjaTrader's Multiple Broker add-on ([NinjaTrader forum](https://forum.ninjatrader.com/forum/ninjatrader-8/platform-technical-support-aa/1069962-multi-broker-license?p=1070070)). Check this when you connect.
- **Fallback:** if the built-in copier isn't ready yet, [CrossTrade Pro](https://crosstrade.io/compare/crosstrade-vs-pickmytrade) ($49 a month) includes a NinjaTrader trade copier.

## Copying your own trades (no bots)

Manual Copy mode lets you trade by hand on one account and have Quint copy every order to your other accounts, with all the bots switched off.

1. **Switch to Manual Copy** on the Command screen. Quint only switches when every bot is off and flat, with no working orders. Bots and Manual Copy never run at the same time, so two decision-makers can't trade the same accounts.
2. **Pick a leader and followers.** The leader is the account you trade on (a LucidDaily account or Sim101). Each follower gets a size: the same as the leader, a multiplier, or a fixed number of contracts.
3. **Trade normally in NinjaTrader** on the leader, using Chart Trader, the DOM or an ATM strategy. Quint copies entries, stops, targets, moves and cancels to every follower, using NinjaTrader's account order updates ([NinjaTrader forum](https://forum.ninjatrader.com/forum/ninjatrader-8/strategy-development/1123047-it-is-possible-to-place-duplicate-orders-for-different-accounts?p=1176096)).
4. **Choose a copy style.** Mirror Orders copies your working limit and stop orders, so followers fill at similar prices. Mirror Fills sends followers in at market the moment the leader fills, which is simpler but can differ by a tick or two.

**Safety in Manual Copy:**

- Every follower order still goes through the guardian. A follower near its limit is shrunk or skipped, and Quint tells you. The leader's trade isn't affected.
- Quint can't stop you placing a trade on the leader, but it warns you and flattens the leader if it breaks a kill switch: the daily loss stop, the room before the max loss, or the LucidDaily news window.
- If a follower misses a copy (a disconnect or a rejected order), Quint flags it and never catches up later at a worse price unless you tap to do so.
- Closing the leader closes every follower, and the position checker makes sure none is left open.
- Followers always face the same direction as the leader, so there's never hedging across accounts.

Turn Manual Copy off once everything is flat to switch the bots back on.

## Strategies: what the research says works

Only two automated strategies have strong, independent evidence of beating costs on Nasdaq futures, and both trade in the direction of the day's move: noise-area momentum and last-30-minute momentum. Build those first. Most popular retail signals fail once costs are counted, so everything else starts in Testing and has to prove itself on your data.

**Add to the bot, in this order:**

| # | Bot | The rule in one line | Evidence | Status |
| --- | --- | --- | --- | --- |
| 1 | **Noise-area momentum** (MNQ) | Go with price when it breaks out of its usual range for that time of day (measured over the last 14 days), with a trailing stop, and close by the end of the session | On SPY from 2007 to 2024: 19.6% a year after costs, Sharpe 1.33 ([Swiss Finance Institute](https://www.sfi.ch/de/publications/n-24-97-beat-the-market-an-effective-intraday-momentum-strategy-for-s-p500-etf-spy)). An independent futures test from 2020 to October 2026 found it dead on the S&P 500 but about 6.8 points a trade after costs on Nasdaq, with every year positive, roughly $19,354 on 1 MNQ ([Algovibes summary](https://sozai.app/transcript/only-day-trading-strategy-couldnt-break/)). Drawdowns can last over a year and a few big days carry it | **Build first** |
| 2 | **Last-30-minute momentum** (MNQ, MES, MGC, MCL) | 30 minutes before each market's close, trade in the direction of its move since the previous close, and exit at the close | Strong intraday momentum in over 60 futures from 1974 to 2020 ([Journal of Financial Economics](https://econpapers.repec.org/RePEc:eee:jfinec:v:142:y:2021:i:1:p:377-403)), with Sharpe ratios of 0.87–1.73 by asset class ([Alpha Architect](https://alphaarchitect.com/hot-topic-does-gamma-hedging-actually-affect-stock-prices/)) | **Build second.** One trade a day per market, and the other markets add variety |
| 3 | **5-pillar playbook** (yours) | Location → sweep → CISD → displacement → pullback entry, 5-minute chart | 3 trades in 4 weeks so far. A study of MNQ found liquidity-grab signals didn't beat costs ([arXiv](https://arxiv.org/abs/2605.04004)), so it has to prove itself | Testing. Fix the pullback rule |
| 4 | **20-candle breakout** | 15-minute chart, stop 2 ATR, target 3× the stop | 185 trades, profit factor 1.27, profit mostly from shorts in a falling market | Testing. Needs a rising market |
| 5 | **New York open breakout** | Break of the first 15 minutes, target 2R | 52 trades, and one day made more than the total | Testing |
| 6 | **5-minute opening range breakout** | Trade the break of the first 5-minute candle | Strong on QQQ in the paper, but a replication on NQ and other indexes made nothing after costs ([MQL5](https://www.mql5.com/en/blogs/post/776235)), and an NQ version for 2025 reported a profit factor of just 1.03 ([TradingView](https://fr.tradingview.com/scripts/search/stop%20loss/page-41)) | Testing. Expect it to be marginal |
| 7 | **VWAP trend** | Long above VWAP, short below, 1-minute chart | An independent rebuild couldn't get near the paper ([QuantConnect forum](https://www.quantconnect.com/forum/discussion/16706/bear-bull-traders-039-paper-on-quot-the-holy-grail-quot-not-so-fast/)) | Testing. Trades often, so check the microscalping rule |
| 8 | **RSI(2) pullback** (daily) | Buy a sharp short dip inside an uptrend, sell on the bounce | Positive over 10 years on the S&P 500 (profit factor 1.43) but only 1.7% a year, well behind buy-and-hold ([Backtrex](https://backtrex.com/en/backtests/connors-rsi-2-sp-500)) | Optional. Holds overnight, so only if your plan allows it |
| 9 | **Gap fade** (MNQ) | When the market opens with a gap from yesterday's close, wait for the first 5-minute candle to turn back, then trade towards yesterday's close, with the stop beyond the day's high or low so far and out by 11:30 New York | An honest walk-forward test on 2 years of MNQ hourly data made +$2,145 over 163 out-of-sample trades, profit factor 1.14, but its worst drawdown was $3,116, more than a LucidDaily 50K's $2,000 max loss, and the author said it failed his own drawdown gate ([DEV Community](https://dev.to/vikihermes/i-backtested-4-mnq-day-trading-strategies-walk-forward-heres-what-actually-survived-and-the-2h12)). A larger study found gap fills on MNQ didn't beat costs ([arXiv](https://econpapers.repec.org/paper/arxpapers/2605.04004.htm)) | Testing, lowest priority. Only goes live if it passes the Approved rule and the 25% Monte Carlo limit |

**Researched and left out:**

| Idea | Why it's out |
| --- | --- |
| Common retail intraday signals on MNQ (gap fills, volume spikes, liquidity grabs, Asia-session momentum, news drift) | Fourteen signal families on 947 days of MNQ 5-minute data: none passed, and their edge before costs was 0.07–1.50 points a trade against 2 points of costs ([arXiv](https://econpapers.repec.org/paper/arxpapers/2605.04004.htm)) |
| EMA pullback and ATR trailing trend | In the same walk-forward test on 2 years of MNQ hourly data they lost $3,884 (profit factor 0.73) and $3,899 (0.49) out of sample ([DEV Community](https://dev.to/vikihermes/i-backtested-4-mnq-day-trading-strategies-walk-forward-heres-what-actually-survived-and-the-2h12)) |
| Donchian breakout (as a separate bot) | The same test made just +$225 on 96 trades (profit factor 1.03, break-even). It's the same idea as the 20-candle breakout (bot 4), which stays in Testing |
| AI price prediction from 5-minute MNQ candles | Gradient boosting and LSTM models were right 50–50.9% of the time, no better than chance ([arXiv](https://arxiv.org/pdf/2605.17724)) |
| Pre-Fed-meeting drift | Essentially disappeared after 2015 ([Kurov, Wolfe & Gilbert](https://www.skidmore.edu/economics/documents/KurovWolfeGilbert-TheDisappearingPre-FOMC-Announce-Drift-200914.pdf)) |
| Turn of the month | Found to disappear in S&P 500 futures after 1990 ([Atlanta Fed](https://fedinprint.org/item/fedawp/13394/original)), and it only trades 12 times a year |
| Overnight drift | Hard to capture after costs, and it means holding overnight in a prop account ([The 7 Circles](https://the7circles.uk/?p=44414)) |
| Long-term trend following | The best evidence of all: trend profits in every one of 58 futures ([AQR](https://www.aqr.com/Insights/Datasets/Time-Series-Momentum-Original-Paper-Data)). But it holds for weeks or months with deep drawdowns, which trailing-drawdown prop accounts punish. A personal-account idea for later |
| Opening range breakout on "stocks in play" | Over 1,600% after costs with a Sharpe of 2.81 on the top 20 stocks from 2016 to 2023 ([Concretum paper](https://alexandria.unisg.ch/handle/20.500.14171/122125)). But it needs a stock broker, not a futures prop firm, so it's a later add-on |
| Commercial bots such as Phantom | Results are seller-provided and not audited |
| Strat v60 (an MNQ scalping bot shown as a [public dashboard](https://milgar7969.github.io/strat-v60-dashboard/), looked at 18 Nov 2026) | Its rules are secret (only trigger codes like LC13), so it can't be built or backtested. The record is 58 days of paper trading, its settings changed 7 times during those days, and $354 of losses were added back. It wins small and loses big (average win $16, average loss $53), so it needs about 76% winners to break even; it had 82%. In its favour: in its last 200 trades only 11% of the winning profit came from trades held 5 seconds or less (Lucid flags over 50%), and its worst day was −$408 |
| Trading-bot videos on YouTube (sent 18 Nov 2026) | The titles and screenshots showed no rules or trade logs to test, and screenshots of profits aren't evidence. Get the rules first, then test them here with Lucid's costs |

**The reality check:** among people in Brazil's equity futures market who day traded for more than 300 days, 97% lost money ([Chague, De-Losso & Giovannetti](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3423101)). That's why every bot starts in Testing, whoever wrote it.

**Research rules for every new bot:** fix the rules before looking at results, report every version tried, use Lucid's real costs, and label anything under 100 trades "too few to judge".

## Running costs, and how it avoids running out of credits

Expect about $30–$40 a month for a Windows server, on top of your Claude plan and any evaluation fees. Nothing in the trading loop spends Claude or TradingView credits, so it can run all day, every day.

| Item | Per month | Notes |
| --- | --- | --- |
| NinjaTrader 8 | $0 | Free for charts and simulation ([Phantom Trader page](https://itsmikepoarch.com/phantomtrader)), and most prop firm connections need no licence key on 8.1+ ([CrossTrade](https://docs.crosstrade.io/getting-started/prop-firm-connection-guide)) |
| Live market data | $0 extra | Your prop account's connection feeds real-time data into NinjaTrader ([CrossTrade](https://crosstrade.io/blog/open-your-first-ninjatrader-position)) |
| Windows server (VPS) in Chicago | $29.99–$39.99 for entry plans | [QuantVPS](https://quantvps.com/blog/beeks-financial-cloud-review-and-comparison). Keeps the bot running when your computer is off, about 1 millisecond from CME ([NinjaTrader forum](https://forum.ninjatrader.com/forum/ninjatrader-8/platform-technical-support-aa/1171027-recommended-windows-vps-for-ninjatrader-8-for-7-12-month-pivps-cheapwindowsvps?p=1324634)), and reachable from a Mac or phone ([VPSServer](https://www.vpsserver.com/ninjatrader-vps/)) |
| Or your own Windows PC | $0 | It must stay on and online through the session. A Mac needs Parallels to run NinjaTrader |
| Claude Pro | Your current plan | Building with Fable uses it. Move up a plan if the builds hit your limits. Quint's chat uses a separate API key, roughly $1–$11 a month |
| TradingView | Optional | Not needed for live trading. Keep it if you use Chart Wizard |
| Copier | $0 | Built into the engine. CrossTrade Pro ($49) is the fallback |
| Phone alerts | $0 | Telegram bot and Healthchecks.io's free plan. Pushover is an optional $4.99 one-off |

**Why it won't run out of credits:**

1. Live data, charts, orders and backtests all run inside NinjaTrader on your machine, with no daily call limits.
2. The website only talks to the engine on the same machine, so it makes no Claude or TradingView calls.
3. AI is only used by Quint, the pop-up assistant, through your own Claude API key. It's pay-as-you-go, billed separately from your plan, with a monthly limit you set, and trading never waits on it.
4. Most of your Claude usage goes into building it with Fable. Once it's built, running it costs no Claude usage.

## Prop firms the site should support

Quint Control should let you add any futures prop firm, but only switch the bot on where the firm allows unattended bots. A September 2026 check of 21 firms found only four that allow unattended TradingView automation through a hosted relay: Lucid, MyFundedFutures, FundedNext Futures and Tradeify ([PickMyTrade](https://blog.pickmytrade.trade/best-prop-firms-that-allow-automated-trading-on-tradingview.md)). Older reviews disagree on several firms, so each firm's entry in the app needs a "last checked" date and a link to its rules page.

| Firm | Unattended bots | Copying between your own accounts | Platforms | Watch out for |
| --- | --- | --- | --- | --- |
| **Lucid Trading** | Allowed | Allowed | NinjaTrader, TradingView, Tradovate and others | No hedging across accounts, no microscalping. Up to 5 funded accounts |
| **MyFundedFutures** | Allowed (older guides say semi-automated only) | Allowed ([Prop Firm Guide](https://thepropfirmguide.com/prop-firm-rules-comparison/)) | NinjaTrader, Tradovate, Rithmic ([PickMyTrade](https://blog.pickmytrade.trade/every-prop-firm-with-a-public-trading-api-in-2026.md)) | Check the current policy before buying |
| **Tradeify** | Allowed if you wrote the bot yourself | Allowed | Rithmic, Tradovate, NinjaTrader | Bans hedging across accounts ([Escape Pod](https://propfirm-escape-pod.pages.dev/blog/copy-trading-prop-firm-rules-guide)) |
| **FundedNext Futures** | Allowed | Allowed ([PickMyTrade](https://pickmytrade.io/faq/prop-firm-automation)) | Tradovate, Rithmic | HFT and arbitrage rules |
| **Bulenox** | Allowed, no approval needed | Allowed | Rithmic, NinjaTrader | Rithmic accounts need NinjaTrader or a Rithmic copier, not a Tradovate relay |
| **Topstep** | Restricted: through its own TopstepX API (about $29 a month), run locally | Check | TopstepX | Not usable through TradingView relays ([PickMyTrade](https://blog.pickmytrade.trade/every-prop-firm-with-a-public-trading-api-in-2026.md)) |
| **Apex Trader Funding** | Evaluations only. No bots on funded (PA) or live accounts | Allowed for up to 20 of your own PAs, all trading the same direction ([Phidias](https://phidiaspropfirm.com/?p=17798)) | Tradovate, Rithmic | Adding to losing trades fails the account since March 2026 ([PickMyTrade](https://blog.pickmytrade.io/5-prop-firm-automation-rules-before-you-run-a-bot-2026/)) |
| **TradeDay** | Your own bots only, no third-party bots | Check | Tradovate, Rithmic | No Tradovate API access ([GodFunded](https://thegodfunded.com/en/tools/traderspost/)) |
| **Top One Futures** | Allowed | Allowed ([PropTradingVibes](https://proptradingvibes.com/best-prop-firms/copy-trading)) | NinjaTrader, Tradovate | Arbitrage with other firms is banned ([Top One](https://intercom.help/top-one-futures/en/articles/11021584-prohibited-trading-practices)) |
| **Take Profit Trader** | Banned (Sept 2026 check; a May 2026 guide said allowed) | Allowed | Rithmic, Tradovate | Check before buying |
| **Elite Trader Funding** | Banned, or only through approved partners | Allowed | Tradovate, Rithmic | Sources conflict |
| **Alpha Futures** | Banned: no AI, bots or full automation ([SaveOnPropFirms](https://saveonpropfirms.com/lists/prop-firms-that-allow-algo-trading)) | Allowed | Tradovate | Signals are fine if you place every trade yourself |
| **Funded Futures Family** | Banned ([TradersPost](https://blog.traderspost.io/categories/prop-firms/firms?page=5)) | Check | Tradovate | Manual trading only |
| **Blue Guardian Futures** | Banned; semi-automated with you watching is OK ([TradersPost](https://blog.traderspost.io/categories/prop-firms?page=3)) | Check | Tradovate | Manual trading only |

How "add a prop firm" should work in the app:

1. **Pick a firm, plan and size** from a built-in library. It fills in the profit target, max loss, daily loss limit, consistency rule, contract limit, news rule and bot permission.
2. **Every number stays editable**, and the firm entry shows a "last checked" date with a link to the firm's rules page.
3. **Firms that ban bots can still be added** for manual or semi-automated trading. Quint tracks their limits, but the bot switch stays locked.
4. **Copying across different firms is a grey area.** Each firm's policy applies separately ([PropTradingVibes](https://proptradingvibes.com/course/copy-trading-rules)), so the app should warn when one signal goes to several firms at the same moment.

## What Fable builds

Fable builds four parts, all in your Quint repo under a new `quint-control/` folder.

| Part | What it does | Where it runs | Built with |
| --- | --- | --- | --- |
| **Quint Engine** | Runs the strategies on live candles, applies the guardian rules, sends orders to every switched-on account, keeps the journal and serves the website | Inside NinjaTrader 8 on your Windows PC or server | NinjaScript (C#) add-on |
| **Quint strategies** | Each strategy also as a NinjaScript strategy, so NinjaTrader's Strategy Analyzer backtests exactly the rules the engine trades | NinjaTrader | NinjaScript, sharing the engine's rule code |
| **Quint Control website** | The dashboard: accounts, bots, the live brain, journal, backtests and the setup wizard, in the repo's black Obsidian & chrome theme | Your browser, served by the engine at a local address, never on the public internet | One HTML page with a live link to the engine |
| **Quint assistant** (optional) | A pop-up chat helper on every screen, plus a daily journal review that suggests rule changes for you to approve | The engine, with your own Claude API key | Claude |

**Rules for Fable:**

- **Keep the trading logic in plain C# classes** with no NinjaTrader code in them, so it can be tested outside NinjaTrader. Thin NinjaTrader wrappers call it.
- **One set of rules everywhere.** Port the 5-pillar logic from `chart-wizard/src/pillars.js` to C# and prove it gives the same trades as the repo's backtester on the same candles.
- **Charts stay in NinjaTrader.** The strategies draw their entries, stops and targets on NinjaTrader's charts. The website shows the trade, its reason and a button to bring the chart forward where NinjaTrader allows it.
- **Commands need a confirm.** Bot on or off, size changes and Flatten All all ask once before acting, and the website only accepts commands from the same computer.
- **Change the repo rule.** `CLAUDE.md` currently says the apps never place real orders. The first pull request changes it to: only the engine places orders, and every bot needs your confirm before it trades a live account.

## Match Phantom, then beat it

Quint Control matches every feature on [Phantom Trader's page](https://itsmikepoarch.com/phantomtrader), and beats it in three places: an honest live brain, firm-specific rules, and evidence you can check yourself.

| Area | Phantom Trader | Quint Control |
| --- | --- | --- |
| Entries | A volume map and nine entry methods, switchable per market and timeframe | Your 5-pillar playbook plus up to four published strategies, each switched on only after beating its costs in the later half of its backtest |
| Gates before a trade | Trend filter, scoring, market type, trading hours, dollar risk cap, news blackout, a "learning gate" | The same gates, plus each firm's own rules: news by plan, room left before the max loss, consistency rule, no hedging |
| Order flow | Level 2 labels each trade Safe, Caution or Do Not Trade, with seven kill switches | Later phase, if your connection supplies market depth. Kill switches from day one: daily loss, max-loss room, position mismatch, lost connection, news, losing streak and manual |
| The brain | A live graphic its own page calls illustrative, not a reasoning trace ([Phantom datawall](https://license.combatcapital.net/datawall?embed=1)) | Every node is a real event (candles in, a pillar passed, an order sent) that opens the record behind it |
| Trade management | Swing stops, size from dollar risk, four-step target ladder, breakeven, trailing, give-back and time stops | The same set, with each account's size set so a full stop-out stays under a quarter of its room left |
| Shadow journal | Logs rejected trades to test the filters | The same, plus a verdict per filter: saved money or cost money |
| Dashboard | Accounts, open trades, daily profit, best setups, best hours, strategy switches, Flatten All | The same, plus a pass tracker per evaluation (target, consistency, days) |
| Monte Carlo | 2,000 reshuffles after four months of backtest and 30 days live | The same, plus the chance of passing each firm's evaluation before hitting its max loss |
| Copier | One signal to several accounts, sized separately | The same, plus position checks and a block on opposite directions |
| Evidence | Seller-provided results | Your own backtests and journal, with the later-half split, exportable |
| Price | $349.99 a month | No subscription: your server, about $30–$40 a month |
| Copying your own trades | Not mentioned | Manual Copy mode: trade by hand on one account and every follower copies, each checked by the guardian |
| Seeing each trade | Open trades and daily profit on its dashboard | Entry, stop and target drawn on your NinjaTrader chart, a live trade card, phone alerts for every open, move and close, and an alarm if the computer goes offline |

## Longer-horizon bot supervision: mandatory rules

Swing, multi-day and monthly bots must actively supervise every open position from entry until confirmed flat. A trade is never "set and forget".

- **Before entry:** calculate and record the initial stop-loss, target/exit rule, maximum dollar risk, size, maximum holding time, invalidation conditions and account eligibility. Size from stop distance using verified MNQ tick value, fees and conservative slippage/gap allowance.
- **Protection must be confirmed:** place protective stop and target orders with the broker/platform where supported; verify accepted quantity against actual fills, including partial fills. If protection is rejected, missing or cannot be reconciled, block new entries and invoke the pre-defined safe response.
- **Hard risk boundary:** never automatically widen a stop, increase initial maximum risk or add to a losing position. Rule-based stop changes may only reduce risk (such as trailing closer or moving to breakeven after a tested condition). Target extensions require a separately specified and tested rule.
- **Continuous analysis:** monitor fresh data continuously using deterministic calculations, not an LLM on every tick. Reassess on every completed bar at the strategy's declared timeframe and on material events such as volatility/regime shifts, structural breaks, approaching stop/target, news windows, session transitions, stale data or account-rule changes.
- **Multi-timeframe context:** use the strategy's intended daily/weekly structure for slower trades while monitoring lower-timeframe execution and risk. Lower-timeframe noise must not override declared rules.
- **Explain every decision:** log hold, reduce, exit, trail, take-profit or no-change decisions with timestamp, data snapshot, rule/reason and resulting order state. AI can explain or propose scenarios but cannot be the sole risk controller; risk controls must work without an AI/API connection.
- **Overnight/gap risk:** model gaps through stops, partial fills, slippage, closures, margin changes and forced liquidation. A stop trigger is not a guaranteed fill price. Check overnight/weekend, news and drawdown eligibility for each account before entry.
- **Failure handling:** detect stale feeds, disconnects, rejected/cancelled protection, position/order mismatch and restart discrepancies. Alert and execute the pre-defined safe response; never assume an order is working until confirmed.
- **Validation:** test protection and supervision in historical replay, simulation, fault-injection and paper-forward trading before live approval.

## Bot library and selection menu

**Quint is the name of the overall platform/brain and the built-in AI chat assistant only. It is not the name of a trading bot or a generic strategy.** Every trading bot has its own distinct, descriptive name that states what trading method it uses.

The website must have a dedicated **Bots** menu/library. Show every available strategy as a separate selectable item, grouped by holding horizon:
- **Scalping:** VWAP Deviation Fade; Liquidity Sweep, Displacement and Retest; Opening Auction Microstructure; Short-Term Momentum.
- **Intraday:** 5-Minute Opening Range Breakout; 15-Minute Opening Range Breakout; 30-Minute Opening Range Breakout; Overnight Range Breakout; Gap Continuation; Gap Fade; VWAP Reclaim; VWAP Rejection; Trend Pullback; Noise-Area Momentum; Last-30-Minute Momentum; 5-Pillar Liquidity/CISD/Displacement/Pullback.
- **Swing:** Daily Trend-Following; Weekly High/Low Breakout; Multi-Day Trend Pullback.
- **Monthly / Position:** Long-Horizon Trend-Following; Monthly Regime Breakout.

These are separate strategy entries, not promises that every entry is already implemented or profitable. The menu must display an honest status on each item (Idea, Specified, Implemented, Testing, Approved, Rejected), timeframe, market, holding horizon, and whether it supports signal-assisted mode, automated mode, or both. Do not show an unimplemented research hypothesis as a ready-to-run bot. Avoid duplicate entries where two labels are merely parameter variations; if timeframes materially change the rules or test results, show them separately with the exact timeframe in the name.

Selecting a bot opens its own detail/setup page: plain-English explanation, exact entry and exit rules, stop-loss and take-profit method, risk controls, market/timeframe/session, account compatibility (including overnight eligibility), backtest and forward-test evidence, limitations, settings and operating mode. The user can select different bots for different eligible accounts, subject to the one-bot-per-account rule. The menu must never silently substitute one strategy for another.

The **Quint AI** chat box remains a separate assistant available throughout the site. It can explain a selected bot, compare bots and discuss its decisions, but it is not itself a trading bot and must not be presented as one.

## Balanced trade management: protect capital without premature exits

Quint bots must be disciplined, not timid. They must respect hard risk limits while allowing a valid, tested setup enough room and time to play out. Do not make bots exit early simply because price briefly moves against the position, an indicator flickers, or an AI model expresses uncertainty.

### Separate hard safety from normal strategy decisions
- **Hard safety exits** always take priority: protective stop reached, account loss/drawdown limit, invalid position/order state, loss of reliable market data or connection, broker/firm restriction, or another explicitly defined emergency condition.
- **Normal trade management** follows that bot's pre-tested rules. A normal pullback, temporary adverse candle or short-lived volatility spike is not by itself an exit signal unless the strategy specification says it is.
- A safety cap is not a profit-taking signal. Do not use the account's daily loss limit, a conservative risk budget or a generic fear threshold to close a trade that remains valid and is still within its planned risk.
- Never widen the initial stop, exceed the approved risk budget, average down or add exposure unless a separately tested and authorised rule explicitly permits it.

### Give each strategy room to work
- Before entry, define the setup's invalidation level, initial stop, target(s), expected holding horizon, maximum holding time and permitted management actions.
- Use stop placement suited to the strategy and market structure (for example, swing structure or volatility/ATR), not an arbitrary tiny stop that causes routine market noise to close trades.
- Use a declared confirmation rule for reversals or invalidation. Avoid exiting on one unconfirmed lower-timeframe candle when the strategy is based on a higher timeframe.
- Use hysteresis / persistence rules where appropriate: a regime or trend change may need a defined close, threshold or number of bars to confirm. These rules must be fixed and tested, not improvised after entry.
- Do not move a stop to breakeven or trail it too early by default. Each bot must test when trailing or breakeven improves net expectancy versus letting the original trade plan work.
- Partial profit-taking, target ladders, time stops and early exits must each have explicit conditions and separate test evidence. If no exit condition has fired, the default is to hold the position and continue monitoring.
- A strategy's confidence score may control whether a new trade is eligible or how much risk is allocated within strict caps; it must not silently override stops, targets or turn into a vague reason to exit an open trade.

### Measure whether management is too tight or too loose
Backtests must record exit reason and compare baseline exits against alternatives: stop/target, structure invalidation, volatility stop, time stop, trailing activation and partial exits. Report premature-exit rate (where price later reaches the original target before the original stop within the declared evaluation window), missed target movement, average favourable/adverse excursion, average hold time, net expectancy, drawdown and tail loss. Avoid hindsight-based labels and use only data available at the decision time. Evaluate each bot and timeframe separately, walk-forward and on untouched data.

### Decision hierarchy
1. Exchange/broker/firm emergency and account-level hard limits.
2. Confirmed protective stop / predefined maximum-risk boundary.
3. Strategy-specific confirmed invalidation or exit condition.
4. Strategy-specific profit target, trailing or time exit.
5. Otherwise hold, monitor and log the reason for no change.

AI may explain the decision or flag a possible issue, but it cannot invent discretionary exits or loosen hard controls. The strategy must be able to continue managing a valid position deterministically if the AI service is unavailable.

## Bot setup and backtesting

Setting up a bot takes five screens in the website's setup wizard, and no strategy can go live until its backtest and simulation results pass.

**The setup wizard:**

1. **Accounts.** The wizard lists every account NinjaTrader is connected to. You tag each with its firm, plan and size from the firm library, and its rules fill in.
2. **Strategies.** Pick which strategies run. Only Approved strategies can trade live; the rest run on simulation.
3. **Size and limits.** Contracts or dollar risk per account, daily loss stop and profit goal. The defaults come from the firm's rules and the quarter-of-room-left sizing rule.
4. **Sessions and news.** Trading hours shown in UK and New York time, and the news blackout set to match each plan.
5. **Dry run (optional), then arm.** Run a session on a simulation account first to see every trade it would take, or skip straight to arming it on your prop account with one confirm.

**Adding a new bot in code:** every bot is one C# file in `quint-control/strategies/`, made from a template. A bot only writes its signal: sizing, the guardian, the copier, news blackouts and kill switches apply to it automatically.

1. **Copy the template** and fill in three parts: its info (name, markets, timeframe, session, evidence link), its settings (each with a sensible range), and its signal (look at closed candles, then return buy, sell or nothing, with a stop and target). Trailing stops, breakeven and time exits are built-in options.
2. **Compile in NinjaTrader.** The engine finds the new file by itself, and it appears on the Strategies screen as Testing, already backtested on the saved history.
3. **It can't touch a real account** until it passes the Approved gate below.
4. **Or just ask Fable** (or Claude Code): "add a bot that buys when…". Fable writes the file from the template, runs the backtest and opens a pull request with the results. A TradingView Pine strategy can be translated the same way.

```csharp
public class NoiseAreaMomentum : QuintStrategy
{
    public override StrategyInfo Info => new StrategyInfo {
        Name = "Noise-area momentum", Markets = "MNQ",
        Timeframe = "1m", Session = "09:30-16:00 New York",
        Evidence = "https://www.sfi.ch/..." };

    [Setting(Min = 5, Max = 30)] public int LookbackDays { get; set; } = 14;

    public override Signal OnBarClose(BarContext c)
    {
        // Look at c.Bars and c.Session, then return
        // Signal.Buy(stop, target), Signal.Sell(stop, target) or Signal.None.
        return Signal.None;
    }
}
```

**Bots set their own stop loss and take profit.** Every bot decides the stop and target for each trade, and the engine places them the moment the entry goes in.

- A signal without a stop is rejected. Every bot must return a stop and at least one target.
- Built-in exit tools a bot can use: a fixed R target, an ATR-based stop, a structure stop beyond the last swing, a scale-out ladder of up to four targets, breakeven after a set R, trailing stops (by ATR, VWAP or structure), a time stop, and an exit before the session close or news.
- A bot can move its stop and targets while the trade is open, but the guardian only lets a stop move to reduce risk, never further away.
- The guardian sizes each trade from the bot's stop distance, so a wider stop means fewer contracts.
- Stops and targets must be orders held by the broker (Tradovate), not stops simulated inside NinjaTrader, so they keep protecting the trade if your computer or connection drops. Fable must confirm how NinjaTrader sends stop-and-target brackets over the Tradovate connection.

**One bot per account.** Each account runs one bot at a time. Switching on a second bot for an account asks you to turn the first one off. Different accounts can run different bots, and the guardian still blocks opposite positions across accounts.

**Backtesting, from quick to exact:**

- **Quick research:** the repo's backtester runs new ideas on saved MNQ candles in seconds.
- **Exact:** the engine runs the same C# rules over NinjaTrader's own historical candles and shows the results in the website. NinjaTrader's Strategy Analyzer is there for deeper tests.
- **Full rehearsal:** NinjaTrader's playback of past sessions runs the engine, guardian and copier together at speed, so copying is tested before any real order.

Every result shows trades, win rate, profit factor, net dollars, average R, worst drawdown, longest losing streak, worst day, best hours and the Monte Carlo pass chance. Costs use Lucid's real $0.50 a side for MNQ plus one tick of slippage each way.

**A bot is marked Approved** when it beats its costs in the later half of its backtest with at least 100 trades, has no more than a 25% Monte Carlo chance of hitting the max loss before the profit target, and (if you ran it) behaves on simulation as its backtest did. Approved is advice, not a lock.

**Go Live Now: skipping simulation.** Simulation is on by default for new bots, but you can put any bot on your prop account at any time:

- Tap **Go Live Now** on the bot and pick the accounts. A warning screen shows its backtest, its Monte Carlo chance of busting and anything it hasn't been tested on. You confirm by typing the account name.
- An unapproved bot starts at 1 MNQ per account. You can change that size on the same screen.
- Its live trades are tagged in the journal, so its real results build its record.
- **What stays on no matter what:** the guardian's firm rules (room left before the max loss, the daily loss stop, the LucidDaily news blackout, no opposite positions across accounts) and the kill switches. Breaking those fails the account, so they can't be skipped.

## Discord and Telegram trade-alert integrations
### Owner's notification layout decision

- **One shared Discord channel for all bots** is the default and the owner's selected layout. Every alert must identify the bot clearly and include its strategy/horizon label, so messages remain easy to distinguish.
- Do not create a separate Discord channel for each bot by default. Keep per-bot filtering and mute controls in Quint's website settings, while routing enabled bot events into the one shared channel.
- Telegram can also be connected as an optional second destination; the same shared event stream and per-bot preferences apply.


Quint must support linking the website to a private Discord server/channel and/or a Telegram chat. These are notification surfaces for the same event stream shown in the Quint dashboard; they are not separate trading engines. Support both providers so the owner can choose either or both.

### Required trade lifecycle notifications
Send a clearly labelled, timestamped alert for each relevant event:
1. **Setup spotted (not a trade):** bot name, market/contract, direction, timeframe, setup rationale, proposed entry or entry zone, stop-loss, target(s), planned dollar risk/reward, expiry/invalidation and strategy status. Explicitly label this as a signal only; no order has been placed.
2. **Approval requested / approved / declined:** for signal-assisted mode, include a secure link to the relevant Quint website page. Approval must happen in the authenticated Quint website, not by interpreting a casual chat message.
3. **Order submitted / accepted / rejected:** report actual broker order state; distinguish submitted from accepted and filled.
4. **Trade opened / filled:** actual average fill price, filled quantity, protective stop and target order status, account nickname (never expose full account identifiers), and a link to the live trade page.
5. **Trade management:** stop/target changes, partial fills, partial exits, trailing-stop changes and any safety intervention, with old and new values and reason.
6. **Trade closed:** exit reason, average exit price, quantity, gross and net P&L after known commissions/fees, points, R-multiple, holding time, and whether the outcome was win/loss/breakeven. Mark estimates where final fees or fills are not yet confirmed.
7. **Operational warnings:** stale data, broker disconnect/reconnect, unconfirmed protection, order/position mismatch, Guardian block, daily risk limit and bot stopped/paused.

### Website linking and presentation
- Every alert should deep-link to the matching bot, signal, order or trade journal page in Quint after authentication.
- The website should show delivery status and let the owner configure providers, destination, event types, quiet hours and per-bot notification preferences.
- Include a test-message action and clear connection health / last successful delivery.
- Alerts should be concise on mobile, with a detailed trade page for charts, reasoning and full execution history.

### Delivery, security and reliability
- Use authenticated Discord and Telegram integrations with secrets stored locally/server-side in protected configuration; never put tokens, webhook URLs, API keys or account credentials in source control, browser code or alert text.
- Queue events, retry transient delivery failures with bounded backoff, deduplicate by event ID, preserve event order where possible and log delivery outcomes. A notification failure must never affect order management or risk controls.
- Use least-privilege bot permissions and a private destination by default. Do not expose account numbers, personal details or credentials.
- Chat messages are notifications and discussion only. No placing, modifying or cancelling trades from Discord/Telegram in the first release. Any future remote controls require a separate security design, explicit owner authentication, confirmation and one-time authorisation, and must still pass the Guardian and single OrderRouter.
- The dashboard and chat notifications must use the same canonical event records so they cannot report different trade states.

### Implementation stages
1. Build a provider-neutral notification/event service and test it locally with simulated events.
2. Add Discord delivery first (private channel) and a website connection/test flow.
3. Add Telegram delivery using a bot and private chat/group setup.
4. Test duplicate events, retries, invalid tokens, provider outage, restart recovery and event ordering; verify that trading and Guardian operation are unaffected.

## Quint, the built-in assistant

A glowing Quint button sits in the corner of every screen. Tap it and a chat panel slides up where Quint answers questions about trading, your strategies and the website itself, and can highlight the exact button you need.

| Quint knows | Where it comes from | Why it stays up to date |
| --- | --- | --- |
| How every screen, setting and warning works | A help guide in the repo (`quint-control/help/`), one entry per feature | Every pull request that adds or changes a feature must update its entry, and a test fails if a screen has none |
| Your live situation: accounts, room left, open trades, which bots are on, today's journal | The engine, read fresh for each question | Nothing is cached between questions |
| Why the bot did or didn't trade | The live brain and journal | Every decision is logged with its reason |
| Trading: the 5-pillar playbook, each strategy's rules and results, each firm's rules | The strategy library, backtests and firm library | It's the same data the website shows |

**What Quint can do:**

- Explain anything on screen in plain English, and "show me": it highlights the button or opens the right screen.
- Walk anyone new through the setup wizard, one step at a time.
- Answer "why did the bot take (or skip) that trade?" from the brain's record.
- Suggest a change, such as a smaller size on an account near its limit, as a button you confirm.

**What Quint never does:** place, cancel or resize orders, or change settings on its own. Anything that affects trading goes through the website's normal confirm. The current Quint rules carry over: honest confidence, "no trade" is a fine answer, and no promises.

**Cost, without touching your Claude plan:**

- Quint uses your own Claude API key, stored only in the engine on your computer. It's billed per message, separately from your Pro plan, so it never uses up your chat limits.
- Help questions use Claude Haiku 5.5, at $0.10 per million input tokens and $0.50 per million output for prompts up to 100,000 tokens ([Apidog](https://apidog.com/blog/claude-haiku-5-5-pricing/)). Deeper "why" questions use Sonnet 5.5, at $2 and $10 ([Apidog](https://apidog.com/blog/claude-sonnet-5-5-pricing/)).
- The help guide is cached, so each question rereads it cheaply. Haiku 5.5 cache reads cost $0.01 per million tokens ([Developers Digest](https://www.developersdigest.tech/models/claude-haiku-5-5)).
- **Rough estimate:** about a tenth of a cent per help answer on Haiku and about a cent on Sonnet, so 1,000 questions a month comes to roughly $1–$11. Check real costs in the Console after the first week.
- Set a monthly spending limit on the Billing page of the Claude Console ([Claude docs](https://platform.claude.com/docs/en/api/rate-limits)), plus a daily message cap in Quint's settings.
- With no key or no internet, Quint falls back to searching the help guide and running guided tours, so help never stops.

**Look and feel:** the black Obsidian & chrome theme, an orb that glows when something needs your attention, answers that stream in, and optional voice using the speech code already in the repo. The same helper works in the phone view.

## Seeing every trade, and alerts on your phone

You'll see every bot trade three ways: drawn on your NinjaTrader chart, live in the dashboard, and as a message on your phone. Each one shows exactly where the stop and target are.

**On your NinjaTrader chart:** a Quint Trades indicator that you add to your MNQ chart once.

- An arrow and label at the entry: which bot, buy or sell, how many contracts and on how many accounts.
- A red stop line showing the dollars at risk, green lines for each target, and a shaded risk and reward box.
- The lines move when the bot moves its stop, with a label such as "stop to breakeven". An exit marker shows the result in $ and R.
- Optional grey markers where the guardian blocked a trade, with the reason.

**In the dashboard:** a live trade card on the Command screen the moment a bot trades.

- A small live chart with the entry, stop and target lines, the distance to each in points and dollars, profit so far in R, and time in the trade.
- The fill on every account, so you can see that every copy landed.
- A flash, a sound and a Windows notification when a trade opens or closes, plus a button to ask Quint "why this trade?"

**On your phone:** messages from your own Telegram bot. Telegram's Bot API is free, with no per-message charge ([Activepieces](https://www.activepieces.com/blog/telegram-bot-api-rate-limits-file-sizes-errors.md)).

| When | What you get |
| --- | --- |
| Trade opened | Bot, direction, contracts, accounts, entry, stop, target, dollars at risk and room left today |
| Stop or target moved | The new level and why (breakeven or trailing) |
| Part or all of the trade closed | Result in $ and R, for each account and in total |
| Guardian block or kill switch | Which rule fired and what Quint did, sent as high priority |
| Problems | Lost connection, a position mismatch, an error or a missed copy |
| Daily summary | 16:05 New York (21:05 UK): trades, P&L and room left on each account |

- Messages never include passwords or account numbers, only the nicknames you give your accounts. Quiet hours and which alerts you get are settings.
- **If your computer or NinjaTrader goes down**, it can't send a message. So the engine checks in with Healthchecks.io every minute during the session, and if the check-ins stop, Healthchecks.io alerts you. Its free plan has 20 checks and can alert by email, Slack, Telegram or webhook ([QuietPulse](https://dev.to/quietpulse-social/best-free-cron-monitoring-tools-for-developers-in-2026-64b)).
- **Alternatives:** Pushover costs $4.99 once per platform after a 30-day trial ([Pushover](https://pushover.net/licensing)). ntfy is free, but some iPhone users report notifications only appearing while the app is open ([App Store](https://apps.apple.com/gb/app/ntfy/id1625396347)).
- **About Claude:** the bot can't send messages into the Claude app itself. Quint can write each alert in plain English using Haiku (optional), and the dashboard's Quint can explain any trade.

## Build phases for Fable

Fable builds in seven phases, one pull request each, and nothing trades real money before phase 6. Each phase has a test that must pass before the next one starts.

0. **Your setup, before Fable starts.** A Windows PC or Windows server, NinjaTrader 8 installed, multi-provider mode on, your LucidFlex account and NinjaTrader's Sim101 connected, and push access to the Quint repo for Fable.
1. **Engine and website shell.** The add-on loads in NinjaTrader, lists your connected accounts and serves the black dashboard locally with live MNQ price and balances. *Done when* the dashboard shows your accounts updating live.
2. **Copier, guardian and Manual Copy mode, on simulation only.** A test button places 1 MNQ with its stop and target on several simulation accounts. The guardian blocks oversized and opposite-direction orders, and Flatten All closes everything. *Done when* a playback session passes every guardian test.
3. **Strategies in C#.** Build the plug-in strategy format, then the noise-area momentum and last-30-minute momentum bots, then port the 5-pillar playbook, the 20-candle breakout and the New York open breakout, plus NinjaScript versions for Strategy Analyzer. *Done when* the three ported strategies give the same trades as the repo's backtester, and the two momentum bots have full backtests on NinjaTrader's history.
4. **Backtests, Monte Carlo, the firm library, the setup wizard, the chart overlay and phone alerts.** *Done when* you can set up a bot from scratch in under five minutes.
5. **Live brain, journal, shadow journal and the Quint assistant.** *Done when* every brain node opens a real event and the shadow journal shows a verdict per filter, and Quint answers a test set of 30 help questions correctly.
6. **Live, with simulation optional.** Two to four weeks on simulation is recommended, but you can use Go Live Now on your LucidDaily account from day one, starting at 1 MNQ.
7. **Extras, in any order.** The other researched strategies (each tested first), an order-flow gate, voice for Quint and a phone view.

**How you and Fable work together:** NinjaTrader only runs on Windows, so Fable can't run it in the cloud. Fable writes the code and opens a pull request. You copy the files into NinjaTrader's NinjaScript folder (Fable gives the exact paths), press Compile, test, and send back any error messages or screenshots. The trading logic is kept separate from NinjaTrader so Fable can check most of it before you install anything.

## Decisions for you before building

Eight choices are settled and one detail is still open. Fable can start now.

**Decided on 18 November 2026:**

| Decision | Your answer | What it changes |
| --- | --- | --- |
| Computer | Windows | NinjaTrader runs natively, no Parallels needed |
| Prop firm plan | LucidDaily | The news blackout is locked on for these accounts, because red-folder news is a hard breach on LucidDaily. The guardian also tracks the drawdown during the day (see the Lucid section) |
| Quint's AI | Your own Claude API key | Quint's chat and reviews run pay-as-you-go, with a monthly limit you set |
| Monte Carlo limit | 25% | A bot with more than a 25% chance of hitting the max loss before the profit target shows red |
| Simulation | Optional | You can put any bot on your prop account straight away using Go Live Now (see Bot setup) |
| Repo rule | The engine may place orders | The first pull request updates `CLAUDE.md` |
| Commission | $0.50 a side for MNQ | Backtests and the journal use Lucid's real cost, plus one tick of slippage each way |
| Connection | Tradovate, through NinjaTrader | Several LucidDaily accounts can trade and copy at the same time |

**Still open:**

- [ ] **How many LucidDaily accounts, and what size?** The bot works with one; tell Fable as you add more.

One rule isn't a choice: the bot only trades accounts in your own name. Firms ban running the same trades on other people's accounts.

## Sources

The firm rules and prices above come from the firms' own pages where possible, and otherwise from review sites. Rules change often, so check each firm's page before buying anything.

- [Lucid Trading: Other Trading Activities](https://intercom.help/lucid-trading/en/articles/11404728-other-trading-activities) (bots, copiers, news by plan)
- [Lucid Trading: Approved Products and Commissions](https://support.lucidtrading.com/en/articles/11508978-approved-products-and-commissions)
- [Phantom Trader AI sales page](https://itsmikepoarch.com/phantomtrader) and [its brain wall](https://license.combatcapital.net/datawall?embed=1) (the product to match and beat)
- [NinjaTrader forum: trading several accounts needs an add-on](https://forum.ninjatrader.com/forum/ninjatrader-8/strategy-development/1340402-how-to-access-multiple-accounts-in-strategy) and [NinjaTrader's Account class](https://ninjatrader.com/fr/support/helpGuides/nt8/account_class.htm)
- [CrossTrade: prop firm connections in NinjaTrader](https://docs.crosstrade.io/getting-started/prop-firm-connection-guide) (multi-provider mode, Rithmic and Tradovate limits, LucidFlex and LucidBlack)
- [NinjaTrader forum: Multiple Broker licence](https://forum.ninjatrader.com/forum/ninjatrader-8/platform-technical-support-aa/1069962-multi-broker-license?p=1070070)
- [QuantVPS: trading server prices](https://quantvps.com/blog/beeks-financial-cloud-review-and-comparison)
- [CrossTrade vs PickMyTrade](https://crosstrade.io/compare/crosstrade-vs-pickmytrade) (the fallback copier)
- [PickMyTrade: firms that allow unattended automation (Sept 2026)](https://blog.pickmytrade.trade/best-prop-firms-that-allow-automated-trading-on-tradingview.md)
- [Zarattini & Aziz, Can Day Trading Really Be Profitable?](https://papers.ssrn.com/abstract=4416622) and [a replication with costs](https://www.mql5.com/en/blogs/post/776235)
- [Zarattini, Aziz & Barbon, Beat the Market](https://www.sfi.ch/de/publications/n-24-97-beat-the-market-an-effective-intraday-momentum-strategy-for-s-p500-etf-spy)
- [Zarattini & Aziz, VWAP: The Holy Grail for Day Trading Systems](https://concretumgroup.com/volume-weighted-average-price-vwap-the-holy-grail-for-day-trading-systems/)
- [Gao, Han, Li & Zhou, Market Intraday Momentum (Journal of Financial Economics, 2018)](https://econpapers.repec.org/RePEc:eee:jfinec:v:129:y:2018:i:2:p:394-414)
- Your own backtests: `backtest/results/REPORT.md` on the `backtest-results` branch of your Quint repo, plus the 2R test run in this chat

* [Claude API rate limits and spend limits](https://platform.claude.com/docs/en/api/rate-limits)
* [Claude Haiku 5.5 pricing](https://apidog.com/blog/claude-haiku-5-5-pricing/) and [Claude Sonnet 5.5 pricing](https://apidog.com/blog/claude-sonnet-5-5-pricing/)

This plan is for learning and practice. It isn't financial advice, and past results don't predict future ones.


## Competitor research: TradersPost

Research date: 19 November 2026. Source basis: TradersPost public website and official documentation. This is a product/workflow study, not access to its private source code or internal infrastructure.

### What TradersPost publicly documents

TradersPost describes itself as a cloud-based, no-code, event-driven signal-to-execution platform. Its public workflow separates:
1. Broker connections (connected live, paper or prop accounts).
2. Strategies (asset class, trading style, allowed tickers, security controls, defaults and a unique webhook).
3. Subscriptions (one or more broker accounts attached to a strategy, each with account-specific settings and auto-submit preferences).
4. Incoming JSON signals from TradingView, TrendSpider, custom code, AI workflows or its Command Pad.
5. Broker order submission and a signal/trade history showing per-subscription outcomes, fills, broker responses and rejection reasons.

Official sources:
- https://traderspost.io/
- https://docs.traderspost.io/docs
- https://docs.traderspost.io/docs/core-concepts/strategies
- https://docs.traderspost.io/docs/core-concepts/subscriptions
- https://docs.traderspost.io/docs/core-concepts/signals
- https://docs.traderspost.io/docs/core-concepts/webhooks
- https://docs.traderspost.io/docs/learn/platform-concepts/position-sizing
- https://traderspost.io/pricing

### Publicly documented capabilities worth studying

- Strategy/subscription separation: one strategy signal can be routed to multiple account subscriptions; each subscription can inherit defaults or override its own sizing and execution settings.
- New subscriptions start disabled and must be reviewed and explicitly enabled.
- Paper and live subscriptions can run in parallel.
- Signal payloads can describe ticker, action, quantity, order type, entry/limit information, stop loss and take profit.
- Documented actions include buy, sell, add, exit, cancel, reverse, breakeven and resize; partial exits and trailing stops are documented.
- Position sizing options include fixed quantity, amount per position, dollar risk per position and risk as a percentage of equity. Their documentation says the platform does not itself verify buying power; broker acceptance/rejection is relied upon.
- Signal freshness controls include timestamp/age rejection and expiry-related fields.
- Signal history shows incoming signal timestamps, per-subscription success/problem counts, and drill-down into trades, fills, broker responses and rejection reasons.
- Public marketing also describes manual approval, automatic submission, parallel account execution, swing-trade stop/target/trailing-stop management and strategy templates.

### Important limitation / opportunity for Quint

TradersPost's Getting Started documentation explicitly warns that it does not currently provide broker/exchange order IDs, position state or account-level information back into external strategy logic as a feedback loop. It describes its role as signal routing and execution, and says users remain responsible for external strategy state and active monitoring. It also warns about conflicting overlapping signals/race conditions and says it is not a set-and-forget self-healing system.

Do not assume this describes every internal capability or every product update; it is the limitation stated in the public documentation reviewed on this date.

Quint should preserve the useful separation of signal source, strategy, account configuration and execution, but aim for a tighter integrated feedback loop through NinjaTrader account/order/position events. Quint's engine should reconcile expected state against actual broker state, identify partial fills/rejections/mismatches, and block unsafe new entries until resolved. This is a design objective, not yet an implemented capability.

### Quint features to adopt or improve

1. **Bot definition vs account assignment:** keep a bot's tested strategy rules independent of per-account settings. A bot can be assigned to eligible accounts, with each account's own contract size, risk cap and firm rules.
2. **Explicit enable workflow:** new bot/account assignments start disabled. Require review of account, mode, size, firm compatibility and risk before enabling.
3. **One canonical signal event:** create a typed, versioned signal object with bot ID/version, instrument/contract, direction, setup timestamp, expiry, entry type/price, stop, target ladder, quantity or risk method, rationale, invalidation and correlation/idempotency ID.
4. **Per-account execution outcomes:** show accepted, rejected, partially filled, filled, cancelled and error states separately for every account; expose broker rejection reason and actual fills.
5. **Freshness and duplicate protection:** reject expired signals, deduplicate repeated events, define ordering for competing signals and prevent stale/overlapping entries.
6. **Standard position sizing:** calculate futures size from permitted dollar risk divided by stop distance times contract point value, then include commissions, slippage and gap allowance; cap by account and firm limits. Never rely on broker rejection as the risk control.
7. **Paper/live parallelism:** support safe parallel shadow/paper execution and comparisons, but never allow paper results to be mistaken for live fills.
8. **Signal-to-trade audit trail:** retain the original signal, Guardian decision, account-specific order request, broker response, every fill/change, protection status, final exit and fees.

### Differences to preserve

TradersPost is publicly positioned as a general multi-asset signal router. Quint's planned advantage is not to clone that product. Quint is intended to own the research, bot logic, backtesting, account-aware risk supervision and execution feedback loop, initially focused on NinjaTrader/MNQ and then other supported markets only when properly tested.

Do not copy proprietary source code, private implementation details, branding or protected assets. Borrow public product patterns and implement Quint's own design.

### Research caveats

- Public docs explain supported workflows and message formats, not TradersPost's private internal architecture.
- Marketing claims such as speed, scale, reliability or user counts are vendor claims, not independently audited evidence.
- A listed feature does not prove it is suitable for a particular Lucid plan, instrument, broker connection or order type. Verify compatibility in simulation and against current official broker/prop-firm rules.
- Revisit official documentation before implementing integrations because features and limitations can change.


## Multi-day futures trading and prop-firm compatibility

Quint strategies are independent of prop-firm holding rules. The account manager enforces the exact firm + plan + account-stage permissions: daily flat deadline, overnight permission, weekend permission, reduced overnight size, resting-order cancellation, holiday/early-close schedule, timezone and auto-liquidation behaviour. Genuine swing/weekend bots are blocked on daily-flat accounts; they must never be silently converted into intraday bots. A longer-timeframe signal may inform an intraday bot, but that is not a multi-day hold.

Support separate account capabilities: `DailyFlatRequired`, `OvernightAllowed`, `WeekendAllowed`, optional overnight size caps, cutoff/timezone, product close, holiday schedule, resting-order policy, auto-liquidation behaviour, source URL, effective date and last-verified status. Profiles are specific to firm + exact product + evaluation/sim-funded/live stage. Stale or unverified profiles default to no overnight/weekend automation.

Overnight/weekend execution requires gap-through-stop and mark-to-market stress assumptions, smaller exposure limits where appropriate, confirmed broker-held protection, reconnect/reopen reconciliation, and no new entries while account/order state is uncertain. Firm rules must be enforced deterministically, never by an LLM.

Research and candidate firms: see [Futures prop firms: overnight and weekend holding](../research/prop-firms/OVERNIGHT-FUTURES.md). As of 19 Nov 2026, candidates with official support for multi-day holding include Phidias Premium, DayTraders.com futures accounts and Elite Trader Funding Diamond Hands; The5ers Futures Swing permits limited overnight holding (up to 10 micros / 1 mini) but not weekends. Verify exact MNQ plan, account stage, size, margin, payouts, platform/API access and current contract before recommending or enabling. Lucid, Topstep, Apex, FTMO Futures and Earn2Trade cited rules require daily flatness.


## Strategy Lab: describe, test and forward-paper-trade bots

**New research/specification:** `research/STRATEGY-LAB.md` (19 Nov 2026). This adds a proposed Strategy Lab inspired by the public TradersPost workflow, but with Quint owning the deterministic strategy engine, testing and broker-state feedback. It is a design note only: no trading code, live execution path or website has been changed.

The user journey is: describe a bot or one-off paper setup in plain English → Quint asks for missing rule details → produce a reviewable, versioned Strategy Definition → validate → historical backtest → optional NinjaTrader Playback → live-market paper forward test → evidence report → explicit promotion review. Manual paper scenarios and reusable bots are separate objects; a one-off idea must not silently become an automated strategy.

The Strategy Lab will have Create, Strategy Card, Test Bench, Live Paper Monitor, Evidence Report, Compare and Promote views. Each strategy has a version and honest status (Idea, Draft, Specified, Validating, Backtesting, Replay, Forward paper, Approved, Rejected or Paused). Evidence is immutable and records the data range/hash, strategy version, costs, fill assumptions, feed freshness, trades, decisions and metrics.

**Critical architecture:** the AI translates/explains only; it is not in the tick-by-tick trading loop. Compile a bounded, allow-listed JSON/DSL definition into the same deterministic strategy core used by historical backtest, Playback, live paper and (only after approval) live execution. Never eval arbitrary AI-generated code. The paper simulator must be isolated from the live OrderRouter at the API/type boundary, with separate accounts, IDs, ledger and unmistakable PAPER/LIVE labels. Stale data stops new paper entries and interrupts the run; no fabricated fills.

Testing must include real costs, bid/ask and slippage assumptions, conservative intrabar handling, contract rolls, session/timezone correctness, walk-forward and untouched out-of-sample data, Monte Carlo drawdown, regime splits, parameter stability, and fault injection. A positive backtest or one profitable paper session is not approval. Strategy edits create a new version and invalidate prior approval. The existing Guardian, firm rules, kill switches and typed live confirmation remain mandatory.

**Research warning:** the 2026 MNQ OHLCV falsification preprint (Mesfin, arXiv:2605.04004) reports that none of 14 common intraday signal families met its complete out-of-sample criteria on 947 five-minute sessions from 2021–2025. This is not proof all variants fail, but it reinforces that ORB, gap, VWAP and liquidity-pattern ideas must be independently reproduced and falsified with Quint's own data before being called profitable. Official NinjaTrader docs confirm Strategy Analyzer supports historical testing and walk-forward optimisation; Playback can replay market data, but Playback101's synchronous processing differs from live network execution. MNQ's contract multiplier is $2/point and minimum tick is 0.25 points ($0.50).

Implementation should be phased after the existing engine foundation: (3A) definition/schema/interpreter and manual paper scenarios; (3B) historical harness and evidence; (3C) isolated live-market paper adapter; (3D) Playback parity/fault tests; (3E) promotion controls. Full details and sources: `research/STRATEGY-LAB.md`.
