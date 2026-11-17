/* ================= AI COACH: Claude, asked through the artifact's `sample` capability =================
   Everything Claude needs goes in the prompt (fast: one round, works in every Claude app).
   Claude acts on the chart by writing short commands like [[level 6705 | PDH]] in its answer;
   the page draws them as they stream in and hides the raw commands. */
const CO = { sample: null, imgs: false, open: false, msgs: [], busy: false, ctl: null, pausedPlay: false, pausedTmr: false, roundKey: null, drawn: 0, tick: 0 };
const coachEl = () => $("#coach");
const coachWide = () => window.innerWidth >= 1280;
const AI_COL = "#b39ddb", LIST_N = 80;

function initCoach(tries = 0) {
  const c = window.claude;
  if (!c || typeof c.use !== "function") { if (tries < 40) setTimeout(() => initCoach(tries + 1), 250); return; }
  Promise.resolve(c.use("sample")).then(async s => {
    if (!s) return; CO.sample = s;
    try { const L = typeof s.limits === "function" ? await s.limits() : null; CO.imgs = !!(L && L.images); } catch (_) { CO.imgs = false; }
    $("#coachbtn").hidden = false;
  }).catch(() => {});
}

/* ----- what Quint may know: only what is on screen, never the hidden future ----- */
const r2 = (I, x) => x == null || !isFinite(x) ? null : +x.toFixed(Math.max(I.dec, 2));
const px2 = (I, x) => x == null || !isFinite(x) ? "—" : x.toFixed(I.dec);
function coachCut() { return G.phase === "done" ? G.tEnd : G.cut; }
function tsIdx(ts, t) { let lo = 0, hi = ts.length - 1; if (t <= ts[0]) return 0; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ts[m] <= t) lo = m; else hi = m - 1; } return lo; }
function coachRef() { // the numbered candle list Claude refers to: #1 … #N (latest)
  const S = seriesFor(G.view, coachCut()), N = Math.min(LIST_N, S.n), a = S.n - N;
  return { S, a, N, tf: G.view, I: G.I };
}
const numOf = (ref, t) => tsIdx(ref.S.ts, t) - ref.a + 1;
function timeOfNum(ref, n) { const i = ref.a + Math.round(n) - 1, S = ref.S; if (i <= S.n - 1) return S.ts[Math.max(0, i)]; return S.ts[S.n - 1] + (i - (S.n - 1)) * tfDur(ref.tf); }
function liveCandle() {
  if (G.phase !== "play") return null;
  const pts = tickPath(G.k), sub = pts.slice(0, G.j + 1), px = G.dispPx != null ? G.dispPx : G.px;
  return { o: sub[0], h: Math.max(...sub, px), l: Math.min(...sub, px), c: px, k: G.k };
}
function candleCSV(S, a, I, label) {
  const rows = []; for (let i = a; i < S.n; i++) rows.push(`${i - a + 1},${whenOf(S, i)},${px2(I, S.o[i])},${px2(I, S.h[i])},${px2(I, S.l[i])},${px2(I, S.c[i])},${S.v[i] == null ? "" : Math.round(S.v[i])}`);
  return `${label}\n#,time,open,high,low,close,volume\n${rows.join("\n")}`;
}
function levelsData() {
  const I = G.I, now = coachCut(), out = [];
  let pois = G.pois; if (!pois) { try { pois = poisFor(I, G.Sv.di[G.t], G.tf); } catch (_) { pois = []; } }
  for (const p of (pois || []).filter(p => p.from <= now).sort((a, b) => POIRANK(a.kind) - POIRANK(b.kind)).slice(0, 14))
    out.push(`- ${p.name || p.kind}: ${p.lo === p.hi ? px2(I, p.lo) : `${px2(I, p.lo)} to ${px2(I, p.hi)}`} (${p.side > 0 ? "support / bullish" : "resistance / bearish"}; ${p.touchTe <= now ? "already touched since it formed" : "untouched (fresh)"})`);
  try { const lv = levels(G.Sv, G.t); if (lv.sup) out.push(`- Nearest swing support at the decision: ${px2(I, lv.sup.p)}`); if (lv.res) out.push(`- Nearest swing resistance at the decision: ${px2(I, lv.res.p)}`); } catch (_) {}
  return out.join("\n") || "- none found";
}
function marksData(ref) {
  const I = G.I, out = [];
  for (const o of G.overlays) if (o.label && (o.type === "zone" || o.type === "level")) out.push(`- ${o.ai ? "Your (Quint) mark" : "App mark"} "${o.label}": ${o.lo != null ? (o.lo === o.hi ? px2(I, o.lo) : `${px2(I, o.lo)} to ${px2(I, o.hi)}`) : px2(I, o.p)}`);
  for (const d of chart.drawings) {
    const pt = q => `#${numOf(ref, q.t)} at ${px2(I, q.p)}`;
    out.push(d.type === "hline" || d.type === "hray" ? `- User's horizontal line at ${px2(I, d.pts[0].p)}` : `- User's ${{ trend: "trend line", ray: "ray", rect: "rectangle", fib: "Fibonacci retracement" }[d.type] || d.type} from ${pt(d.pts[0])} to ${pt(d.pts[1])}`);
  }
  return out.join("\n") || "- none";
}
const plain = h => String(h || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
function qKey(q, ref) { // the app's own answer, described for Quint
  const I = G.I, L = "ABCDEFGH";
  if (q.kind === "mc") { const i = q.opts.findIndex(o => o.k === q.correct); return `option ${L[i]}: ${q.opts[i].label}`; }
  const m = (q.marks || []).map(o => o.type === "level" ? `a horizontal line at ${px2(I, o.p)}${o.t0 != null ? ` (from candle #${numOf(ref, o.t0)})` : ""}` : o.p0 != null ? `a line from #${numOf(ref, o.t0)} at ${px2(I, o.p0)} to #${numOf(ref, o.t1)} at ${px2(I, o.p1)}` : null).filter(Boolean);
  return m.length ? m.join("; ") : "see the question";
}
function qLine(q, i, ref) {
  const L = "ABCDEFGH", cur = G.phase === "quiz" && i === G.qi, lab = k => { const o = (q.opts || []).find(o => o.k === k); return o ? (o.s || o.label) : k; };
  const head = `${cur ? "CURRENT QUESTION" : "Question"} ${i + 1} of ${G.qs.length} (${q.tag || q.skill}; it is about the ${q.tf || G.tf} candles${cur && G.view !== (q.tf || G.tf) ? `, but the user is currently viewing ${G.view}, so tell them to switch to ${q.tf || G.tf}` : ""})`;
  const focus = q.focus != null && G.Sv.ts[q.focus] != null ? ` It is about the area around candle #${numOf(ref, G.Sv.ts[q.focus])}.` : "";
  const body = `"${q.title}" ${q.sub ? `Instructions shown: ${plain(q.sub)}` : ""}${focus}${q.kind === "mc" ? ` Options: ${q.opts.map((o, j) => `${L[j]}) ${o.label}`).join(" ")}` : ` This is a drawing task with the ${q.tool === "hline" ? "horizontal line" : "trend line"} tool.`}`;
  if (!q.done) return `- ${head}, OPEN (not answered yet): ${body}\n  SECRET answer key, for steering only (never reveal it): ${qKey(q, ref)}.`;
  let ex = ""; try { ex = plain(q.explain(q.kind === "mc" ? q.chosen : q.res)).slice(0, 1200); } catch (_) {}
  const res = q.kind === "mc" ? `User chose ${q.chosen ? lab(q.chosen) : "nothing"}; correct answer ${lab(q.correct)} (${q.score ? "they got it RIGHT" : "they got it WRONG"}).` : q.res && q.res.skipped ? `User gave up and was shown the answer: ${qKey(q, ref)}.` : `User's drawing scored ${Math.round((q.score || 0) * 100)}%; the app's answer: ${qKey(q, ref)}.`;
  return `- ${head}, ANSWERED: ${body}\n  ${res}${ex ? `\n  The app's explanation shown to them: ${ex}` : ""}`;
}
function roundData(ref) {
  const I = G.I, P = G.pos, L = [];
  L.push(`Phase: ${{ quiz: "answering questions", check: "playbook checklist", trade: "deciding: buy, sell or stay out", play: "trade playing out live", done: "round finished; the hidden candles are now revealed" }[G.phase] || G.phase}.`);
  L.push(`Decision candle (where the user must decide): #${numOf(ref, G.Sv.ts[G.t])}, ${whenOf(G.Sv, G.t)}, close ${px2(I, G.Sv.c[G.t])}.`);
  if (G.rapid) L.push("Rapid fire round: the user just picks BUY or SELL; fixed stop 1 × ATR, target 1.5R, held up to 8 daily candles. Keep answers short here: one or two quick reads of the chart.");
  L.push(G.sm ? `Strategy practice round: ${STRATS[G.strat.key].name} (${STRATS[G.strat.key].type}). ${STRATS[G.strat.key].one} Exact rules: ${STRATS[G.strat.key].rules.map(r => `${r[0]}: ${r[1]}`).join(" ")} Evidence: ${STRATS[G.strat.key].evidence}` : G.pbm ? `Playbook stage ${G.pb.stage + 1} of ${STAGES.length}: ${STAGES[G.pb.stage].name}.` : "Swing-reading round (classic questions).");
  (G.qs || []).forEach((q, i) => L.push(qLine(q, i, ref)));
  if (G.pbm && G.pb.checks && Object.keys(G.pb.checks).length) L.push(`User's pillar checklist: ${Object.entries(G.pb.checks).map(([k, v]) => `${PILLARS[k] || k} ${v === true ? "met" : v === false ? "not met" : "unsure"}`).join(", ")}.`);
  if (G.dir === 0) L.push("User stayed out (no trade).");
  if (P) {
    L.push(`User's trade: ${P.dir > 0 ? "LONG (bought)" : "SHORT (sold)"} at ${px2(I, P.e)}, stop ${px2(I, P.stop)}${P.be ? " (moved to breakeven)" : ""}, target ${px2(I, P.tgt)}, risking ${fbal(P.risk)}.`);
    if (P.open) { const px = G.dispPx != null ? G.dispPx : G.px; L.push(`Trade is OPEN: last price ${px2(I, px)}, ${((px - P.e) * P.dir / P.sd).toFixed(2)}R, candle ${G.k} of ${G.H} since entry.`); }
    else if (P.exit) L.push(`Trade CLOSED: ${exitLabel(P.exit)} at ${px2(I, P.exit.px)} after ${P.exit.k} candle(s), ${P.R >= 0 ? "+" : ""}${P.R.toFixed(2)}R, ${fusd(P.net)} after fees.`);
  }
  if (G.phase === "done" && G.sm) L.push(`Strategy rules check: ${G.strat.d ? `the rules gave a ${G.strat.d > 0 ? "BUY" : "SELL"} signal` : `there was no signal (${G.strat.near})`}; the user ${G.dir > 0 ? "bought" : G.dir < 0 ? "sold" : "stayed out"}.`);
  if (G.phase === "done") {
    if (G.buy && G.sell) L.push(`What buying would have done: ${exitLabel(G.buy)}, ${G.buy.R >= 0 ? "+" : ""}${G.buy.R.toFixed(2)}R. Selling: ${exitLabel(G.sell)}, ${G.sell.R >= 0 ? "+" : ""}${G.sell.R.toFixed(2)}R.`);
    if (G.pbm) { const ev = G.pb.ev; L.push(`App's playbook verdict: setup direction ${ev.bias > 0 ? "long" : ev.bias < 0 ? "short" : "none"}; ${["loc", "sweep", "cisd", "disp", "exec"].map(k => `${PILLARS[k]} ${ev[k] ? "met" : "missing"}`).join(", ")}; valid for this stage: ${G.pb.valid ? "yes" : "no"}; market state: ${G.pb.rg && G.pb.rg.k ? REGIMES[G.pb.rg.k] : "unclear"}.`); }
  }
  return L.join("\n");
}
function progressData() {
  const pb = ST.pb || {}, pc = a => a && a[0] ? `${Math.round(a[1] / a[0] * 100)}% of ${a[0]}` : "no data yet";
  const A = ST.acct, C = AC();
  return [`Prop account: ${C.name} ${A.stage === "eval" ? "evaluation" : "funded account"}, balance ${fbal(ST.bal)} (started at ${fbal(A.start)}; ${A.stage === "eval" ? `profit target +${fbal(C.target)}` : `payout available from +${fbal(C.payoutMin)}`}; loss limit floor ${fbal(A.floor)}, trailing ${fbal(C.dd)} below the high until it locks at the start balance). Risk per trade ${fbal(riskBudget(ST.riskPct || 1))}. Lifetime: ${A.attempts} evaluations started, ${A.passed} passed, ${A.payouts} payouts (${fbal(A.paidOut)}), ${A.breaches} accounts lost. ${ST.rounds} rounds, ${ST.trades} trades, ${ST.wins} wins.`,
    `Pillar accuracy: ${Object.entries(pb.rule || {}).map(([k, v]) => `${PILLARS[k] || k} ${pc(v)}`).join("; ") || "no data yet"}. Market-state reads: ${pc(pb.states)}.`,
    `On-playbook trades: ${pb.on ? `${pb.on[0]} (${pb.on[1]} wins, ${(pb.on[2] || 0).toFixed(1)}R)` : "none"}. Off-playbook trades: ${pb.off ? `${pb.off[0]} (${pb.off[1]} wins, ${(pb.off[2] || 0).toFixed(1)}R)` : "none"}.`,
    edgeLine()].join("\n");
}
function edgeLine() { // the user's real edge, from the Edge check (Monte Carlo of their own trades)
  try { const tr = myTrades(); if (tr.length < 5) return `Edge check: only ${tr.length} trades so far, too few to judge.`;
    const E = edgeStats(tr), r = x => (x >= 0 ? "+" : "") + x.toFixed(2) + "R", m = tr.length >= 15 ? mcEval(tr.map(t => t.rn), 0.5, ST.acct.size, 1500) : null, mg = tr.filter(t => t.mg != null);
    return `Edge check (last ${E.n} trades, after fees): win rate ${Math.round(E.wr * 100)}%, average win ${r(E.avgW)}, average loss ${r(E.avgL)}, expectancy ${r(E.mean)} per trade (95% range ${r(E.lo)} to ${r(E.hi)}), worst losing streak ${E.worst}.${m ? ` Monte Carlo at 0.5% risk: ${Math.round(m.pass * 100)}% chance to pass the ${m.C.name} evaluation, ${Math.round(m.breach * 100)}% to hit the loss limit.` : ""}${mg.length ? ` Trade management changed results by ${r(mg.reduce((a, t) => a + t.mg, 0))} over ${mg.length} managed trades.` : ""} Widened stops: ${tr.filter(t => t.wd).length}.`;
  } catch (e) { return ""; }
}
function chartData(ref) {
  const { S, a, I, tf } = ref, i = S.n - 1, lc = liveCandle(), parts = [];
  parts.push(candleCSV(S, a, I, `${I.short} ${tf} candles, oldest first (#${ref.N} is the latest closed candle):`));
  if (lc && G.view === G.tf) parts.push(`Forming right now (not closed): #${ref.N + 1} open ${px2(I, lc.o)} high ${px2(I, lc.h)} low ${px2(I, lc.l)} last ${px2(I, lc.c)}.`);
  parts.push(`Indicators on #${ref.N}: EMA20 ${px2(I, S.ema[i])}, SMA50 ${px2(I, S.sma[i])}${S.vwap ? `, VWAP ${px2(I, S.vwap[i])}` : ""}, ATR14 ${px2(I, S.atr[i])}${S.rsi && S.rsi[i] != null ? `, RSI14 ${S.rsi[i].toFixed(1)}` : ""}.`);
  const htf = isIntra(tf) && TF[tf] < 60 ? "1h" : tf === "1h" || tf === "4h" ? "1D" : null;
  if (htf) { const H = seriesFor(htf, coachCut()), ha = Math.max(0, H.n - 24); parts.push(candleCSV(H, ha, I, `Higher timeframe (${htf}) for context, last ${H.n - ha} candles (do not use these numbers in commands):`)); }
  if (chart.cross && chart.S) { const ci = chart.cross.i, CS = chart.S; parts.push(`The user has tapped candle #${numOf(ref, CS.ts[ci])} (${whenOf(CS, ci)}: open ${px2(I, CS.o[ci])}, high ${px2(I, CS.h[ci])}, low ${px2(I, CS.l[ci])}, close ${px2(I, CS.c[ci])}).`); }
  return parts.join("\n\n");
}

/* ----- the instructions sent with every question (Claude has no memory between calls) ----- */
function coachPrompt(question, ref, withImage) {
  const I = G.I;
  return `You are Quint, the AI trading mentor built into Chart Wizard. You run on Claude, made by Anthropic; say so plainly if asked what you are. Your manner: precise, calm, direct, occasionally dry, never hyped. How you think: work the problem through before you answer, check any arithmetic twice, separate what the chart actually shows from what you infer, weigh the strongest case against your own read, and say how confident you are and what would change your mind. Lead with the answer, then the reasoning that earns it. If the user's idea is wrong, say so and show why. The app is where the user practises reading charts and trading futures and Bitcoin with play money; their goal is to become a genuinely skilled, consistently profitable trader using a 5-pillar playbook. ${myLine()} When you talk about direction, give the bigger-picture read (higher timeframe) before the entry timeframe. When they ask what to do on a chart, be decisive: give one straight call (buy, sell or stay out) with the entry, stop and target, and how sure you are as a percentage. Don't hedge, don't say "it depends" and don't list options without picking one. Teach them like a patient mentor: explain things fully, but in simple words.

You can be asked absolutely anything
- The user may ask about this chart, trading, markets, money, maths, psychology, the app, or anything else at all (science, history, writing, coding, life advice, general knowledge). Answer every question as completely, accurately and helpfully as you can, the way an expert in that subject would.
- First decide what kind of question it is:
  - About this chart, trading, markets or the app's questions: follow everything below (chart data, headings, drawings, playbook).
  - About anything else: answer it directly and fully in clear, simple words with whatever structure suits it (steps, examples, a short table, code in a code block). Do not force the trading headings, chart data or drawings onto it, and don't steer back to trading unless it is genuinely useful or they ask.
- You cannot browse the internet or see live prices or news. For anything that may have changed recently, give your best answer and say it may be out of date.
- If a question mixes topics (for example maths behind position sizing, or how trading stress affects sleep), cover all of it.
- Be honest: if you are unsure, say so and explain what you would check. Never make up facts, sources or numbers.
- When you say what works or doesn't in trading, ground it in evidence. These sources are verified and also appear in the app's "Evidence & sources" library, so you may cite them by short name (e.g. "Osler 2000"): ${SOURCES.map(x => `${srcShort(x)}: ${x.found}`).join(" | ")}. Cite other research only if you are confident it exists, and say where the evidence is mixed.

How to explain trading and chart questions
- Go into full detail, but keep the language simple: short sentences, everyday words, one idea at a time. Write for a smart beginner.
- Every time you use a trading term, explain it in plain words in brackets the first time, e.g. "liquidity (the stop orders sitting just past a level)".
- Use a simple everyday comparison when it makes an idea click, but keep it to one sentence.
- Walk through the chart step by step with the real prices, times and candle numbers from the data below, so they learn to see it themselves.
- For chart and trading questions, lay the answer out with these headings (skip any that don't fit the question):
### The short answer
### What your chart shows
### Why it matters
### What would confirm it, and what would prove it wrong
### What to do next
### Remember
- Use bullet points for steps and **bold** for key words. Be as long as it takes to explain properly (usually 150 to 350 words), but never pad.
- Only use prices, times and values from the data below${withImage ? " and the attached screenshot of their chart" : ""}. Never invent numbers.
- You cannot see the future: the app hides candles after "now" until the round ends. Explain what would confirm or cancel an idea; never claim certainty.
- The app asks the user questions about this chart (see "This round"). When there is a CURRENT QUESTION, relate everything you say to it: use its wording, point at the candles it's about, and draw them on the chart.
- While the current question is OPEN, you are given its answer key in secret. Use it to steer them, step by step, so they see the answer for themselves: show them where to look, what to measure and how to decide. Never state the answer, its letter or its wording, and don't confirm or deny a guess before they answer in the app: ask them for their reasoning instead and point at what to check. If they ask outright, give a very strong hint and tell them to pick it in the app. Your guidance must lead to the key, never away from it.
- Once a question is answered, explain it completely: say why the right answer is right, why their choice was right or wrong, and build on the app's explanation.
- Judge setups with the playbook below, pillar by pillar in order, saying which are met, which are missing, and why.
- This is practice and education, not financial advice. No strategy guarantees profit; never promise returns. Be honest when a setup is weak or when the right answer is "stay out".

Drawing on the user's chart (do this: it is how they learn to see it)
Put these commands anywhere in your answer, each inside double square brackets. The app draws them on the chart straight away and hides the command text, so also say in words what you drew ("I've drawn the sweep low in purple").
[[level PRICE | label]] a horizontal line, e.g. [[level ${px2(I, G.Sv.c[G.t])} | Decision price]]
[[zone LOW - HIGH | label]] a shaded price zone
[[line #A PRICE > #B PRICE | label]] a straight line between two candles (trend lines, channel edges)
[[ray #A PRICE > #B PRICE | label]] the same line, extended to the right edge
[[arrow #A PRICE > #B PRICE | label]] an arrow, e.g. to show the path price took
[[box #A - #B | label]] a box around a group of candles (a sweep, a displacement run, a range)
[[point #A PRICE | label]] a dot on one candle (a swing high, the sweep wick)
[[focus #A - #B]] scroll and zoom the chart to show those candles
[[timeframe TF]] switch the chart to another timeframe (${Object.keys(TF).join(", ")}); your candle numbers still refer to the list below
[[clear]] remove your earlier drawings
Rules: candle numbers (#) refer to the ${ref.tf} list below; #${ref.N + 1} and higher mean the future (use them only for arrows showing a possible path, and say it is only a possibility). Labels are 2 to 4 words. Draw at most 6 things per answer, and draw whenever you point at a price or a group of candles. Never put a command inside a code block.

The playbook (the five pillars, in order)
1. Location: price is at a higher-timeframe point of interest: a daily/4h/1h fair value gap or order block, the previous day high or low, or another key level.
2. Liquidity sweep: price trades through that level (taking the stops beyond it) and then rejects back.
3. Change in state of delivery (CISD): a candle closes back through the opening price of the run of candles that delivered price into the level, so delivery has flipped.
4. Displacement: strong, large-bodied candles away from the level (body at least about 1.2× ATR, closing near its extreme).
5. Execution: enter on internal confirmation (a pullback into an internal FVG or order block, or a retest of the CISD level, ideally with rising volume), stop beyond the sweep, target the other side of the range, at least 1.5R.
The five ways the market moves: ${Object.entries(STATE_DEF).map(([k, v]) => `${REGIMES[k]}: ${v}`).join(" ")}

The user's screen right now
Market: ${I.name || I.short} (${I.tv}), ${I.exch}. They are viewing the ${G.view} chart; the round is on ${G.tf}. ${isIntra(G.view) ? "These intraday candles are simulated inside real daily candles, so they are realistic practice but not real history." : "These are real historical candles."}

${chartData(ref)}

Points of interest known at this moment
${levelsData()}

Already on the chart
${marksData(ref)}

This round
${roundData(ref)}

The user's record
${progressData()}
${typeof nwCoachLines === "function" ? nwCoachLines() : ""}
The user asks:
${question}`;
}

/* ----- chart commands written by Claude ----- */
const CMD_RE = /\[\[([^\[\]\n]{1,200})\]\]/g;
const num = s => { const x = parseFloat(String(s).replace(/[,$£\s]/g, "")); return isFinite(x) ? x : NaN; };
function priceOk(ref, p) { const S = ref.S; let mn = Infinity, mx = -Infinity; for (let i = Math.max(0, S.n - 300); i < S.n; i++) { mn = Math.min(mn, S.l[i]); mx = Math.max(mx, S.h[i]); } const pad = (mx - mn) * 0.6; return isFinite(p) && p > mn - pad && p < mx + pad; }
function aiOverlay(o) { G.overlays.push(Object.assign(o, { ai: true, color: AI_COL })); chart.overlays = G.overlays; if (!chart.showMarks) { chart.showMarks = ST.marks = true; save(); renderTools(); } chart.req(); }
function runCmd(raw, ref, m) {
  const I = G.I, [body, lab] = raw.split("|").map(s => s.trim()), label = lab ? "✦ " + lab.slice(0, 30) : "✦ Quint";
  const mm = body.match(/^(\w+)\s*(.*)$/); if (!mm) return null;
  const kind = mm[1].toLowerCase(), rest = mm[2];
  const pts = [...rest.matchAll(/#\s*(\d+)(?:\s*(?:at|@|:)\s*|\s+)([\d,]*\d(?:\.\d+)?)/gi)].map(x => ({ n: +x[1], p: num(x[2]) }));
  const nums = [...rest.replace(/#\s*\d+/g, " ").matchAll(/([\d,]*\d(?:\.\d+)?)/g)].map(x => num(x[1]));
  const okN = n => isFinite(n) && n >= 1 && n <= ref.N + 60;
  if (kind === "clear") { G.overlays = G.overlays.filter(o => !o.ai); chart.overlays = G.overlays; chart.req(); CO.drawn = 0; return "Cleared my drawings"; }
  if (kind === "timeframe" || kind === "tf") { const w = rest.trim().split(/\s+/)[0] || "", tfs = Object.keys(TF), words = { daily: "1D", day: "1D", weekly: "1W", hourly: "1h", "4hour": "4h", "4hr": "4h", "1hr": "1h", "1hour": "1h" };
    const key = tfs.find(k => k === w) || words[w.toLowerCase()] || tfs.find(k => k.toLowerCase() === w.toLowerCase()); if (!key) return null; if (G.view !== key) setView(key); return `Switched to ${key}`; }
  if (kind === "focus") { const ns = [...rest.matchAll(/#\s*(\d+)/g)].map(x => +x[1]).filter(okN); if (!ns.length) return null; const t0 = timeOfNum(ref, Math.min(...ns)), t1 = timeOfNum(ref, Math.max(...ns)); m.focus = [t0, t1]; chart.focusRange(t0, t1); if (G.phase === "play") { G.follow = false; renderLiveBtn(); } return `Zoomed to candles #${Math.min(...ns)}–#${Math.max(...ns)}`; }
  if (CO.drawn >= 16) return null;
  if (kind === "level" || kind === "line" && !pts.length && nums.length === 1) { const p = nums[0]; if (!priceOk(ref, p)) return null; aiOverlay({ type: "zone", lo: p, hi: p, label }); CO.drawn++; m.lastP = p; return `Level ${fnum(I, p)}`; }
  if (kind === "zone") { const [a, b] = nums.filter(x => priceOk(ref, x)); if (a == null || b == null) return null; aiOverlay({ type: "zone", lo: Math.min(a, b), hi: Math.max(a, b), label }); CO.drawn++; m.lastP = (a + b) / 2; return `Zone ${fnum(I, Math.min(a, b))}–${fnum(I, Math.max(a, b))}`; }
  if (kind === "line" || kind === "ray" || kind === "arrow" || kind === "trend" || kind === "trendline") {
    if (pts.length < 2 || !okN(pts[0].n) || !okN(pts[1].n) || !priceOk(ref, pts[0].p) || !priceOk(ref, pts[1].p)) return null;
    const t0 = timeOfNum(ref, pts[0].n), t1 = timeOfNum(ref, pts[1].n);
    aiOverlay({ type: kind === "arrow" ? "arrow" : "tline", extend: kind === "ray", t0, p0: pts[0].p, t1, p1: pts[1].p, label, dash: pts[1].n > ref.N ? [5, 4] : null }); CO.drawn++; m.focus = m.focus || [Math.min(t0, t1), Math.max(t0, t1)];
    return `${kind === "arrow" ? "Arrow" : kind === "ray" ? "Ray" : "Line"} #${pts[0].n} → #${pts[1].n}`;
  }
  if (kind === "box") { const ns = [...rest.matchAll(/#\s*(\d+)/g)].map(x => +x[1]).filter(n => n >= 1 && n <= ref.N); if (!ns.length) return null; const n0 = Math.min(...ns), n1 = Math.max(...ns), t0 = timeOfNum(ref, n0), t1 = timeOfNum(ref, n1 + 1);
    aiOverlay({ type: "box", t0, t1, label }); CO.drawn++; m.focus = m.focus || [t0, timeOfNum(ref, n1)]; return `Box #${n0}–#${n1}`; }
  if (kind === "point" || kind === "dot" || kind === "mark") {
    let n = pts.length ? pts[0].n : NaN, p = pts.length ? pts[0].p : NaN;
    if (!pts.length || !priceOk(ref, p)) { const nn = rest.match(/#\s*(\d+)/), w = rest.match(/\b(high|low|open|close)\b/i); if (nn && w) { n = +nn[1]; const i = ref.a + n - 1, S = ref.S; if (i >= 0 && i < S.n) p = { high: S.h, low: S.l, open: S.o, close: S.c }[w[1].toLowerCase()][i]; } }
    if (!okN(n) || !priceOk(ref, p)) return null; const t = timeOfNum(ref, n); aiOverlay({ type: "dot", t, p, label }); CO.drawn++; m.focus = m.focus || [t, t]; return `Point on #${n}`;
  }
  return null;
}
function applyCmds(m, text, final) { // run each complete command once; return the text to show
  let k = 0; const done = m.done || (m.done = []);
  text = text.replace(/```\w*\n?([\s\S]*?)```/g, (all, inner) => /\[\[/.test(inner) ? inner : all); // unwrap commands put in a code block by mistake, keep real code
  const shown = text.replace(CMD_RE, (all, body) => { const idx = k++; if (idx >= done.length) { let r = null; const tgt = {}; try { r = runCmd(body, m.ref, tgt); } catch (e) { r = null; } if (tgt.focus) m.focus = tgt.focus; done.push(r ? { txt: r, focus: tgt.focus || null, p: tgt.lastP != null ? tgt.lastP : null, tf: m.ref.tf } : null); } return ""; });
  const cut = shown.lastIndexOf("[["), visible = cut >= 0 && shown.indexOf("]]", cut) < 0 ? shown.slice(0, cut) : shown;
  return (final ? shown.replace(/\[\[[^\]]*$/, "") : visible).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

/* ----- chart screenshot for Claude to look at ----- */
function chartBlob() {
  return new Promise(res => {
    try { const cv = $("#cv"), W = cv.clientWidth, H = cv.clientHeight, k = Math.min(1.5, 1100 / Math.max(W, 1)), o = document.createElement("canvas");
      o.width = Math.round(W * k); o.height = Math.round(H * k); o.getContext("2d").drawImage(cv, 0, 0, o.width, o.height); o.toBlob(b => res(b), "image/png"); } catch (_) { res(null); }
  });
}

/* ----- tiny, safe markdown ----- */
function coachMD(src) {
  const inl = s => { const codes = []; s = String(s).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
    return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>").replace(/\u0000(\d+)\u0000/g, (_, k) => `<code>${esc(codes[+k])}</code>`); };
  const out = []; let list = null, code = null, table = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const endTable = () => { if (!table) return; const rows = table.filter(r => !/^\s*\|?\s*:?-{2,}/.test(r)), cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
    const head = table.length > 1 && /^\s*\|?\s*:?-{2,}/.test(table[1]);
    out.push(`<div class="ctable"><table>${rows.map((r, k) => `<tr>${cells(r).map(c => k === 0 && head ? `<th>${inl(c)}</th>` : `<td>${inl(c)}</td>`).join("")}</tr>`).join("")}</table></div>`); table = null; };
  for (const raw of String(src || "").split("\n")) {
    if (code) { if (/^\s*```/.test(raw)) { out.push(`<pre class="ccode"><code>${esc(code.join("\n"))}</code></pre>`); code = null; } else code.push(raw); continue; }
    if (/^\s*```/.test(raw)) { close(); endTable(); code = []; continue; }
    const line = raw.trimEnd();
    if (/^\s*\|.*\|\s*$/.test(line)) { close(); (table = table || []).push(line); continue; }
    endTable();
    const ul = line.match(/^\s*[-*•]\s+(.*)/), ol = line.match(/^\s*\d+[.)]\s+(.*)/), h = line.match(/^#{1,4}\s+(.*)/);
    if (ul || ol) { const t = ul ? "ul" : "ol"; if (list !== t) { close(); out.push(`<${t}>`); list = t; } out.push(`<li>${inl((ul || ol)[1])}</li>`); continue; }
    close();
    if (h) out.push(`<p class="ch">${inl(h[1])}</p>`); else if (line.trim()) out.push(`<p>${inl(line)}</p>`);
  }
  if (code) out.push(`<pre class="ccode"><code>${esc(code.join("\n"))}</code></pre>`); // still streaming
  close(); endTable(); return out.join("");
}

/* ----- the question pinned at the top of Quint (when the lesson panel is hidden) ----- */
function coachAsk(text) { if (!CO.sample || !G) return; if (!CO.open) openCoach(); coachSend(text); }
function renderCoachQ() {
  const el = $("#cq"); if (!el) return;
  if (!CO.open || !G || coachWide()) { el.innerHTML = ""; el.hidden = true; return; }
  const L = "ABCDEFGH"; let h = "";
  const qkey = G.phase === "quiz" ? `${CO.roundKey}|${G.qi}|${G.qs && G.qs[G.qi] && G.qs[G.qi].done}` : G.phase;
  if (qkey !== CO.qkey) { CO.qkey = qkey; CO.qmin = false; }
  if (G.phase === "quiz" && G.qs && G.qs[G.qi]) {
    const q = G.qs[G.qi];
    h = CO.qmin ? `<div class="cqh"><span class="cqline"><b>Q${G.qi + 1}/${G.qs.length} · ${q.tf || G.tf}</b> ${esc(q.title)}</span><button class="cqx" id="cqmin" aria-expanded="false">▾ Show</button></div>`
      : `<div class="cqh"><span class="qk">${esc(q.tag)} · Q${G.qi + 1} of ${G.qs.length} · ${q.tf || G.tf} candles</span><button class="cqx" id="cqmin" aria-expanded="true">▴ Hide</button></div><div class="cqt">${esc(q.title)}</div>`;
    if (!q.done && q.tf && G.view !== q.tf && G.view !== q.switchTF && !coachFull()) h += `<div class="cqo"><button class="cqb pri" id="cqtf">⚠ You're on ${G.view}: switch to ${q.tf}</button></div>`;
    if (CO.qmin) { // compact: one scrollable row of the actions that matter
      const ok = q.score >= 1, ans = q.done && q.kind === "mc" ? (q.opts.find(o => o.k === q.correct).s || "") : "";
      h += `<div class="cqo one">${!q.done && q.kind === "mc" ? q.opts.map((o, i) => `<button class="cqb" data-k="${o.k}"><b>${L[i]}</b> ${esc(o.s || o.label)}</button>`).join("")
        : !q.done ? `<button class="cqb" id="cqtool">${q.tool === "hline" ? "─ Line tool" : "╱ Trend tool"}</button><button class="cqb pri" id="cqcheck">Check my drawing</button>`
        : `<span class="cqv ${ok ? "pos" : q.score > 0 ? "warn" : "neg"}">${q.kind === "mc" ? (ok ? `✓ ${esc(ans)}` : `✕ Answer: ${esc(ans)}`) : ok ? "✓ Accurate" : q.score > 0 ? "≈ Close" : "✕ Off"}</span><button class="cqb pri" id="cqnext">${G.qi + 1 < G.qs.length ? "Next →" : "Continue →"}</button>`}</div>`;
    } else {
      if (!q.done && q.kind === "mc") h += `<div class="cqo">${q.opts.map((o, i) => `<button class="cqb" data-k="${o.k}"><b>${L[i]}</b> ${esc(o.s || o.label)}</button>`).join("")}</div><div class="cqo"><button class="cqb ask" id="cqguide">✦ Guide me through this question</button></div>`;
      else if (!q.done) h += `<div class="cqo"><button class="cqb" id="cqtool">${q.tool === "hline" ? "─ Line tool" : "╱ Trend line tool"}</button><button class="cqb pri" id="cqcheck">Check my drawing</button></div><div class="cqo"><button class="cqb ask" id="cqguide">✦ Guide me through this question</button></div>`;
      else { const ok = q.score >= 1, ans = q.kind === "mc" ? (q.opts.find(o => o.k === q.correct).s || "") : "";
        h += `<div class="cqv ${ok ? "pos" : q.score > 0 ? "warn" : "neg"}">${q.kind === "mc" ? (ok ? `✓ Correct: ${esc(ans)}` : `✕ The answer was: ${esc(ans)}`) : q.res && q.res.skipped ? "Answer shown on the chart" : ok ? "✓ Accurate" : q.score >= 0.6 ? "≈ Close" : q.score > 0 ? "≈ In the area" : "✕ Off target"}${q.cash ? ` · ${fusd(q.cash)}` : ""}</div>
          <div class="cqo"><button class="cqb ask" id="cqwhy">✦ Why? Explain it</button><button class="cqb pri" id="cqnext">${G.qi + 1 < G.qs.length ? "Next question →" : "Continue →"}</button></div>`; }
    }
  } else if (G.phase === "check" || G.phase === "trade") {
    h = `<div class="cqh"><span class="qk">${G.phase === "check" ? "Playbook checklist" : "Order ticket"}</span></div><div class="cqt">${G.phase === "check" ? "Which pillars can you see on this chart?" : "Buy, sell or stay out?"}</div>
      <div class="cqo"><button class="cqb ask" id="cqguide">✦ ${G.phase === "check" ? "Guide me through the pillars" : "Is this a playbook setup?"}</button><button class="cqb pri" id="cqback">Back to the ${G.phase === "check" ? "checklist" : "ticket"}</button></div>`;
  }
  el.hidden = !h; el.innerHTML = h; if (!h) return;
  const q = G.phase === "quiz" ? G.qs[G.qi] : null;
  $$(".cqb[data-k]", el).forEach(b => b.onclick = () => answer(b.dataset.k, b));
  const on = (id, f) => { const b = $("#" + id, el); if (b) b.onclick = f; };
  on("cqmin", () => { CO.qmin = !CO.qmin; renderCoachQ(); });
  on("cqtool", () => { if (coachFull()) setCoachFull(false, true); chart.setMode(q.tool); renderTools(); toast("Draw it on the chart above, then tap Check"); });
  on("cqcheck", () => checkDraw($("#cqcheck", el)));
  on("cqguide", () => coachSend(guideText()));
  on("cqwhy", () => coachSend(whyText()));
  on("cqnext", () => { G.qi++; if (G.qi >= G.qs.length) G.phase = afterQuiz(); renderPanel(); });
  on("cqback", () => closeCoach());
  on("cqtf", () => setView(q.tf));
}
function guideText() {
  const q = G.phase === "quiz" ? G.qs[G.qi] : null;
  if (q) return `Guide me through this question step by step, without giving me the answer: "${q.title}"`;
  return G.phase === "check" ? "Guide me through the pillar checklist for this chart: which pillars should I look for, and where?" : "Is this a playbook setup? Walk me through the pillars on this chart before I decide.";
}
function whyText() {
  const q = G.qs[G.qi]; if (!q) return "Explain that answer.";
  if (q.kind === "mc") { const ans = q.opts.find(o => o.k === q.correct).s || q.opts.find(o => o.k === q.correct).label; return q.score ? `I got "${q.title}" right (${ans}). Explain fully why, so I can spot it every time.` : `I got "${q.title}" wrong. Why is the answer "${ans}"? Show me on the chart what I should have seen.`; }
  return `Explain the answer to "${q.title}" and show me on the chart where my drawing should have gone.`;
}

/* ----- UI ----- */
function coachSuggestions() {
  if (!G) return [];
  const last = CO.msgs[CO.msgs.length - 1], answered = last && last.role === "assistant" && !last.err && last.content;
  const chartish = answered && /\[\[|###|candle|price|stop|chart|level|trend/i.test(last.content);
  const extra = answered ? (last.cut ? ["Continue"] : ["Explain that more simply", ...(chartish ? ["Draw it on my chart"] : ["Tell me more"])]) : [];
  if (chart.cross) extra.unshift("Explain the candle I tapped");
  if (chart.drawings.length && !answered) extra.unshift("Check my drawing");
  return [...new Set(extra.concat(coachSuggestionsFor()))].slice(0, 6);
}
function coachSuggestionsFor() {
  const q = G.phase === "quiz" && G.qs && G.qs[G.qi], P = G.pos;
  if (q && !q.done) return ["Give me a hint for this question", "What does this question mean?", "Draw what I should look at"];
  if (q && q.done) return ["Why is that the answer?", "Show me on the chart"];
  if (G.phase === "check" || G.phase === "trade") return ["Is this a playbook setup?", "Draw where the stop and target go", "Should I stay out?"];
  if (G.phase === "play") return P && P.open ? ["What's happening right now?", "Should I move my stop to breakeven?"] : ["What's price doing now?"];
  if (G.phase === "done") return P ? [`Why did my trade ${P.R > 0 ? "win" : "lose"}?`, "Show me the setup on the chart", "What should I practise next?"] : ["Was staying out right?", "Show me the setup on the chart", "What should I practise next?"];
  return ["What is the market doing?"];
}
function bubbleHTML(m) {
  const body = m.view ? coachMD(m.view) : `<p class="dim">${esc(m.status || "Thinking…")}</p>`;
  const acts = (m.done || []).map((r, j) => r ? `<button class="cact" data-j="${j}">✦ ${esc(r.txt)}</button>` : "").join("");
  const read = m.view && !coachFull() && window.innerWidth < 1280 && m.view.length > 120 ? `<button class="cread">⤢ Read full screen</button>` : "";
  return read + body + (acts ? `<div class="cacts">${acts}</div>` : "");
}
function bindActs(el, m) { const rd = $(".cread", el); if (rd) rd.onclick = () => { setCoachFull(true); const i = CO.msgs.indexOf(m); setTimeout(() => { const e = $(`#cmsgs .cmsg.a[data-i="${i}"]`); if (e) e.scrollIntoView({ block: "start" }); }, 30); };
  $$(".cact", el).forEach(b => b.onclick = () => { const r = (m.done || [])[+b.dataset.j]; if (!r || !G) return; if (coachFull()) setCoachFull(false, true);
  if (r.focus) { chart.focusRange(r.focus[0], r.focus[1]); if (G.phase === "play") { G.follow = false; renderLiveBtn(); } }
  else if (r.p != null) { chart.ym = null; chart.req(); }
  if (window.innerWidth < 960) toast(r.p != null && !r.focus ? `Marked at ${fnum(G.I, r.p)} on the chart above ↑` : "Look at the chart above ↑"); }); }
function setCoachModel(m) { // show which Claude model actually answered
  const id = String(m && (m.model || m.id || m) || ""), k = id.match(/claude-([a-z]+)-(\d+)-(\d+)/), el = $("#cmodel");
  if (el && k) el.textContent = k[1].charAt(0).toUpperCase() + k[1].slice(1) + " " + k[2] + "." + k[3];
}
function renderCoach() {
  const el = coachEl(); if (!el) return;
  const box = $("#cmsgs", el), prevTop = box.scrollTop;
  box.innerHTML = CO.msgs.length ? CO.msgs.map((m, i) => m.role === "note" ? `<div class="cnote">${esc(m.content)}</div>`
    : m.role === "user" ? `<div class="cmsg u">${esc(m.content).replace(/\n/g, "<br>")}</div>`
    : `<div class="cmsg a${m.err ? " err" : ""}" data-i="${i}">${bubbleHTML(m)}</div>`).join("")
    : `<div class="cempty"><div class="qorb big" aria-hidden="true"><s></s><s></s><i></i></div><b>Quint online</b><p>Ask about this chart, trading, money, maths or anything else. I read the candles, levels, your drawings and your answers on this screen, never the hidden future, and I can draw on your chart to show what I mean. Tap a candle first to ask about that one.</p><div class="qtiles">${[["Scan chart", "Read this chart for me", "Read this chart for me: trend, key levels and what you'd watch next."], ["Mark levels", "Draw the key levels", "Draw the key support and resistance levels on my chart and explain each one."], ["Plan a trade", "Entry, stop and target", "If there is a trade here, give me the entry, stop and target, or tell me to stay out and why."], ["Teach me", "Explain a concept simply", "Teach me the single most useful concept for reading this chart, simply, with an example from it."]].map(t => `<button class="qtile" data-q="${esc(t[2])}"><b>${t[0]}</b><span>${t[1]}</span></button>`).join("")}</div></div>`;
  $$(".cmsg.a", box).forEach(e => bindActs(e, CO.msgs[+e.dataset.i]));
  $$(".qtile", box).forEach(b => b.onclick = () => coachSend(b.dataset.q));
  // place a new question at the top once; after that the scroll is yours, even while the answer is still loading
  if (CO.anchorPending) followAnswer(box); else box.scrollTop = prevTop;
  renderSugg();
}
function renderSugg() {
  const el = coachEl(); if (!el) return;
  $("#csugg", el).innerHTML = CO.busy ? "" : coachSuggestions().map(s => `<button class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join("");
  $$("#csugg .chip", el).forEach(b => b.onclick = () => coachSend(b.dataset.q));
  $("#csend", el).hidden = CO.busy; $("#cstop", el).hidden = !CO.busy;
}
{ const prev = chart.onCross; let had = false; chart.onCross = i => { prev(i); const has = !!chart.cross; if (CO.open && has !== had) renderSugg(); had = has; }; }
let coachPaintRaf = 0;
function paintLast() { if (coachPaintRaf) return; coachPaintRaf = requestAnimationFrame(() => { coachPaintRaf = 0; const el = coachEl(), box = $("#cmsgs", el), last = box && box.lastElementChild, m = CO.msgs[CO.msgs.length - 1];
  if (!last || !m || m.role !== "assistant" || !last.classList.contains("a")) { renderCoach(); return; }
  const top = box.scrollTop; last.innerHTML = bubbleHTML(m); bindActs(last, m);
  if (CO.anchorPending) followAnswer(box); else if (box.scrollTop !== top) box.scrollTop = top; }); }
function keepAnswerTop(box) { const last = box.lastElementChild; if (!last) return 0; const prev = last.previousElementSibling, anchor = last.classList.contains("a") && prev && prev.classList.contains("u") ? prev : last;
  const tgt = Math.max(0, anchor.offsetTop - 8); box.scrollTop = tgt; return tgt; }
// bring a new question to the top and keep it there while the answer grows, until you scroll yourself
function followAnswer(box) { if (!CO.anchorPending) return; const tgt = keepAnswerTop(box); if (Math.abs(box.scrollTop - tgt) < 2) CO.anchorPending = false; }
{ const box = document.querySelector("#cmsgs"); if (box) { const mine = () => { CO.anchorPending = false; }; for (const ev of ["touchstart", "wheel", "mousedown", "keydown"]) box.addEventListener(ev, mine, { passive: true }); } }
function coachNoteRound() {
  if (!G) return; const key = G.I.sym + "|" + G.tDec + "|" + G.tf;
  if (CO.roundKey && CO.roundKey !== key && CO.msgs.length && CO.msgs[CO.msgs.length - 1].role !== "note") CO.msgs.push({ role: "note", content: `New chart: ${G.I.tv} · ${G.tf}` });
  if (CO.roundKey !== key) CO.drawn = 0; CO.roundKey = key;
}
const CF_IN = `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 7.5V3h4.5M12.5 3H17v4.5M17 12.5V17h-4.5M7.5 17H3v-4.5"/></svg>`, CF_OUT = `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7.5 3v4.5H3M17 7.5h-4.5V3M12.5 17v-4.5H17M3 12.5h4.5V17"/></svg>`;
function setCoachFull(on, keep) {
  const app = $("#app"), b = $("#cfull"); app.classList.toggle("cofs", !!on && CO.open);
  b.innerHTML = on ? CF_OUT : CF_IN; b.setAttribute("aria-pressed", String(!!on)); b.setAttribute("aria-label", on ? "Show the chart again" : "Expand Quint to full screen");
  if (!keep) { ST.coachFull = !!on; save(); }
  if (CO.open) { renderCoach(); renderCoachQ(); } chart.req(); setTimeout(() => chart.req(), 60);
}
const coachFull = () => $("#app").classList.contains("cofs");
function openCoach() {
  if (!CO.sample) return; if (G && G.replay) { toast("Quint works in the game modes. In replay, use the drawing tools to mark the chart."); return; } if ($("#app").classList.contains("fs")) setFS(false); CO.open = true; CO.anchorPending = true; coachNoteRound();
  $("#app").classList.add("co"); coachEl().hidden = false; $("#coachbtn").setAttribute("aria-pressed", "true");
  if (!coachWide()) {
    if (TMR && !TMR.paused) { pauseTimer(); CO.pausedTmr = true; }
    if (G && G.phase === "play" && !G.paused) { G.paused = true; CO.pausedPlay = true; renderPlay(); toast("Trade paused while you ask Quint"); }
  }
  setCoachFull(!!ST.coachFull, true); renderCoach(); renderCoachQ(); chart.req(); setTimeout(() => chart.req(), 50);
  if (window.innerWidth >= 960) $("#cin").focus();
}
function closeCoach() {
  CO.open = false; $("#app").classList.remove("co", "cofs"); coachEl().hidden = true; $("#coachbtn").setAttribute("aria-pressed", "false");
  if (CO.pausedTmr) { resumeTimer(); CO.pausedTmr = false; }
  if (CO.pausedPlay) { CO.pausedPlay = false; if (G && G.phase === "play" && G.paused && !(G.pbm && G.pb.mg && !G.pb.mg.ok && !G.pb.mg.done)) { G.paused = false; renderPlay(); } }
  chart.req(); setTimeout(() => chart.req(), 50); window.scrollTo(0, 0);
}
function coachHistory() { // earlier turns, oldest first; the latest user turn is added by coachSend
  const h = [];
  for (const m of CO.msgs) { if (m.role === "note" || m.err || (m.role === "assistant" && !m.content)) continue; const last = h[h.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + m.content; else h.push({ role: m.role, content: m.content }); }
  while (h.length && h[0].role !== "user") h.shift();
  const out = h.slice(-13); while (out.length && out[0].role !== "user") out.shift(); return out;
}
function coachEasy(t) { // a short "what is…" question with nothing about this chart, a trade or a decision in it
  t = String(t || "").trim(); if (t.length > 90 || /\[\[|\n/.test(t)) return false;
  return /^(what('s| is| are| does)|define|meaning of|explain what|what do you mean by)\b/i.test(t) && !/\b(this|that|here|my|chart|candle|trade|buy|sell|long|short|should|now|today|level|stop|target|entry|why|how)\b/i.test(t);
}
async function coachSend(text, retryNoImg) {
  text = String(text || "").trim(); if (!text || CO.busy || !CO.sample || !G) return;
  if (!retryNoImg) { coachNoteRound(); CO.msgs.push({ role: "user", content: text }); }
  const ref = coachRef(), a = { role: "assistant", content: "", view: "", status: "Thinking…", ref, t0: performance.now() }; CO.msgs.push(a);
  if (window.innerWidth < 960 || coachFull()) CO.qmin = true;
  CO.busy = true; coachEl() && coachEl().classList.add("busy"); { const cs = $("#cstate"); if (cs) cs.textContent = "analysing"; } CO.anchorPending = true; const ctl = CO.ctl = new AbortController(); renderCoach(); renderCoachQ(); $("#cin").value = ""; autoGrow();
  clearInterval(CO.tick); CO.tick = setInterval(() => { if (!a.content) { a.status = `Analysing… ${Math.round((performance.now() - a.t0) / 1000)}s`; paintLast(); } }, 1000);
  let img = null, retry = false;
  try {
    const hist = coachHistory();
    img = CO.imgs && !retryNoImg && !coachEasy(text) ? await chartBlob() : null;
    hist[hist.length - 1] = { role: "user", content: coachPrompt(hist[hist.length - 1].content, ref, !!img) };
    const easy = coachEasy(text), opts = Object.assign({ onText: ({ text: t }) => { a.content = t; a.view = applyCmds(a, t, false); paintLast(); }, signal: ctl.signal, cache: false }, easy ? { modelTier: "quick" } : { model: "claude-fable-5-2", modelTier: "complex", effort: "high" }); // quick definitions go to a lighter Claude model to save the user's usage; chart work stays on the strongest
    if (img) opts.images = [img];
    const r = await CO.sample(hist, opts);
    if (r && r.modelApplied) setCoachModel(r.modelApplied);
    if (r && r.text) a.content = r.text;
    if (r && r.truncated) a.cut = true;
    a.view = applyCmds(a, a.content, true) + (a.cut ? "\n\n*(Answer cut short. Tap Continue for the rest.)*" : "");
    if (!a.content) { a.view = "I couldn't come up with an answer. Try asking another way."; a.err = true; }
  } catch (e) {
    const code = e && e.code, keep = e && e.text ? e.text : a.content;
    if ((code === "images_unavailable" || code === "image_rejected") && img && !retryNoImg) { CO.imgs = false; retry = true; }
    else { if (keep && code !== "refused") { a.content = keep; a.view = applyCmds(a, keep, true); } else { a.content = ""; a.view = ""; }
    const msg = { cancelled: "*(Stopped.)*", not_granted: "Quint needs your permission to use Claude, and it wasn't given. Reload the page to be asked again.", sampling_disabled: "Claude isn't available for this account here.", rate_limited: "Quint is busy or you've hit a usage limit. Give it a minute, then try again.", session_expired: "Your Claude session has expired. Sign in again, then retry.", refused: "Claude couldn't answer that one. Try asking it a different way.", empty_completion: "Claude didn't come up with an answer. Try asking a shorter or simpler question." }[code] || "Something went wrong reaching Quint. Try again in a moment.";
    a.view = (a.view ? a.view + "\n\n" : "") + msg; if (!a.content) a.err = true; }
  } finally { clearInterval(CO.tick); if (CO.ctl === ctl) { CO.busy = false; CO.ctl = null; coachEl() && coachEl().classList.remove("busy"); { const cs = $("#cstate"); if (cs) cs.textContent = "online"; } } a.status = null; }
  if (retry) { CO.msgs.splice(CO.msgs.indexOf(a), 1); return coachSend(text, true); }
  renderCoach();
}
function autoGrow() { const t = $("#cin"); if (!t) return; t.style.height = "auto"; t.style.height = Math.min(120, t.scrollHeight) + "px"; }
$("#coachbtn").onclick = () => CO.open ? closeCoach() : openCoach();
$("#cclose").onclick = closeCoach;
$("#cfull").onclick = () => setCoachFull(!coachFull());
$("#cnew").onclick = () => { if (CO.ctl) CO.ctl.abort(); CO.msgs = []; CO.roundKey = null; coachNoteRound(); renderCoach(); };
$("#cstop").onclick = () => { if (CO.ctl) CO.ctl.abort(); };
$("#cform").onsubmit = e => { e.preventDefault(); coachSend($("#cin").value); };
$("#cin").addEventListener("input", autoGrow);
$("#cin").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); coachSend($("#cin").value); } if (e.key === "Escape") { if (coachFull()) setCoachFull(false); else closeCoach(); } });
$("#cin").addEventListener("blur", () => setTimeout(() => { if (document.scrollingElement) document.scrollingElement.scrollTop = 0; window.scrollTo(0, 0); }, 60));
window.addEventListener("resize", () => { if (CO.open) { chart.req(); renderCoachQ(); } });
initCoach();
