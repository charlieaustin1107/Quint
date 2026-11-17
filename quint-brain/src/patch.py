# Adapt Quint's brain (extracted from Chart Wizard) to the standalone Quint app.
import re
import os
HERE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(HERE, 'brain_raw.js')).read()

def rep(a, b, cnt=1):
    global s
    c = s.count(a)
    assert c == cnt, (a[:90], c)
    s = s.replace(a, b)

# who and where he is
rep("You are Quint, the trading mentor and analyst built into Chart Wizard (you run on Claude, made by Anthropic). You sit next to the user's live chart. They can ask you anything: a trade call, levels, news, how something works, a strategy to test, Pine Script code.",
    "You are Quint, a trading intelligence in your own app, Quint (you run on Claude, made by Anthropic). The app shows the user a live instrument panel for one market beside your chat: a price tape with the session's key levels, a signal matrix across timeframes and your record. They can ask you anything: a trade call, levels, news, how something works, a strategy to test, Pine Script code.")
rep("They trade from an iPhone and place real trades on NinjaTrader; in this app they paper trade.",
    "They trade from an iPhone and place real trades on NinjaTrader. This app doesn't place orders: when they tell you they took one of your calls, the brief shows it as their open position.")
rep("WHERE THEY ARE: the brief says whether they're looking at the chart or chatting in your own screen. Off the chart, draw_levels still saves the lines for when they open it.",
    "THE PANEL: lines you draw with draw_levels appear on the price tape beside your chat straight away.")
rep("DRAWING: when you name key levels or make a call, draw them on the chart with draw_levels (up to 6, short labels).",
    "DRAWING: when you name key levels or make a call, draw them on the price tape with draw_levels (up to 6, short labels).")

# the brief: what the user is looking at, their position and their account
rep("""  L.push(`USER'S CHART: ${dkOnChart(m) ? `they're looking at the ${TF_NAME[HC.tf] || "daily"} chart` : "they're in your chat screen, not looking at a chart right now"}${""",
    """  L.push(`USER'S PANEL: the price tape and the signal matrix (no picture is sent; work from the numbers)${""")
i = s.index("  if (m.trade) { const room = typeof roomLeft")
j = s.index("\n", i)
s = s[:i] + """  { const A = qaAcct(); L.push(`ACCOUNT: ${A.name}, size ${fbal(A.size)}, risk per trade ${A.pct}% = ${fbal(A.risk)}. Size every call in ${S.micro || S.sym} contracts from that risk and the stop distance, after about $1.50 a contract in fees.`); }""" + s[j:]
rep('L.push(P ? `OPEN POSITION: ', 'L.push(P ? `OPEN POSITION (the user says they took your call): ')
rep('` : "OPEN POSITION: none in this market.");', '` : "OPEN POSITION: none that the user has told you about in this market.");')

# structured session levels for the price tape
rep("""  const last = B15.c[N - 1], vw = v > 0 ? p / v : null, rel = x =>""",
    """  const last = B15.c[N - 1], vw = v > 0 ? p / v : null; DK.lv = { at: Date.now(), so, sh: sh > -Infinity ? sh : null, sl: sl < Infinity ? sl : null, oh: oh > -Infinity ? oh : null, ol: ol < Infinity ? ol : null, ro, rh: ro != null ? rh : null, rl: ro != null ? rl : null, orh: orn >= 3 ? orh : null, orl: orn >= 3 ? orl : null, vw, pvh: pv.c != null ? pv.h : null, pvl: pv.c != null ? pv.l : null, pvc: pv.c, full }; const rel = x =>""")

# model routing, as the user asked: Fable for trade decisions and analysis, Opus for simple questions
rep('signal: ctl.signal, model: "claude-fable-5-2", modelTier: "complex", effort: "high", cache: false }',
    'signal: ctl.signal, cache: false }, qaModel(text, !!img)')

# alerts come from Quint, not Chart Wizard
rep("Check the live chart before you act. (Quint, Chart Wizard)", "Check the live chart before you act. (Quint)")
rep('return { ok: false, msg: "Phone alerts work on the TradingView futures in this app." };', 'return { ok: false, msg: "Phone alerts work on TradingView futures only." };')
rep('hmToast("Quint isn\'t available in this view.")', 'hmToast("Quint needs Claude: open this app inside Claude to talk to him.")')
s = s.replace("// Made by Quint's backtest loop in Chart Wizard.", "// Made by Quint.")

# the brief's progress drives the five lights of the core
rep("async function dkBars(sym, tf, count, signal, ttl0) {", "async function dkBars(sym, tf, count, signal, ttl0) { qaLight(sym, tf, 1);")
rep("if (c && Date.now() - c.at < ttl) return c.B;", "if (c && Date.now() - c.at < ttl) { qaLight(sym, tf, 2); return c.B; }")
rep("dkMerge(O, B, count); c.at = Date.now(); return O; }", "dkMerge(O, B, count); c.at = Date.now(); qaLight(sym, tf, 2); return O; }")
rep("  DK.bars[key] = { B, at: Date.now() }; return B;", "  DK.bars[key] = { B, at: Date.now() }; qaLight(sym, tf, 2); return B;")
rep("DK.bars[key] = { B, at: F.at }; return B; }", "DK.bars[key] = { B, at: F.at }; qaLight(sym, tf, 2); return B; }")
rep("async function dkEvents() {", "async function dkEvents() { qaLight(null, 'news', 1); try { return await dkEvents0(); } finally { qaLight(null, 'news', 2); } }\nasync function dkEvents0() {")

open(os.path.join(HERE, 'brain.js'), 'w').write(s)
print("patched", len(s))
