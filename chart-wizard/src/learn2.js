/* ================= EVIDENCE LIBRARY: where every lesson's claims come from ================= */
// Each source: what it found (in plain words) and what it should change about how you trade.
const SOURCES = [
  { id: "chague", topic: "The reality", cite: "Chague, De-Losso & Giovannetti (2019/2020), Day Trading for a Living?, FGV/USP working paper", url: "https://papers.ssrn.com/abstract=3423101",
    found: "Among everyone who started day trading Brazilian mini-index futures in 2013–15 and kept going for more than 300 days, 97% lost money and only about 1% earned more than the minimum wage. The authors found no evidence that traders got better with practice.",
    use: "Trading is a skill most people never acquire. Practise here until your Edge check is clearly positive over a large sample before risking real money." },
  { id: "bllo", topic: "The reality", cite: "Barber, Lee, Liu, Odean & Zhang (2020), Learning, Fast or Slow, Review of Asset Pricing Studies 10(1)", url: "https://econpapers.repec.org/RePEc:oup:rasset:v:10:y:2020:i:1:p:61-93.",
    found: "Using every day trade on the Taiwan Stock Exchange (1992–2006), day traders lost money in aggregate, most of the volume came from traders with a history of losses, and the great majority quit.",
    use: "Judge yourself by your numbers, not your best trades. If your Edge check is negative, the answer is better process, not more trades." },
  { id: "esma", topic: "The reality", cite: "ESMA (2018), product intervention on CFDs and binary options", url: "https://www.esma.europa.eu/node/84933",
    found: "Regulators' analysis across EU countries found 74–89% of retail CFD accounts typically lose money, with average losses of €1,600 to €29,000 per client.",
    use: "Leverage magnifies mistakes. Keep risk per trade small (0.25–1%) so a losing streak can't end your account." },
  { id: "odean98", topic: "Psychology", cite: "Odean (1998), Are Investors Reluctant to Realize Their Losses?, Journal of Finance 53(5)", url: "https://doi.org/10.1111/0022-1082.00072",
    found: "In 10,000 brokerage accounts, investors sold winners far more readily than losers (the disposition effect), and the winners they sold went on to beat the losers they kept.",
    use: "This is why the app warns you when you widen a stop: never move it further away. Let winners reach the target; cut losers at the stop." },
  { id: "bo2000", topic: "Psychology", cite: "Barber & Odean (2000), Trading Is Hazardous to Your Wealth, Journal of Finance 55(2)", url: "https://faculty.haas.berkeley.edu/odean/Papers%20current%20versions/Individual_Investor_Performance_Final.pdf",
    found: "Among 66,000 US households, those who traded the most earned the lowest returns after costs, which the authors link to overconfidence. (Later work debates how much is irrational, but the cost drag is not in dispute.)",
    use: "Fewer, better trades. Use Stay out freely and count fees in every plan." },
  { id: "kt79", topic: "Psychology", cite: "Kahneman & Tversky (1979), Prospect Theory, Econometrica 47(2)", url: "https://doi.org/10.2307/1914185",
    found: "People feel losses more strongly than equal gains and take more risk to avoid a sure loss.",
    use: "That's the urge to 'give it room' when a trade goes against you. Decide the stop before you enter and treat it as final." },
  { id: "mop", topic: "What has evidence", cite: "Moskowitz, Ooi & Pedersen (2012), Time Series Momentum, Journal of Financial Economics 104(2)", url: "https://papers.ssrn.com/abstract=2089463",
    found: "Across 58 liquid futures (equity indices, currencies, commodities, bonds), returns over the past 1–12 months tended to persist. Caveat: a later study (Kim, Tse & Wald) attributes much of the effect to volatility scaling and finds it weaker after 2009.",
    use: "Trading with the trend is the best-documented price edge, but it's modest and comes with long flat or losing spells." },
  { id: "aqr", topic: "What has evidence", cite: "Hurst, Ooi & Pedersen, A Century of Evidence on Trend-Following Investing (AQR)", url: "https://www.aqr.com/Insights/Research/Journal-Article/A-Century-of-Evidence-on-Trend-Following-Investing",
    found: "Trend-following was positive on average in every decade tested since 1880, across many markets.",
    use: "Why the Trend breakout strategy is in the library, and why its backtest still shows only ~35% winners: the edge is in large winners, not a high win rate." },
  { id: "osler", topic: "What has evidence", cite: "Osler (2000), Support for Resistance, Federal Reserve Bank of New York Economic Policy Review 6(2)", url: "https://www.newyorkfed.org/medialibrary/media/research/epr/00v06n2/0007osle.pdf",
    found: "Support and resistance levels published by six FX firms predicted where intraday trends would stall better than randomly chosen levels. Follow-up work traced this to clustered stop-loss and take-profit orders, often at round numbers.",
    use: "Levels matter because orders cluster there. Put stops beyond levels, not on them, and expect price to react at round numbers." },
  { id: "myr", topic: "What has little evidence", cite: "Marshall, Young & Rose (2006), Candlestick Technical Trading Strategies: Can They Create Value for Investors?, Journal of Banking & Finance 30(8)", url: "https://econpapers.repec.org/RePEc:eee:jbfina:v:30:y:2006:i:8:p:2303-2323",
    found: "Testing 28 classic candlestick patterns on Dow Jones stocks (1992–2002), the patterns on their own added no value.",
    use: "Treat candle patterns as confirmation at a level in the direction of the trend, never as a signal by themselves." },
  { id: "orb", topic: "Intraday research", cite: "Zarattini, Barbon & Aziz (2023), Can Day Trading Really Be Profitable? (opening-range breakout on QQQ)", url: "https://papers.ssrn.com/abstract=4416622",
    found: "A simple 5-minute opening-range breakout on the Nasdaq-100 ETF was profitable in their 2016–2023 backtest. An independent replication on futures found it roughly break-even after costs.",
    use: "A published edge can vanish after costs and slippage. Always test with fees, as the Strategy library does." },
  { id: "vwap", topic: "Intraday research", cite: "Zarattini & Aziz (2023), VWAP: The Holy Grail for Day Trading Systems (Concretum Group)", url: "https://concretumgroup.com/volume-weighted-average-price-vwap-the-holy-grail-for-day-trading-systems/",
    found: "A trend strategy trading with price above/below VWAP showed strong backtested results on QQQ.",
    use: "Use VWAP as the intraday line in the sand: longs above it, shorts below it." },
  { id: "lmw", topic: "What has evidence", cite: "Lo, Mamaysky & Wang (2000), Foundations of Technical Analysis, Journal of Finance 55(4)", url: "https://doi.org/10.1111/0022-1082.00265",
    found: "A computer objectively detected ten classic chart patterns (head-and-shoulders, double tops and bottoms, triangles and others) in US stocks from 1962 to 1996. Several of them did change the odds of what came next, especially in Nasdaq stocks.",
    use: "Chart patterns are not nonsense, but 'carries some information' is a long way from 'profitable after costs'. Treat a pattern as one piece of evidence and still demand trend, level and a sound stop." },
  { id: "kl", topic: "What has evidence", cite: "Kaminski & Lo (2014), When Do Stop-Loss Rules Stop Losses?, Journal of Financial Markets 18", url: "https://dspace.mit.edu/handle/1721.1/114876",
    found: "If prices were a pure random walk, a stop-loss could only lower average returns. Where markets trend (momentum), stop rules can add return and cut volatility.",
    use: "A stop is risk control, not a source of profit. Its job is to keep one trade from ending your account, which under a prop firm's loss limit is the whole game. Place it where your idea is proven wrong." },
  { id: "bailey", topic: "What has little evidence", cite: "Bailey, Borwein, López de Prado & Zhu (2014), Pseudo-Mathematics and Financial Charlatanism, Notices of the American Mathematical Society 61(5)", url: "https://scholarworks.wmich.edu/math_pubs/40/",
    found: "Try enough variations of a strategy on past data and one will look excellent by luck alone. Sellers rarely say how many versions they tried, and overfitted strategies tend to lose money once traded for real.",
    use: "Be suspicious of any perfect backtest, including your own. Fewer rules, more trades, and results that survive on data the strategy never saw." },
  { id: "gao", topic: "Intraday research", cite: "Gao, Han, Li & Zhou (2018), Market Intraday Momentum, Journal of Financial Economics 129(2)", url: "https://econpapers.repec.org/RePEc:eee:jfinec:v:129:y:2018:i:2:p:394-414",
    found: "In S&P 500 ETF data from 1993 to 2013, the market's move in the first half-hour (measured from the previous close) tended to continue in the last half-hour, more so on volatile, high-volume and news days. The effect is real but small.",
    use: "The open sets the tone and the close often follows it. It's a lean, not a signal: on its own it explains only a sliver of the final half-hour's move." },
  { id: "topstep", topic: "Prop firms", cite: "Topstep (2025), programme statistics in its risk disclosures", url: "https://www.topstep.com/press",
    found: "For 2025 Topstep reports that 16.8% of evaluations started were passed, 51.8% of people passed at least one of their attempts, 33.3% of traders who reached the funded level received a payout, and 0.71% of those in its simulated funded account were moved to a live one.",
    use: "About 5 in 6 evaluations fail, and most funded traders never get paid. Use the Risk lab to see why: the loss limit punishes large size long before a real edge can show." },
  { id: "fpfx", topic: "Prop firms", cite: "Finance Magnates (2024), FPFX Tech data on 300,000 prop accounts", url: "https://www.financemagnates.com/forex/exclusive-only-7-of-300000-prop-trading-accounts-achieved-payouts/",
    found: "Across 10 prop firms (about 100,000 traders), 14% passed a challenge and 7% ever received a payout; the average payout was about 4% of the account size. This is industry data given to a trade publication, not an audited study.",
    use: "Budget for failed attempts and treat fees as a real cost. The app's wallet tracks evaluation fees against payouts for exactly this reason." },
  { id: "pi07", topic: "What has evidence", cite: "Park & Irwin (2007), What Do We Know About the Profitability of Technical Analysis?, Journal of Economic Surveys 21(4)", url: "https://econpapers.repec.org/RePEc:bla:jecsur:v:21:y:2007:i:4:p:786-826",
    found: "A review of the whole research record: chart-based rules made money in futures and currency markets in many studies up to the early 1990s, less clearly in stocks, and most studies had testing flaws such as rules picked after the fact and costs left out.",
    use: "Technical trading isn't nonsense, but published results flatter it. Trust only what survives fees on charts you hadn't seen." },
  { id: "stw", topic: "What has little evidence", cite: "Sullivan, Timmermann & White (1999), Data-Snooping, Technical Trading Rule Performance, and the Bootstrap, Journal of Finance 54(5)", url: "https://doi.org/10.1111/0022-1082.00163",
    found: "Testing thousands of trading rules on 100 years of Dow data with a correction for trying many rules: the best rule held up in the old data, but its edge was gone in the most recent ten years they tested.",
    use: "The more settings you try, the better the best one looks by luck. An edge that worked decades ago may already be traded away." },
  { id: "cs05", topic: "Psychology", cite: "Coval & Shumway (2005), Do Behavioral Biases Affect Prices?, Journal of Finance 60(1)", url: "https://doi.org/10.1111/j.1540-6261.2005.00723.x",
    found: "Professional Chicago bond-futures traders who lost money in the morning took noticeably more risk in the afternoon, and the prices they pushed tended to snap back.",
    use: "Even professionals chase losses. The Edge check's tilt check shows whether you size up after a loss, and what those trades earn." },
  { id: "cme", topic: "Contracts", cite: "CME Group contract specifications (E-mini and Micro E-mini S&P 500, Nasdaq-100, crude oil, gold)", url: "https://www.cmegroup.com/markets/equities/sp/micro-e-mini-sandp-500.contractSpecs.html",
    found: "MES is $5 × the S&P 500 index (0.25 tick = $1.25); ES is $50 × (tick $12.50). MNQ is $2 per point, NQ $20. The app uses these values for every P&L figure.",
    use: "Know your dollars per tick before you trade: it decides how many contracts fit your risk." },
  { id: "ericsson", topic: "How skill is built", cite: "Ericsson, Krampe & Tesch-Römer (1993), The Role of Deliberate Practice in the Acquisition of Expert Performance, Psychological Review 100(3)", url: "https://doi.org/10.1037/0033-295X.100.3.363",
    found: "Expert performance came from years of deliberate practice: focused work on specific weaknesses with immediate feedback, not just time spent doing the activity.",
    use: "The Expert path targets your weakest skill each day and gives instant feedback on every chart. That's deliberate practice." },
  { id: "cepeda", topic: "How skill is built", cite: "Cepeda, Pashler, Vul, Wixted & Rohrer (2006), Distributed Practice in Verbal Recall Tasks, Psychological Bulletin 132(3)", url: "https://pubmed.ncbi.nlm.nih.gov/16719566/",
    found: "A meta-analysis of 317 experiments: spreading practice over time beats cramming, and the best gap grows the longer you want to remember.",
    use: "Short daily sessions beat one long weekend binge. The daily plan brings each skill back just as you're about to forget it." },
];
const SRC = Object.fromEntries(SOURCES.map(s => [s.id, s]));
const srcShort = s => { const y = (s.cite.match(/\((\d{4})/) || [])[1], who = s.cite.split(/[,(]/)[0].trim(); return y ? `${who} (${y})` : who; };
const cite = (...ids) => `<p class="evid">📚 Evidence: ${ids.filter(id => SRC[id]).map(id => `<a href="${SRC[id].url}" target="_blank" rel="noopener">${esc(srcShort(SRC[id]))}</a>`).join(" · ")}</p>`;
function openSources() {
  const topics = [...new Set(SOURCES.map(s => s.topic))];
  openSheet(`${shead("Evidence & sources")}
    <p class="small">Every lesson's key claims trace back to these: peer-reviewed research, central-bank and regulator reports, and exchange specifications. Where the evidence is mixed or disputed, it says so.</p>
    ${topics.map(t => `<h3>${esc(t)}</h3>${SOURCES.filter(s => s.topic === t).map(s => `<details class="srcd"><summary><b>${esc(s.cite)}</b></summary><p><b>What it found.</b> ${esc(s.found)}</p><p><b>What it means for you.</b> ${esc(s.use)}</p><p><a href="${s.url}" target="_blank" rel="noopener">Open the source ↗</a></p></details>`).join("")}`).join("")}
    <div class="row" style="margin-top:12px"><button class="btn pri" id="sdone">Done</button></div>`, s => $("#sdone", s).onclick = closeSheet);
}

/* ================= EXPERT PATH: deliberate, spaced practice with clear milestones ================= */
const SRS_GAPS = [0, 1, 2, 4, 8, 16, 32]; // days until a skill comes back, by box
const dayNo = () => Math.floor(Date.now() / 86400000);
function srsRec(key, ok) { // Leitner boxes: right moves a skill up a box (longer gap); wrong sends it back to box 1
  const S = ST.srs || (ST.srs = {}), s = S[key] || (S[key] = { box: 0, due: dayNo() });
  s.box = ok ? Math.min(SRS_GAPS.length - 1, s.box + 1) : 0; s.due = dayNo() + SRS_GAPS[s.box]; s.last = dayNo(); // a miss comes back later today
}
function srsDue() { // skills due today, weakest first; skills never tried come in gradually
  const S = ST.srs || {}, t = dayNo();
  const tried = DRILLS.filter(([k]) => S[k]).filter(([k]) => S[k].due <= t).sort((a, b) => (drillMastery(a[0]) ?? 0) - (drillMastery(b[0]) ?? 0));
  const fresh = DRILLS.filter(([k]) => !S[k]);
  return tried.concat(fresh.slice(0, Math.max(0, 3 - tried.length)));
}
function todayRec() { const t = ST.today && ST.today.d === dayNo() ? ST.today : (ST.today = { d: dayNo(), drills: 0, rapid: 0, replay: 0, edge: 0 }); return t; }
function todayBump(k) { const t = todayRec(); t[k] = (t[k] || 0) + 1;
  const done = t.drills >= 8 && t.rapid >= 10 && t.replay >= 3;
  if (done && !t.full) { t.full = true; const y = ST.streakDay === dayNo() - 1 ? (ST.streak || 0) + 1 : ST.streakDay === dayNo() ? (ST.streak || 1) : 1; ST.streak = y; ST.streakDay = dayNo(); setTimeout(() => celebrate("Today's training done", `${y}-day streak. Spaced practice like this is how skill sticks.`, "Expert path", "🔥"), 300); }
  try { if (!ST.xpDone) ST.xpDone = STAGES_X.filter(S => stageState(S).ok).map(S => S.k); // existing progress counts without a burst of pop-ups
    const got = ST.xpDone; STAGES_X.forEach((S, i) => { if (!got.includes(S.k) && stageState(S).ok) { got.push(S.k); setTimeout(() => celebrate(`Milestone ${i + 1}: ${S.name}`, i + 1 < STAGES_X.length ? `Next: ${STAGES_X[i + 1].name}. ${STAGES_X[i + 1].why}` : "Every milestone complete. Keep the process; protect the edge.", "Expert path", "🎓"), 900); } }); } catch (e) {}
  save(); }
const EX = { // measured from your own results
  drillsAt: (keys, pct, n) => keys.every(k => { const d = (ST.drills || {})[k]; return d && d.n >= n && d.c / d.n >= pct; }),
  drillProg: (keys, pct, n) => keys.reduce((a, k) => { const d = (ST.drills || {})[k]; return a + (d ? Math.min(1, d.n / n) * Math.min(1, (d.c / Math.max(1, d.n)) / pct) : 0); }, 0) / keys.length,
};
const STAGES_X = [
  { k: "read", ic: "👁", name: "Read the chart", why: "Trend, structure and candles at a glance.", drills: ["trend", "structure", "candles", "ema"], pct: 0.75, n: 10 },
  { k: "levels", ic: "📏", name: "Levels & context", why: "Where orders cluster, and the bigger picture.", drills: ["levels", "tlines", "range", "mtf", "state"], pct: 0.7, n: 10, src: "osler" },
  { k: "risk", ic: "🛡", name: "Risk first", why: "Stops beyond levels, reward bigger than risk, fees counted.", drills: ["stop", "rr", "fees"], pct: 0.8, n: 10, extra: () => { const w = myTrades().slice(0, 20); return { ok: w.length >= 10 && !w.some(t => t.wd), txt: `No widened stops in your last 20 trades (${w.filter(t => t.wd).length} so far)` }; }, src: "odean98" },
  { k: "momentum", ic: "⚡", name: "Momentum & volume", why: "Read pressure behind a move.", drills: ["rsi", "div", "volume", "momo", "vwap", "fvg", "close"], pct: 0.7, n: 8 },
  { k: "process", ic: "🧭", name: "Follow a process", why: "Trade the plan, not the feeling.", extra: () => { const n = ST.procN || 0, g = ST.procG || 0; return { ok: n >= 30 && g / n >= 0.7, prog: Math.min(1, n / 30) * Math.min(1, n ? (g / n) / 0.7 : 0), txt: `Followed the evidence in ${n ? Math.round(g / n * 100) : 0}% of ${n} rounds (need 70% of 30+)` }; } },
  { k: "edge", ic: "📈", name: "Prove an edge", why: "Positive expectancy after fees over a real sample.", extra: () => { const tr = myTrades(); if (tr.length < 15) return { ok: false, prog: tr.length / 60, txt: `${tr.length} of 60 trades logged` }; const E = edgeStats(tr); return { ok: tr.length >= 60 && E.lo > 0, prog: Math.min(1, tr.length / 60) * (E.mean > 0 ? (E.lo > 0 ? 1 : 0.7) : 0.3), txt: `${tr.length} trades · ${(E.mean >= 0 ? "+" : "") + E.mean.toFixed(2)}R a trade (range ${E.lo.toFixed(2)} to ${E.hi.toFixed(2)}; need 60+ trades with the whole range above 0)` }; }, src: "chague" },
  { k: "prop", ic: "🏛", name: "Pass and keep a funded account", why: "Hit the target without breaking the loss limit, then get paid.", src: "topstep", extra: () => { const passed = (ST.accts || []).reduce((a, A) => a + (A.passed || 0), 0), pays = (ST.accts || []).reduce((a, A) => a + (A.payouts || 0), 0); return { ok: passed >= 1 && pays >= 3, prog: Math.min(1, (Math.min(passed, 1) + Math.min(pays, 3)) / 4), txt: `${passed} evaluation${passed === 1 ? "" : "s"} passed · ${pays} of 3 payouts` }; } },
];
function stageState(S) {
  let prog = 1, ok = true, lines = [];
  if (S.drills) { const p = EX.drillProg(S.drills, S.pct, S.n), o = EX.drillsAt(S.drills, S.pct, S.n); prog = p; ok = o; lines.push(`${S.drills.length} skill drills at ${Math.round(S.pct * 100)}%+ over ${S.n}+ charts each`); }
  if (S.extra) { const x = S.extra(); ok = ok && x.ok; prog = S.drills ? (prog + (x.prog != null ? x.prog : x.ok ? 1 : 0)) / 2 : (x.prog != null ? x.prog : x.ok ? 1 : 0); lines.push(x.txt); }
  return { ok, prog: clamp(prog, 0, 1), lines };
}
function openExpert() {
  const T = todayRec(), due = srsDue(), st = STAGES_X.map(stageState), cur = st.findIndex(s => !s.ok), lv = cur < 0 ? STAGES_X.length : cur;
  const tasks = [
    ["drills", "🎯", `Warm-up: 8 skill drills`, due.length ? `Due today: ${due.slice(0, 3).map(d => d[2]).join(", ")}` : "Your weakest skills", 8, "drill"],
    ["rapid", "⚡", "10 rapid-fire trades", "Fast decisions with a stop and target on every trade", 10, "rapid"],
    ["replay", "⏪", "3 trades in Replay", "Real past markets, live, at your own pace", 3, "replay"],
  ];
  openSheet(`${shead("🎓 Expert path")}
    <p class="small">Expertise comes from <b>deliberate practice</b>: short, focused work on your weakest skills with instant feedback, spread over many days rather than crammed. This plan does that, and each milestone is measured from your own results. It can't promise profit; it shows you honestly whether you're getting there.</p>${cite("ericsson", "cepeda")}
    <div class="today"><div class="th"><b>Today's training</b><span>${ST.streak && ST.streakDay >= dayNo() - 1 ? `🔥 ${ST.streak}-day streak` : "Start a streak today"}</span></div>
      ${tasks.map(([k, ic, t, sub, need, go]) => { const n = Math.min(need, T[k] || 0); return `<button class="tdrow ${n >= need ? "done" : ""}" data-go="${go}"><span class="ic">${n >= need ? "✓" : ic}</span><span class="tx"><b>${t}</b><small>${esc(sub)}</small></span><span class="ct">${n}/${need}</span></button>`; }).join("")}
      <button class="tdrow" data-go="edge"><span class="ic">📈</span><span class="tx"><b>Review: Edge check</b><small>Two minutes on what your numbers say</small></span><span class="ct">›</span></button></div>
    <h3>Milestones · ${lv} of ${STAGES_X.length} complete</h3>
    <div class="stages">${STAGES_X.map((S, i) => { const s = st[i], state = s.ok ? "done" : i === lv ? "now" : i > lv ? "later" : "now";
      return `<div class="stg ${state}"><div class="sh"><span class="si">${s.ok ? "✓" : S.ic}</span><span><b>${i + 1}. ${esc(S.name)}</b><small>${esc(S.why)}</small></span><span class="pct">${Math.round(s.prog * 100)}%</span></div><div class="bar"><i style="width:${s.prog * 100}%"></i></div>
        <p class="small" style="margin:4px 0 0">${s.lines.map(esc).join(" · ")}</p>${S.drills && !s.ok ? `<div class="chips" style="margin-top:6px">${S.drills.map(k => { const d = DRILLS.find(x => x[0] === k), m = drillMastery(k); return d ? `<button class="chip" data-drill="${k}">${d[1]} ${esc(d[2])} ${m == null ? "" : Math.round(m * 100) + "%"}</button>` : ""; }).join("")}</div>` : ""}${S.src ? cite(S.src) : ""}</div>`; }).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="btn" id="xsrc">📚 Evidence & sources</button><button class="btn pri" id="xdone">Done</button></div>`, sh => {
    $("#xdone", sh).onclick = closeSheet; $("#xsrc", sh).onclick = openSources;
    $$("[data-go]", sh).forEach(b => b.onclick = () => { const g = b.dataset.go; closeSheet();
      if (g === "drill") { const k = (srsDue()[0] || DRILLS[0])[0]; playMode("drill", { drill: k, warm: true }, "🎯 Warm-up: 8 charts, rotating through the skills due today"); }
      else if (g === "rapid") playMode("rapid"); else if (g === "replay") playMode("replay"); else if (g === "edge") { todayBump("edge"); openEdge(); } });
    $$("[data-drill]", sh).forEach(b => b.onclick = () => { const k = b.dataset.drill; closeSheet(); playMode("drill", { drill: k, warm: false }, `🎯 Drill: ${(DRILLS.find(x => x[0] === k) || [, , k])[2]}`); });
  });
}

/* ================= RISK LAB: why size, win rate and reward decide an evaluation ================= */
function labRun(v) {
  const wr = v.wr / 100, n = 400, w = Math.round(wr * n), rs = Array.from({ length: n }, (_, i) => i < w ? v.rr : -1);
  const m = mcEval(rs, v.risk, 50000, 3000, 600, 30), C = m.C;
  const exp = wr * v.rr - (1 - wr), toFail = Math.max(1, Math.ceil(C.dd / (50000 * v.risk / 100)));
  const streak = wr >= 1 ? 0 : Math.max(1, Math.round(Math.log(100) / Math.log(1 / (1 - wr)))); // longest losing run to expect in ~100 trades
  return { m, exp, toFail, streak, be: 1 / (1 + v.rr) };
}
function labHTML(v) {
  const r = labRun(v), m = r.m, pc = x => Math.round(x * 100) + "%", going = Math.max(0, 1 - m.pass - m.breach);
  const verdict = r.exp <= 0 ? `<b class="neg">No edge.</b> At a ${v.wr}% win rate you need winners bigger than ${(1 / (v.wr / 100) - 1).toFixed(2)}R just to break even. No position size fixes a negative edge; smaller size only makes failing slower.${m.pass >= 0.08 ? ` Notice that ${pc(m.pass)} still pass by luck, which is why passing once proves nothing: the same numbers then lose the funded account.` : ""}`
    : m.pass >= 0.7 ? `<b class="pos">Sound plan.</b> The edge is real and the size gives it room: it takes ${r.toFail} straight losses to fail, and only ${pc(m.breach)} of attempts end that way.`
    : r.toFail <= r.streak && m.breach >= 0.3 ? `<b style="color:#e7b35a">Edge, but sized to fail.</b> ${r.toFail} loss${r.toFail === 1 ? "" : "es"} in a row ends this account, and a run of ${r.streak} is normal at a ${v.wr}% win rate. Lower the risk per trade and watch the pass rate climb.`
    : `<b>Positive edge, thin margin.</b> It works on average, but ${pc(m.breach)} of attempts still hit the loss limit first. Smaller risk or a better reward-to-risk ratio widens the gap.`;
  return `<div class="labgrid"><div><small>Edge per trade</small><b class="${r.exp > 0 ? "pos" : "neg"}">${(r.exp >= 0 ? "+" : "−") + Math.abs(r.exp).toFixed(2)}R</b></div><div><small>Pass the 50K</small><b class="pos">${pc(m.pass)}</b></div><div><small>Hit the loss limit</small><b class="neg">${pc(m.breach)}</b></div>
    <div><small>Losses in a row to fail</small><b>${r.toFail}</b></div><div><small>Streak to expect / 100 trades</small><b>${r.streak}</b></div><div><small>Typical trades to pass</small><b>${m.med || "–"}</b></div></div>
    ${mcPathsSVG(m)}<p class="labv">${verdict}</p>${r.exp > 0 && m.med && m.med <= 3 ? `<p class="small">Passing in ${m.med === 1 ? "a single trade" : m.med + " trades"} is a gamble, not a method. Many firms block it with a consistency rule (no single day may make up most of the profit).</p>` : ""}${going > 0.02 ? `<p class="small">${pc(going)} of attempts were still undecided after 600 trades.</p>` : ""}`;
}
function openRiskLab() {
  const v = ST.lab || (ST.lab = { wr: 45, rr: 2, risk: 1 }), tr = myTrades(), E = tr.length >= 15 ? edgeStats(tr) : null;
  const presets = [["Coin flip, 1:1", 50, 1, 1], ["Trend trader", 38, 2.5, 0.5], ["Scalper", 62, 0.8, 1], ["Good edge, too big", 45, 2, 3]];
  if (E && E.avgL < 0 && E.avgW > 0) presets.unshift(["My numbers", clamp(Math.round(E.wr * 100), 20, 80), clamp(Math.round(E.avgW / -E.avgL * 10) / 10, 0.5, 4), v.risk]);
  const sl = (k, label, min, max, step, fmt) => `<label class="labsl"><span>${label}<b id="lv_${k}">${fmt(v[k])}</b></span><input type="range" id="ls_${k}" min="${min}" max="${max}" step="${step}" value="${v[k]}"></label>`;
  const F = { wr: x => x + "%", rr: x => (+x).toFixed(1) + " : 1", risk: x => (+x).toFixed(2).replace(/0$/, "") + "% ($" + Math.round(500 * x) + ")" };
  openSheet(`${shead("🧪 Risk lab")}
    <p class="small">Set a win rate, how big your winners are compared with your losers, and how much you risk per trade. The lab then runs 3,000 simulated $50K evaluations (target +$3,000, trailing loss limit $2,000) and shows how they end. Fees are not included, so real results are a little worse.</p>
    <div class="chips" style="margin:8px 0">${presets.map((p, i) => `<button class="chip" data-pre="${i}">${esc(p[0])}</button>`).join("")}</div>
    ${sl("wr", "Win rate", 20, 80, 1, F.wr)}${sl("rr", "Reward : risk", 0.5, 4, 0.1, F.rr)}${sl("risk", "Risk per trade", 0.25, 4, 0.25, F.risk)}
    <div id="labout">${labHTML(v)}</div>
    <p class="small">For comparison, Topstep reports that 16.8% of real evaluations started in 2025 were passed.</p>${cite("topstep", "fpfx", "kl")}
    <div class="row" style="margin-top:12px"><button class="btn pri" id="labdone">Done</button></div>`, s => {
    let tm = 0; const redo = () => { clearTimeout(tm); tm = setTimeout(() => { $("#labout", s).innerHTML = labHTML(v); save(); }, 60); };
    for (const k of ["wr", "rr", "risk"]) $("#ls_" + k, s).oninput = e => { v[k] = +e.target.value; $("#lv_" + k, s).textContent = F[k](v[k]); redo(); };
    $$("[data-pre]", s).forEach(b => b.onclick = () => { const p = presets[+b.dataset.pre]; v.wr = p[1]; v.rr = p[2]; v.risk = p[3]; for (const k of ["wr", "rr", "risk"]) { $("#ls_" + k, s).value = v[k]; $("#lv_" + k, s).textContent = F[k](v[k]); } redo(); });
    $("#labdone", s).onclick = closeSheet;
  });
}
