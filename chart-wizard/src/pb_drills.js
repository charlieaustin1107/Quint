/* ----- extra drills for scalpers ----- */
function qVWAP(S, t) {
  if (!S.vwap || S.vwap[t] == null) return null; const A = S.atr[t], I = S.I, c = S.c[t], vw = S.vwap[t], d = (c - vw) / A;
  const k = d >= 0.5 ? "above" : d <= -0.5 ? "below" : Math.abs(d) <= 0.2 ? "at" : null; if (!k) return null;
  return { skill: "trend", kind: "mc", tag: "VWAP", needs: "vwap", title: "Where is price relative to VWAP, the amber line?", sub: "VWAP restarts at the beginning of every session.",
    opts: [{ k: "above", label: "Above VWAP: today's buyers are in control", s: "Above" }, { k: "at", label: "Right at VWAP (within 0.2× ATR)", s: "At VWAP" }, { k: "below", label: "Below VWAP: today's sellers are in control", s: "Below" }], correct: k,
    explain: () => report({ kpis: [["Price", fp(I, c)], ["VWAP", fp(I, vw)], ["Distance", `${Math.abs(d).toFixed(2)}× ATR`, toneOf(d)]],
      why: `Price is ${fp(I, Math.abs(c - vw))} ${d >= 0 ? "above" : "below"} VWAP, which is ${Math.abs(d).toFixed(2)}× the average candle.`,
      rule: "VWAP is the volume-weighted average price since the session opened: the average price everyone has paid today.",
      use: "Scalpers favour longs above VWAP and shorts below it. The first pullback to VWAP in a strong trend is a popular entry, and price far from VWAP is stretched." }),
    marks: [] };
}
function qMomo(S, t) {
  if (t < 14) return null; const A = S.atr[t], I = S.I, body = i => Math.abs(S.c[i] - S.o[i]);
  let b3 = 0, b10 = 0; for (let i = t - 2; i <= t; i++) b3 += body(i) / 3; for (let i = t - 12; i <= t - 3; i++) b10 += body(i) / 10;
  const dir = Math.sign(S.c[t] - S.o[t - 2]), same = [t - 2, t - 1, t].every(i => Math.sign(S.c[i] - S.o[i]) === dir && dir !== 0);
  const prior = (S.c[t - 3] - S.c[t - 12]) / A, r = b3 / (b10 || 1);
  const k = r >= 1.8 && same ? "accel" : r <= 0.5 && Math.abs(prior) >= 2 ? "fade" : null; if (!k) return null;
  return { skill: "candles", kind: "mc", tag: "Momentum", title: "Look at the last three candles. What is momentum doing?", sub: "Compare their bodies with the ten candles before them.",
    opts: [{ k: "accel", label: "Accelerating: bodies getting bigger in one direction", s: "Accelerating" }, { k: "fade", label: "Fading: bodies shrinking after a push", s: "Fading" }, { k: "chop", label: "Choppy: no follow-through either way", s: "Choppy" }], correct: k,
    explain: () => report({ kpis: [["Avg body, last 3", fp(I, b3)], ["Avg body, prior 10", fp(I, b10)], ["Ratio", `${r.toFixed(2)}×`, k === "accel" ? "pos" : "warn"], ["Prior push", `${Math.abs(prior).toFixed(1)}× ATR`]],
      why: k === "accel" ? `The last three bodies average ${r.toFixed(1)}× the size of the ten before, all ${dir > 0 ? "green" : "red"}. Momentum is building.` : `The last three bodies are only ${r.toFixed(2)}× the size of the ten before, after a ${Math.abs(prior).toFixed(1)}× ATR push. The move is running out of steam.`,
      use: k === "accel" ? "Scalpers join acceleration on the first small pause rather than chasing the biggest candle, and keep stops tight because accelerations end abruptly." : "Fading momentum near a level is a cue to take profits, tighten the stop, or watch for a reversal trigger." }),
    marks: [{ type: "box", t0: S.ts[t - 2], t1: S.te[t], color: k === "accel" ? (dir > 0 ? C.up : C.down) : C.amber, label: k === "accel" ? "accelerating" : "fading" }] };
}
function qFees(S, t) {
  const I = S.I, A = S.atr[t], e = S.c[t], z = sizeFor(I, riskBudget(0.5), A), qty = z.qty, risk = qty * I.pv * A, fees = feeFor(I, qty, e), reward = 1.5 * risk, share = fees / reward;
  const k = share < 0.03 ? "low" : share >= 0.04 && share <= 0.12 ? "mid" : share > 0.15 ? "high" : null; if (!k) return null;
  const notional = qty * e * I.pv;
  return { skill: "risk", kind: "mc", tag: "Costs", title: `Scalp plan: risk ${fbal(risk)} with a 1× ATR stop and a 1.5R target. How much of the profit would fees eat?`, sub: `ATR here is ${fp(I, A)}. Fees: ${I.sym === "BTC" ? "0.02% of the position value per side" : `$4.50 per mini (${I.sym}) and $1.24 per micro (${I.micro}), round trip`}. The size would be ${sizeText(I, qty)}.`,
    opts: [{ k: "low", label: "Under 3%", s: "Under 3%" }, { k: "mid", label: "Roughly 4–12%", s: "4–12%" }, { k: "high", label: "More than 15%", s: "Over 15%" }], correct: k,
    explain: () => report({ kpis: [["Position", sizeText(I, qty)], ["Position value", fbal(notional)], ["Leverage", `${(notional / ST.bal).toFixed(1)}×`, notional / ST.bal > 10 ? "warn" : ""], ["Fees", `$${fees.toFixed(2)}`], ["Target profit", fbal(reward)], ["Fees ÷ profit", `${(share * 100).toFixed(1)}%`, k === "low" ? "pos" : "neg"]],
      why: `A 1× ATR stop is only ${fp(I, A)} away, so risking ${fbal(risk)} needs a position worth ${fbal(notional)}. Fees on that are $${fees.toFixed(2)}, which is ${(share * 100).toFixed(1)}% of a ${fbal(reward)} win.`,
      warn: "Tighter stops mean bigger positions, and bigger positions mean bigger fees for the same dollar risk. Real scalpers also pay the spread and slippage.",
      use: "Costs are why most scalpers fail: a small edge disappears under fees. Fewer, better trades beat many marginal ones." }), marks: [] };
}

