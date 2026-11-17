/* ----- checklist (graded only after the trade, like real life) ----- */
const checkItems = () => G.pb.rules.filter(r => r !== "loc");
const hasCheck = () => G.pbm && G.pb.ev.loc && checkItems().length > 0;
const RDEF = {
  sweep: d => `At the level, price ran ${d > 0 ? "below the recent lows (or the PDL)" : "above the recent highs (or the PDH)"}, taking the stops resting there, then closed back ${d > 0 ? "above" : "below"} that level within one candle.`,
  cisd: d => `After the sweep, a candle closed ${d > 0 ? "above the open of the run of red candles" : "below the open of the run of green candles"} that delivered price into the sweep.`,
  disp: d => `Since the sweep there's a strong ${d > 0 ? "green" : "red"} candle: body at least 1.2× ATR, closing in the ${d > 0 ? "top" : "bottom"} 30% of its range.`,
  exec: d => `The last candle pulled back into the new fair value gap or order block (or retested the CISD level) and closed ${d > 0 ? "green" : "red"}; the stop beyond the sweep is 0.3–5× ATR away; the other side of the range is at least 1.5R away.`,
};
function renderCheck() {
  const P = pane(), d = G.pb.ev.bias, items = checkItems(), st = STAGES[G.pb.stage];
  if (st.timer && !G.pb.chkT) { G.pb.chkT = true; startTimer(30, () => { G.pb.locked = true; toast("Time's up: unanswered pillars count as wrong"); G.phase = "trade"; renderPanel(); }); }
  const all = items.every(r => G.pb.checks[r] != null);
  P.innerHTML = `${headHTML()}<div class="q"><div class="fbh"><span class="qk">Pillar checklist · ${dirName(d)} idea</span>${tmrHTML()}</div><h2>Run the pillars for a ${d > 0 ? "long" : "short"} from this level.</h2><p>Answer from the chart. It's graded after the trade, so decide the way you would with real money.</p>
    <div class="chk">${items.map(r => `<div class="ck"><div class="ckt"><b>${["loc", "sweep", "cisd", "disp", "exec"].indexOf(r) + 1} · ${PILLARS[r]}</b><span>${esc(RDEF[r](d))}</span></div><div class="seg" role="group" aria-label="${PILLARS[r]}"><button data-r="${r}" data-v="1" aria-pressed="${G.pb.checks[r] === true}">Yes</button><button data-r="${r}" data-v="0" aria-pressed="${G.pb.checks[r] === false}">No</button></div></div>`).join("")}</div>
    <button class="btn pri" id="lockchk" ${all ? "" : "disabled"}>Lock in checklist →</button>${coachOK() ? `<button class="btn coachask" id="askt">✦ Ask Quint to guide me</button>` : ""}</div>
    <p class="small" style="margin:0">Tip: zoom into the candles since the sweep. Switch timeframes to check the higher-timeframe picture.</p>`;
  $$(".chk .seg button", P).forEach(b => b.onclick = () => { G.pb.checks[b.dataset.r] = b.dataset.v === "1"; renderCheck(); });
  $("#lockchk").onclick = () => { G.pb.locked = true; stopTimer(); G.phase = "trade"; renderPanel(); P.parentElement.scrollTop = 0; }; bindAskTicket();
  renderMini();
}
function planFor(dir) {
  const ev = G.pb.ev, x = ev.ex; if (!dir) dir = ev.d;
  if (dir === ev.d && x && x.risk >= 0.3 * ev.A && x.risk <= 5 * ev.A) return { dir, stop: x.stop, sd: x.risk, rr: clamp(Math.round(x.rr * 10) / 10, 1, 6), tgt: ev.c + dir * clamp(x.rr, 1, 6) * x.risk, playbook: true };
  return { dir, stop: ev.c - dir * ev.A, sd: ev.A, rr: 2, tgt: ev.c + dir * 2 * ev.A, playbook: false };
}
function renderTradePB() {
  const P = pane(), I = G.I, ev = G.pb.ev, st = STAGES[G.pb.stage], pl = planFor(ev.d), e = ev.c, n = ticketNumbers(pl.sd), risk = n.risk, qty = n.qty, fees = n.fees, notional = qty * e * I.pv;
  if (st.timer && !G.pb.decT) { G.pb.decT = true; startTimer(15, () => { G.pb.hesitated = true; toast("Too slow: no order was placed"); decide(0); }); }
  const own = checkItems().every(r => G.pb.checks[r] === true);
  P.innerHTML = `${headHTML()}<div class="q"><div class="fbh"><span class="qk">Order ticket · playbook plan</span>${tmrHTML()}</div><h2>${ev.loc ? `Take the ${ev.bias > 0 ? "long" : "short"} or skip it?` : "No location, no setup. Trade anyway or skip?"}</h2>
    ${ev.loc ? `<p>Plan for a <b>${dirName(ev.bias)}</b>: entry <b>${fp(I, e)}</b>, stop <b>${fp(I, pl.stop)}</b> ${pl.playbook ? `(beyond the sweep, ${(pl.sd / ev.A).toFixed(1)}× ATR)` : "(1× ATR: the sweep is too far for a sensible stop)"}, target <b>${fp(I, pl.tgt)}</b> ${pl.playbook ? `(the other side of the range, ${pl.rr.toFixed(1)}R)` : "(2R)"}${st.mgmt ? ", stop to breakeven at +1R" : ""}.</p>` : `<p>The playbook says stand aside. Any trade here is logged as off-playbook and uses a 1× ATR stop with a 2R target.</p>`}
    ${hasCheck() ? `<p class="small" style="margin:0">Your pillars: ${checkItems().map(r => `${PILLARS[r]} ${G.pb.checks[r] === true ? "✓" : G.pb.checks[r] === false ? "✕" : "?"}`).join(" · ")}. ${own ? "All met by your read." : "Not all met by your read."}</p>` : ""}
    <div class="plan"><span>Risk</span><div class="chips" id="prisk">${[0.5, 1, 1.5].map(v => `<button class="chip" data-v="${v}" aria-pressed="${G.plan.risk === v}">${fbal(riskBudget(v))}</button>`).join("")}</div></div>${sizeNote(n)}
    <div class="ticket"><div>Size<b>${sizeText(I, qty)}</b></div><div>Max loss<b class="neg">−${fbal(risk)}</b></div><div>Target<b class="pos">+${fbal(risk * pl.rr)}</b></div><div>Value<b>${fbal(notional)}</b></div><div>Leverage<b class="${notional / ST.bal > 10 ? "warn" : ""}">${(notional / ST.bal).toFixed(1)}×</b></div><div>Fees<b>−$${fees.toFixed(2)}</b></div></div>
    <div class="orders"><button class="ord sell" id="sell"><b>SELL</b><span>${fp(I, e)}${ev.bias < 0 ? " · plan" : ""}</span></button><button class="ord buy" id="buy"><b>BUY</b><span>${fp(I, e)}${ev.bias > 0 ? " · plan" : ""}</span></button></div>
    <button class="btn" id="skip">Skip: not a playbook setup</button>${coachOK() ? `<button class="btn coachask" id="askt">✦ Ask Quint about this setup</button>` : ""}
    <p class="risk" style="margin:0">Fees eat ${(fees / (risk * pl.rr) * 100).toFixed(1)}% of a full win. The trade runs until the stop or target is hit.</p></div>`;
  $("#buy").onclick = () => decide(1); $("#sell").onclick = () => decide(-1); $("#skip").onclick = () => decide(0);
  $$("#prisk .chip").forEach(b => b.onclick = () => { G.plan.risk = ST.riskPct = +b.dataset.v; save(); renderTradePB(); }); bindAskTicket();
  renderMini();
}
/* ----- review & strategy journal ----- */
function pbFinish() {
  const pb = G.pb, ev = pb.ev, st = STAGES[pb.stage], items = hasCheck() ? checkItems() : [], stake = st.stake;
  const res = { rows: [], cash: 0, score: 0, n: 0 };
  const lq = G.qs.find(q => q.key === "loc"), locOK = !!(lq && lq.score === 1), sq = G.qs.find(q => q.key === "state");
  if (sq) { res.rows.push(["state", REGIMES[sq.correct], sq.chosen ? REGIMES[sq.chosen] : "—", sq.score === 1]); res.n++; if (sq.score === 1) res.score++; ST.pb.states[0]++; if (sq.score === 1) ST.pb.states[1]++; }
  const optS = k => { const o = lq && lq.opts.find(x => x.k === k); return o ? o.s : "—"; };
  res.rows.push(["loc", ev.poi ? ev.poi.kind : "None", lq && lq.chosen ? optS(lq.chosen) : "—", locOK]); res.n++; if (locOK) res.score++; pbRule("loc", locOK);
  for (const r of items) {
    const truth = ev[r] === true, you = pb.checks[r], ok = you === truth;
    res.rows.push([r, truth ? "Yes" : "No", you == null ? "—" : you ? "Yes" : "No", ok]); res.n++; if (ok) res.score++; pbRule(r, ok);
    res.cash += ok ? Math.round(stake / 2) : -Math.round(stake / 2);
  }
  const want = pb.valid ? ev.bias : 0, decOK = G.dir === want; res.n++; if (decOK) res.score++;
  res.cash += decOK ? stake : -stake;
  const youLoc = lq && lq.chosen && lq.chosen !== "none" ? (ev.live.find(p => p.id === lq.chosen) || {}).side || 0 : 0;
  const ownAll = items.every(r => pb.checks[r] === true);
  const disciplined = G.dir === 0 ? true : youLoc === G.dir && ownAll;
  ST.pb.items += items.length; ST.pb.itemsC += res.rows.filter(x => items.includes(x[0]) && x[3]).length; ST.pb.dec++; if (decOK) ST.pb.decC++; ST.pb.disc++; if (disciplined) ST.pb.discC++;
  if (st.mgmt && pb.mg) { ST.pb.mg++; if (pb.mg.ok) ST.pb.mgC++; }
  const P = G.pos, A = G.Sv.atr[G.t], pl = planFor(ev.d), hyp = simTicks(ev.d, pl.sd / A, pl.rr, A);
  if (P) { const bucket = pb.valid && G.dir === ev.bias ? ST.pb.on : ST.pb.off; bucket[0]++; if (P.R > 0) bucket[1]++; bucket[2] += P.R; }
  else if (pb.valid) { ST.pb.missed[0]++; ST.pb.missed[1] += hyp.R; } else if (ev.loc) { ST.pb.avoided[0]++; ST.pb.avoided[1] += hyp.R; }
  Object.assign(res, { hyp, decOK, want, disciplined, round: res.score / res.n });
  ST.pb.rounds++; ST.pb.hist.push(Math.round(res.round * 100) / 100); if (ST.pb.hist.length > 20) ST.pb.hist.shift();
  const last = ST.pb.hist.slice(-GATE.n), avg = last.reduce((a, b) => a + b, 0) / (last.length || 1);
  res.stageUp = ST.pb.stage < STAGES.length - 1 && last.length >= GATE.n && avg >= GATE.acc; if (res.stageUp) { ST.pb.stage++; ST.pb.hist = []; }
  if (res.cash) bank(res.cash, "reads");
  recordSkill("trading", decOK ? 1 : 0);
  save(); G.pbRes = res;
  if (res.stageUp) { const s = STAGES[ST.pb.stage], d = document.createElement("div"); d.className = "rankup"; d.innerHTML = `<small>Pillar unlocked</small><div style="margin:6px 0"><b>Stage ${ST.pb.stage + 1} · ${esc(s.name)}</b></div><div class="small" style="max-width:280px">${esc(s.learn)}</div>`; document.body.appendChild(d); setTimeout(() => d.remove(), 5600); }
  return res;
}
function pbStatsHTML() {
  const s = ST.pb, avgR = b => b[0] ? (b[2] / b[0]) : 0, f = x => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(2) + "R", on = s.on, off = s.off;
  return `<div class="ticket" style="grid-template-columns:repeat(2,1fr)">
    <div>Playbook trades<b>${on[0]} · ${on[0] ? Math.round(on[1] / on[0] * 100) : 0}% won · <span class="${toneOf(avgR(on))}">${f(avgR(on))}</span></b></div>
    <div>Off-playbook trades<b>${off[0]} · ${off[0] ? Math.round(off[1] / off[0] * 100) : 0}% won · <span class="${toneOf(avgR(off))}">${f(avgR(off))}</span></b></div>
    <div>Valid setups skipped<b>${s.missed[0]} · would have made <span class="${toneOf(s.missed[1])}">${f(s.missed[0] ? s.missed[1] / s.missed[0] : 0)}</span></b></div>
    <div>Bad setups avoided<b>${s.avoided[0]} · would have made <span class="${toneOf(s.avoided[1])}">${f(s.avoided[0] ? s.avoided[1] / s.avoided[0] : 0)}</span></b></div>
    <div>Pillar accuracy<b>${s.items + s.dec ? Math.round((s.itemsC + s.decC) / (s.items + s.dec) * 100) : 0}%</b></div>
    <div>Market-state reads<b>${s.states[0] ? Math.round(s.states[1] / s.states[0] * 100) : 0}% of ${s.states[0]}</b></div>
    <div>Discipline<b>${s.disc ? Math.round(s.discC / s.disc * 100) : 0}%</b></div><div>Breakeven at +1R<b>${s.mg ? Math.round(s.mgC / s.mg * 100) + "%" : "—"}</b></div></div>
    <p class="small" style="margin:0">${on[0] + off[0] < 20 ? "Keep going: with fewer than 20 trades these numbers are mostly luck." : avgR(on) > avgR(off) ? `Following the playbook is beating breaking it by ${(avgR(on) - avgR(off)).toFixed(2)}R per trade in your sample.` : "In your sample, breaking the rules hasn't cost you yet. Over hundreds of trades, consistency is what makes an edge measurable."} Results come from simulated intraday candles, so they train your process; they don't prove the strategy makes money.</p>`;
}
function pbReviewHTML() {
  const r = G.pbRes, pb = G.pb, ev = pb.ev, stg = STAGES[pbStage()];
  const dv = r.decOK ? (r.want ? `✓ Valid ${dirName(r.want).toLowerCase()} setup, and you took it` : "✓ Not a playbook setup, and you stayed out") : r.want ? (G.dir === 0 ? `✕ Valid ${dirName(r.want).toLowerCase()} setup, but you skipped it${pb.hesitated ? " (timer ran out)" : ""}` : "✕ Valid setup, but you traded the wrong way") : "✕ Not a playbook setup, but you traded it";
  const nm = k => k === "state" ? "Market state" : `${["loc", "sweep", "cisd", "disp", "exec"].indexOf(k) + 1} · ${PILLARS[k]}`;
  const rows = r.rows.map(([k, truth, you, ok]) => `<tr><td>${esc(nm(k))}</td><td>${esc(truth)}</td><td>${esc(you)}</td><td class="${ok ? "pos" : "neg"}">${ok ? "✓" : "✕"}</td></tr>`).join("");
  const det = checkItems().filter(() => hasCheck()).map(k => { const ok = (r.rows.find(x => x[0] === k) || [])[3]; return `<details><summary><span class="ic ${ok ? "g" : "b"}">${ok ? "✓" : "✕"}</span><span><b>${PILLARS[k]}</b> · ${ev[k] ? "met" : "not met"}</span></summary><div>${ruleReport(k)}</div></details>`; }).join("");
  const last = ST.pb.hist.slice(-GATE.n), avg = last.length ? last.reduce((a, b) => a + b, 0) / last.length : 0;
  return `<div class="sec"><h3>Playbook review · stage ${pb.stage + 1}</h3>
    <div class="verdicts"><span class="vd ${r.decOK ? "good" : "bad"}">${dv}</span>${G.dir ? `<span class="vd ${r.disciplined ? "good" : "bad"}">${r.disciplined ? "✓ Consistent with your own read" : "✕ Traded against your own read"}</span>` : ""}${pb.mg ? `<span class="vd ${pb.mg.ok ? "good" : "bad"}">${pb.mg.ok ? "✓ Stop moved to breakeven at +1R" : "✕ Didn't move the stop to breakeven"}</span>` : ""}</div>
    <table class="atable chkt"><thead><tr><td>Pillar</td><td>Market</td><td>You</td><td></td></tr></thead><tbody>${rows}<tr><td>Decision</td><td>${r.want ? "Take " + dirName(r.want) : "Skip"}</td><td>${G.dir ? (G.dir > 0 ? "BUY" : "SELL") : "Skip"}</td><td class="${r.decOK ? "pos" : "neg"}">${r.decOK ? "✓" : "✕"}</td></tr></tbody></table>
    ${det ? `<div class="recap">${det}</div>` : ""}
    <p class="small" style="margin:0">Pillars and decision: <b class="${toneOf(r.cash)}">${fusd(r.cash)}</b> · round score ${Math.round(r.round * 100)}%. ${!G.dir && ev.loc ? `The playbook plan would have ${r.hyp.R >= 0 ? "made" : "lost"} ${Math.abs(r.hyp.R).toFixed(2)}R.` : ""}</p>
    <div class="tierbox"><b>${r.stageUp ? `New pillar unlocked! Stage ${pbStage() + 1}: ${esc(stg.name)}` : `Stage ${pbStage() + 1} of ${STAGES.length} · ${esc(stg.name)}`}</b><span class="small">${pbStage() < STAGES.length - 1 ? (r.stageUp ? esc(stg.learn) : `To unlock the next pillar: average ${Math.round(GATE.acc * 100)}% over your last ${GATE.n} rounds in this stage (now ${Math.round(avg * 100)}% over ${last.length}).`) : "Final stage: keep your accuracy high while your journal builds a real sample."}</span><div class="prog" style="height:5px"><i style="width:${pbStage() < STAGES.length - 1 ? Math.min(100, last.length / GATE.n * 100 * Math.min(1, avg / GATE.acc)) : 100}%"></i></div></div></div>
    <div class="sec"><h3>Your strategy journal</h3>${pbStatsHTML()}</div>`;
}
function ruleReport(k) {
  const ev = G.pb.ev, I = G.I, S = G.Sv, t = G.t, d = ev.d, A = ev.A, s = ev.s;
  if (k === "sweep") { const w = ev.sw; return report({ kpis: [["Liquidity", w.levelKind], ["Level", fp(I, w.lvl)], [d > 0 ? "Sweep low" : "Sweep high", fp(I, d > 0 ? S.l[s] : S.h[s])], ["Took it", w.took ? "Yes" : "No", w.took ? "pos" : "neg"], ["Rejected", w.rej ? "Yes" : "No", w.rej ? "pos" : "neg"]],
    why: w.took ? (w.rej ? `At ${whenOf(S, s)} price ran ${d > 0 ? "below" : "above"} ${w.levelKind} (${fp(I, w.lvl)}), triggering the stops resting there, then closed back ${d > 0 ? "above" : "below"} it. Those stop orders gave bigger players the liquidity to fill in the opposite direction.` : `Price went ${d > 0 ? "below" : "above"} ${fp(I, w.lvl)} but didn't close back inside: that's a breakout, not a sweep.`) : `Price didn't take out ${w.levelKind} at ${fp(I, w.lvl)}. Without a sweep, the liquidity is still sitting there and price may come back for it.`,
    use: "A sweep with a fast rejection is the footprint of a stop run. The wick beyond the level is where your stop goes." }); }
  if (k === "cisd") { const x = ev.ci; return report({ kpis: [["CISD level", x.lvl != null ? fp(I, x.lvl) : "—"], ["Delivery run", x.lvl != null ? `${Math.max(1, x.r1 - x.r0 + 1)} candle${x.r1 - x.r0 ? "s" : ""}` : "none"], ["Closed through", x.i > 0 ? whenOf(S, x.i) : "Not yet", x.i > 0 ? "pos" : "neg"]],
    why: x.lvl == null ? `There was no clear run of ${d > 0 ? "red" : "green"} candles delivering price into the sweep, so there's no level to shift through.` : x.i > 0 ? `The ${d > 0 ? "red" : "green"} candles that pushed price into the sweep opened at ${fp(I, x.lvl)} at most. At ${whenOf(S, x.i)} a candle closed ${d > 0 ? "above" : "below"} it: price is now delivering the other way.` : `Price hasn't closed ${d > 0 ? "above" : "below"} ${fp(I, x.lvl)}, the open of the candles that delivered it into the sweep. Until it does, the old delivery is still in charge.`,
    use: "The change in state of delivery is the first objective sign the sweep worked. It turns 'it bounced' into 'the order flow flipped'." }); }
  if (k === "disp") { const x = ev.dp; return report({ kpis: [["Displacement candle", x.i > 0 ? whenOf(S, x.i) : "None", x.i > 0 ? "pos" : "neg"], ["Body", x.i > 0 ? `${x.body.toFixed(1)}× ATR` : "—"], ["Left an FVG", x.fvg ? "Yes" : "No"]],
    why: x.i > 0 ? `At ${whenOf(S, x.i)} a ${d > 0 ? "green" : "red"} candle with a ${x.body.toFixed(1)}× ATR body closed near its ${d > 0 ? "high" : "low"}${x.fvg ? ", leaving a fair value gap behind it" : ""}. That's real force behind the new direction.` : `Since the sweep, no candle has had a body of at least 1.2× ATR closing near its ${d > 0 ? "high" : "low"}. The reaction is weak, so it may only be a pause.`,
    use: "Displacement separates real reversals from dead-cat bounces. It also creates the internal FVG or order block you'll use to enter." }); }
  const x = ev.ex;
  return report({ kpis: [["Entry zone", x.z ? `${x.z.kind}` : "None"], ["Zone", x.z ? (x.z.lo === x.z.hi ? fp(I, x.z.lo) : `${fnum(I, x.z.lo)}–${fnum(I, x.z.hi)}`) : "—"], ["Confirmation", x.conf ? "Yes" : "No", x.conf ? "pos" : "neg"], ["Stop", fp(I, x.stop)], ["Risk", `${(x.risk / A).toFixed(2)}× ATR`, x.risk >= 0.3 * A && x.risk <= 5 * A ? "pos" : "neg"], ["Target", fp(I, x.tgt)], ["Reward : risk", `${x.rr.toFixed(1)} : 1`, x.rr >= 1.5 ? "pos" : "neg"], ["Volume", x.volUp ? "Rising" : "Normal"]],
    why: [!x.z ? "There's no displacement yet, so no internal entry zone exists." : x.broke ? `Price already closed through the ${x.z.kind}, so the zone failed.` : x.conf ? `The last candle dipped into the ${x.z.kind} and closed ${d > 0 ? "green" : "red"}: the internal confirmation to enter.` : `The last candle didn't pull back into the ${x.z.kind} with a ${d > 0 ? "green" : "red"} close. Waiting for that pullback gives a better price and a tighter stop.`, `Stop beyond the sweep at ${fp(I, x.stop)}; target the other side of the range at ${fp(I, x.tgt)}: ${x.rr.toFixed(1)}R. ${x.rr >= 1.5 ? "Enough reward." : "Not enough reward for the risk: skip."}${x.volUp ? " Volume is rising into the entry, which adds confidence." : ""}`],
    use: "Execution is where most traders fail: chasing the displacement candle instead of waiting for the pullback, or taking trades with no room to the target." });
}
function pbMarks() {
  const ev = G.pb.ev, S = G.Sv, t = G.t, I = G.I, d = ev.d, out = [], R = G.pb.rules;
  if (!ev.loc) return out;
  if (R.includes("sweep") && ev.sw) out.push({ type: "level", p: ev.sw.lvl, t0: S.ts[Math.max(0, ev.s - 12)], color: C.amber, label: `liquidity ${fnum(I, ev.sw.lvl)}`, below: d > 0, dash: [2, 3] });
  if (R.includes("cisd") && ev.ci && ev.ci.lvl != null) out.push({ type: "level", p: ev.ci.lvl, t0: S.ts[Math.max(0, ev.ci.r0)], color: "#9aa4bb", label: ev.cisd ? "CISD ✓" : "CISD level", below: d < 0, dash: [6, 3] });
  if (R.includes("disp") && ev.dp && ev.dp.i > 0) out.push({ type: "box", t0: S.ts[ev.dp.i], t1: S.te[ev.dp.i], color: d > 0 ? C.up : C.down, label: "displacement" });
  if (R.includes("exec") && ev.ex) { if (ev.ex.z) out.push({ type: "zone", lo: ev.ex.z.lo, hi: ev.ex.z.hi, t0: ev.ex.z.t0, color: d > 0 ? C.up : C.down, label: `entry ${ev.ex.z.kind.split(" (")[0]}` }); out.push({ type: "level", p: ev.ex.tgt, t0: S.ts[Math.max(0, ev.a - 20)], color: C.up, label: "other side of range", below: d < 0, dash: [4, 4] }); }
  return out;
}
const stateSVG = k => {
  const P = { trend: "8,92 40,74 50,78 82,52 92,56 128,26 138,30 170,8", upch: "8,90 34,64 52,82 82,52 100,70 130,40 148,58 172,28", dnch: "8,20 34,46 52,28 82,58 100,40 130,70 148,52 172,82", range: "8,60 30,28 52,86 76,30 98,84 122,28 146,86 170,56", transition: "8,88 40,50 70,22 96,40 118,30 140,62 160,54 176,84" }[k];
  const extra = k === "upch" ? `<line x1="8" y1="70" x2="172" y2="10" stroke="${C.line2}" stroke-dasharray="4 4"/><line x1="8" y1="100" x2="172" y2="40" stroke="${C.line2}" stroke-dasharray="4 4"/>` : k === "dnch" ? `<line x1="8" y1="10" x2="172" y2="70" stroke="${C.line2}" stroke-dasharray="4 4"/><line x1="8" y1="40" x2="172" y2="100" stroke="${C.line2}" stroke-dasharray="4 4"/>` : k === "range" ? `<line x1="0" y1="26" x2="180" y2="26" stroke="${C.down}" stroke-dasharray="4 4"/><line x1="0" y1="88" x2="180" y2="88" stroke="${C.up}" stroke-dasharray="4 4"/>` : "";
  return `<figure><svg width="180" height="104" viewBox="0 0 180 104" aria-hidden="true">${extra}<polyline points="${P}" fill="none" stroke="${C.ink}" stroke-width="2"/></svg><figcaption>${REGIMES[k]}</figcaption></figure>`;
};
const modelSVG = () => `<figure><svg width="300" height="150" viewBox="0 0 300 150" aria-hidden="true">
  <rect x="0" y="104" width="300" height="18" fill="rgba(38,166,154,.16)" stroke="${C.up}" stroke-dasharray="3 3"/><text x="6" y="117" font-size="10" fill="${C.ink}" font-family="system-ui">1 · HTF point of interest</text>
  <polyline points="10,20 40,40 60,34 90,70 110,62 130,96 140,118 150,92 165,98 178,70 200,40 215,52 228,58 245,30 270,14" fill="none" stroke="${C.ink}" stroke-width="2"/>
  <circle cx="140" cy="118" r="4" fill="${C.amber}"/><text x="146" y="138" font-size="10" fill="${C.amber}" font-family="system-ui">2 · sweep</text>
  <line x1="110" y1="62" x2="210" y2="62" stroke="#9aa4bb" stroke-dasharray="5 3"/><text x="214" y="66" font-size="10" fill="#9aa4bb" font-family="system-ui">3 · CISD</text>
  <rect x="174" y="40" width="10" height="32" fill="${C.up}"/><text x="150" y="34" font-size="10" fill="${C.up}" font-family="system-ui">4 · displacement</text>
  <circle cx="228" cy="58" r="4" fill="${C.acc}"/><text x="234" y="84" font-size="10" fill="${C.acc}" font-family="system-ui">5 · entry on pullback</text>
  <line x1="0" y1="14" x2="300" y2="14" stroke="${C.up}" stroke-dasharray="4 4"/><text x="200" y="10" font-size="10" fill="${C.up}" font-family="system-ui">target: other side</text></svg></figure>`;
function openPlaybook() {
  const s = ST.pb, acc = k => { const r = s.rule[k]; return r && r[0] ? `${Math.round(r[1] / r[0] * 100)}% of ${r[0]}` : "not tried yet"; };
  openSheet(`${shead("The Playbook")}
    <p>One model, learned properly: <b>five pillars</b>, read in order, on 1–15 minute charts. Every pillar is defined mechanically, precise enough to code into a bot and test on real data.</p>
    <div class="fig">${modelSVG()}</div>
    <div class="tierbox"><b>You're on stage ${pbStage() + 1} of ${STAGES.length}: ${esc(STAGES[pbStage()].name)}</b><span class="small">${esc(STAGES[pbStage()].learn)}</span></div>
    <h3>First: the five ways the market moves</h3><div class="fig">${["trend", "upch", "dnch", "range", "transition"].map(stateSVG).join("")}</div>
    <table class="atable"><tbody>${["trend", "upch", "dnch", "range", "transition"].map(k => `<tr><td>${REGIMES[k]}</td><td>${esc(STATE_DEF[k])} <span class="small">${esc(REGIME_USE[k])}</span></td></tr>`).join("")}</tbody></table>
    <p class="small">Your market-state accuracy: ${s.states[0] ? Math.round(s.states[1] / s.states[0] * 100) + "% of " + s.states[0] : "not tried yet"}.</p>
    <h3>The five pillars (long; short is the mirror image)</h3>
    <table class="atable"><tbody>
      <tr><td>1 · Location</td><td>Price trades into a fresh higher-timeframe point of interest: previous day high/low, a daily, 4h or 1h fair value gap, or a 4h/1h order block. <span class="small">Your accuracy: ${acc("loc")}</span></td></tr>
      <tr><td>2 · Liquidity sweep</td><td>At the level, price runs below the recent lows (or the PDL), taking the stops resting there, then closes back above within one candle. <span class="small">${acc("sweep")}</span></td></tr>
      <tr><td>3 · Change in state of delivery</td><td>A candle closes above the open of the run of red candles that delivered price into the sweep: order flow has flipped. <span class="small">${acc("cisd")}</span></td></tr>
      <tr><td>4 · Displacement</td><td>A strong green candle (body ≥ 1.2× ATR, closing in its top 30%), ideally leaving a fair value gap. <span class="small">${acc("disp")}</span></td></tr>
      <tr><td>5 · Execution</td><td>Enter when price pulls back into the new FVG or order block (or retests the CISD level) and closes green; rising volume is a bonus. Stop beyond the sweep; target the other side of the range, at least 1.5R; breakeven at +1R. <span class="small">${acc("exec")}</span></td></tr>
    </tbody></table>
    <h3>How you'll improve</h3><ol style="padding-left:18px;margin:0">${STAGES.map((x, i) => `<li style="margin-bottom:4px">${i <= pbStage() ? "<b>" : ""}${esc(x.name)}${i <= pbStage() ? "</b>" : ""}: <span class="small">${esc(x.learn)}</span></li>`).join("")}</ol>
    <p class="small">Each stage unlocks when you average ${Math.round(GATE.acc * 100)}% over ${GATE.n} rounds. Rounds mix complete setups, near-misses and charts with no location, because skipping bad trades is half the skill.</p>
    <h3>Your strategy journal</h3>${pbStatsHTML()}
    <p class="small">Daily FVGs and the previous day's high and low come from real daily data. 4h and 1h FVGs and order blocks, and every 1–15 minute candle, come from the simulated intraday data. The model trains a repeatable process. Whether it makes money can only be shown by testing these exact rules on real intraday data, then paper trading.</p>
    <div class="row" style="margin-top:10px"><button class="btn pri" id="done">Back to the chart</button></div>`, sh => $("#done", sh).onclick = closeSheet);
}
