import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
import asyncio, json, re, datetime, sys
from playwright.async_api import async_playwright
MOCK = re.search(r'MOCK = r"""(.*?)"""', open(CW + '/t/news.py').read(), re.S).group(1)
a = "const answer = (tool, input) => { C.n++; C.by[tool] = (C.by[tool] || 0) + 1;"
assert a in MOCK
MOCK = MOCK.replace(a, "const answer = (tool, input) => { if (/^mcp-tv-/.test(tool)) { window.__tvCalls = (window.__tvCalls || 0) + 1; (window.__tvBy = window.__tvBy || {})[tool] = (window.__tvBy[tool] || 0) + 1; if (window.__tvDown) throw { code: 'server_not_connected', message: 'no tv' }; return { payload: window.__tv(tool, input) }; } C.n++; C.by[tool] = (C.by[tool] || 0) + 1;")
b = 'const full = /LEAN: </.test(window.__samplePrompt)'
assert b in MOCK
MOCK = MOCK.replace(b, '''window.__sampleLog = (window.__sampleLog || []).concat([{ tier: opts.modelTier, model: opts.model, img: (opts.images || []).length, len: window.__samplePrompt.length }]); const full = /JSON only/.test(window.__samplePrompt) && window.__planOrb ? '{"families":["orb"],"dir":"both","seeds":[{"f":"orb","or":15,"cut":120,"mid":0,"tgt":2,"dir":"both"}],"note":"The opening range breakout."}' : /JSON only/.test(window.__samplePrompt) ? '{"families":["pullback","sweep"],"dir":"both","seeds":[{"f":"pullback","fast":20,"slow":50,"stop":1.5,"tgt":2,"hold":20,"dir":"both"}],"note":"Pullbacks to the 20 EMA in the direction of the trend."}' : /PRICE: 27354/.test(window.__samplePrompt) ? "LEAN: BUY for MNQ · confidence low\\n### What I can see\\nMNQ 1m, last 28346.75, long 1 from 28394.25.\\n### The plan\\nHold above 28327.\\nPRICE: 28346.75 MNQ" : /LEAN: </.test(window.__samplePrompt)''')
TV = r"""window.__tvFast = window.__tvFast !== false; 
(() => {
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const MIN = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "1D": 86400 };
  const mk = (iv, n) => { seed = 7 + n + MIN[iv]; const t = [], o = [], h = [], l = [], c = [], v = []; let p = 27000, drift = 0; const end = Math.floor(Date.now() / 1000 / MIN[iv]) * MIN[iv], vol = iv === "1D" ? 300 : iv === "1h" ? 80 : iv === "15m" ? 40 : iv === "5m" ? 22 : 10;
    for (let i = 0; i < n; i++) { if (i % 90 === 0) drift = (rnd() - 0.5) * vol * 0.25; const op = p, cl = op + drift + (rnd() - 0.5) * vol, hi = Math.max(op, cl) + rnd() * vol * 0.4, lo = Math.min(op, cl) - rnd() * vol * 0.4; t.push(end - (n - 1 - i) * MIN[iv]); o.push(+op.toFixed(2)); h.push(+hi.toFixed(2)); l.push(+lo.toFixed(2)); c.push(+cl.toFixed(2)); v.push(1000 + Math.floor(rnd() * 3000)); p = cl; }
    if (iv === "1D") { for (let i = 0; i < n; i++) t[i] = 1794783600 - (n - 1 - i) * 86400; }
    return { t, o, h, l, c, v }; };
  window.__tv = (tool, input) => {
    if (tool === "mcp-tv-get-symbol-data") return { success: true, data: { close: window.__mnq || 27347.25, change: -2.45, change_abs: -687.5, high: 28279, low: 27235, open: 28059.5, volume: 3268516, update_mode: "delayed_streaming_600", price_52_week_high: 31616.5, price_52_week_low: 22960.5, SMA50: 29647.31, SMA200: 28182.6 } };
    if (tool === "mcp-tv-get-ohlcv") return { success: true, bars: mk(input.interval, Math.min(input.count || 300, input.interval === "1D" ? 420 : 5000)) };
    if (tool === "mcp-tv-get-symbol-data-batch") { const d = {}; input.symbols.forEach((s, i) => { d[s] = { close: 100 + i * 37.5, change: (i % 3 - 1) * 1.37, update_mode: "streaming" }; }); return { success: true, data: d }; }
    if (tool === "mcp-tv-get-economic-calendar") return { status: "ok", result: [{ date: new Date(Date.now() + 2 * 36e5).toISOString(), title: "Retail Sales MoM", importance: 1, forecast: 0.2, previous: 0.8, actual: null, unit: "%", period: "Oct. 2026" }, { date: new Date(Date.now() + 26 * 36e5).toISOString(), title: "Housing Starts", importance: 0, forecast: 1.245, previous: 1.221, actual: null, period: "Oct. 2026" }] };
    if (tool === "mcp-tv-get-news") return { success: true, data: { headlines: [{ title: "Nasdaq 100 futures fall as chip stocks slide <b>x</b>", published: Math.floor(Date.now() / 1000) - 900, provider: { name: "Reuters" }, link: "https://www.tradingview.com/news/x/", urgency: 1 }, { title: "Treasury yields rebound", published: Math.floor(Date.now() / 1000) - 7200, provider: { name: "Benzinga" }, link: "javascript:alert(1)", urgency: 2 }] } };
    if (tool === "mcp-tv-get-earnings-calendar") return { success: true, data: { earnings: [{ name: "NVDA", release_next_at: new Date(Date.now() + 30 * 36e5).toISOString(), next_date_confirmed: true }] } };
    if (tool === "mcp-tv-create-pine-script") { window.__pine = input; return { success: true, script_id: "USER;1", name: input.name, version: "1.0" }; }
    if (tool === "mcp-tv-run-pine-backtest") { window.__bt = input; return { success: true, report: { performance: { all: { total_trades: 208, percent_profitable: 0.399, profit_factor: 1.03, net_profit: 556.5, max_drawdown: 4679.25 } }, range: { backtest: { from: "2026-09-01T03:00:00Z", to: "2026-11-16T20:15:00Z" } } } }; }
    return { success: false };
  };
})();
"""
T0 = datetime.datetime(2026, 11, 11, 15, 30, tzinfo=datetime.timezone.utc)
async def run(b, w, h, mob, tag, out):
    ctx = await b.new_context(viewport={"width": w, "height": h}, has_touch=mob, is_mobile=mob, device_scale_factor=2 if mob else 1)
    pg = await ctx.new_page(); errs = []; R = {}
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    await pg.clock.install(time=T0); await pg.clock.resume()
    await pg.add_init_script(TV); await pg.add_init_script(MOCK); await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2200)
    tap = (lambda sel: pg.tap(sel)) if mob else (lambda sel: pg.click(sel))
    ev = pg.evaluate
    await ev("__T.mkShow('home'); __T.closeSheet(); __T.ST.seenTut = true"); await pg.wait_for_timeout(1500)
    R["mnq_q"] = await ev("(q => q && [q.p, q.pct, q.pc, q.delay, q.hi, q.a50])(__T.MK.q.MNQ)")
    R["mnq_hist"] = await ev("(h => h && [h.n, h.d[h.n-1], h.d[h.n-2]])(__T.MK.h.MNQ || __T.MK.s.MNQ)")
    R["board0"] = await ev("__T.mkBoard().slice(0,3).map(m => m.k)")
    R["tile"] = await ev("(document.querySelector('#hmFut [data-key=\"MNQ\"]') || {}).innerText")
    R["card"] = await ev("(document.querySelector('#hmQT') || {}).innerText")
    R["fmp_calls"] = await ev("__T.callsToday()"); R["tv_calls"] = await ev("window.__tvCalls")
    await ev("document.querySelector('#hmQT').scrollIntoView({block:'start'})"); await pg.wait_for_timeout(200); await pg.screenshot(path=f"/tmp/q_{tag}_home.png")
    # MNQ live chart + paper trade
    await ev("__T.qtGo('mnq')"); await pg.wait_for_timeout(1200)
    R["chart"] = await ev("[__T.MK.screen, __T.MK.sel, document.querySelector('#hmChart .hctitle').innerText.replace(/\\n/g,' | '), document.querySelector('#hcPx').innerText.replace(/\\n/g,' | ')]")
    await ev("__T.ST.riskPct = 0.25"); await tap("#lvbuy"); await pg.wait_for_timeout(800)
    R["trade"] = await ev("[document.querySelector('#hmtoast').textContent, __T.lvOpenList().map(P => P.key + ' q' + P.qty + ' e' + P.e + ' s' + P.stop.toFixed(2) + ' t' + P.tgt.toFixed(2) + ' upl' + __T.lvPos && 1)]")
    R["trade2"] = await ev("__T.lvOpenList().map(P => [P.key, P.kind, P.qty, P.e, +P.stop.toFixed(2), +P.tgt.toFixed(2)])")
    await pg.screenshot(path=f"/tmp/q_{tag}_chart.png")
    await ev("window.__mnq = 27400; __T.MK.manualAt = 0; __T.mkRefresh(['MNQ'])"); await pg.wait_for_timeout(900)
    R["upl"] = await ev("(document.querySelector('#hcSide') || {}).innerText.slice(0, 220).replace(/\\n+/g,' | ')")
    await ev("__T.mkShow('home')"); await pg.wait_for_timeout(400)
    # movers
    await ev("__T.qtGo('movers')"); await pg.wait_for_timeout(1500)
    R["mv"] = await ev("[document.querySelectorAll('#mvBody .mvchip').length, document.querySelectorAll('#mvBody .mvev').length, document.querySelectorAll('#mvBody .mvnews').length, [...document.querySelectorAll('#mvBody .mvnews')].map(a => a.tagName + ':' + (a.getAttribute('href') || '')), document.querySelector('#mvBody .mvnews b').innerHTML]")
    await pg.screenshot(path=f"/tmp/q_{tag}_mv.png")
    await tap("#mvAsk"); await pg.wait_for_timeout(1500)
    R["mv_q"] = await ev("[(document.querySelector('#mvOut .lean') || {}).innerText, /HIGH importance/.test(window.__samplePrompt), /Retail Sales/.test(window.__samplePrompt), /DAY TRADES|SCALPER|DAY TRADER/.test(window.__samplePrompt), document.querySelector('#mvOut').innerText.includes('Paper trading')]")
    await ev("__T.closeSheet()")
    # practice
    await ev("__T.qtGo('prac')"); await pg.wait_for_timeout(1500)
    R["pr0"] = await ev("[__T.QT.pr.tf, __T.QT.pr.B && __T.QT.pr.B.c.length, __T.QT.pr.i, !!document.querySelector('#prGo').disabled, document.querySelector('#prCv').width > 0]")
    await pg.screenshot(path=f"/tmp/q_{tag}_pr0.png")
    await tap('#prBody [data-g="dir"][data-k="up"]'); await tap('#prBody [data-g="side"][data-k="buy"]'); await tap('#prBody [data-g="tgt"][data-k="3"]'); await pg.wait_for_timeout(150)
    await tap("#prGo"); await pg.wait_for_timeout(400)
    R["pr1"] = await ev("[document.querySelector('.prres').innerText.replace(/\\n+/g,' | '), JSON.stringify(__T.ST.mnqp), __T.QT.pr.res.mine.why, +__T.QT.pr.res.mine.r.toFixed(2)]")
    await pg.screenshot(path=f"/tmp/q_{tag}_pr1.png")
    await tap("#prWhy"); await pg.wait_for_timeout(1500)
    R["pr_why"] = await ev("[document.querySelector('#prOut').innerText.slice(0, 60), /index 0 is the decision candle/.test(window.__samplePrompt), window.__samplePrompt.length]")
    await tap("#prNext"); await pg.wait_for_timeout(300); await tap('#prBody [data-g="dir"][data-k="side"]'); await tap('#prBody [data-g="side"][data-k="out"]'); await tap("#prGo"); await pg.wait_for_timeout(300)
    R["pr2"] = await ev("[document.querySelector('.prres').innerText.replace(/\\n+/g,' | '), __T.ST.mnqp.n, __T.ST.mnqp.skips]")
    await tap('#prTf [data-k="15m"]'); await pg.wait_for_timeout(900); R["pr_tf"] = await ev("[__T.QT.pr.tf, __T.QT.pr.B.tf]")
    await ev("__T.closeSheet()")
    # backtest loop
    await ev("__T.qtGo('lab')"); await pg.wait_for_timeout(400)
    await pg.fill("#blDesc", "Buy pullbacks to the 20 EMA when the trend is up, stop 1.5 ATR, aim for 2R"); await pg.select_option("#blBud", "400")
    await pg.screenshot(path=f"/tmp/q_{tag}_bl0.png")
    await tap("#blGo"); await pg.wait_for_timeout(300); R["bl_running"] = await ev("[__T.BL.run.phase, document.querySelector('#blGo').textContent]")
    for _ in range(60):
        if await ev("__T.BL.run.phase === 'done'"): break
        await pg.wait_for_timeout(250)
    R["bl"] = await ev("(R => [R.phase, R.i, R.q.length, R.pIS, R.pBoth, R.fams, R.note, R.bars, R.ms, R.top.length, R.top[0] && [__T.blRules(R.top[0].V).slice(0, 90), R.top[0].is.n, R.top[0].os.n, +R.top[0].is.pf.toFixed(2), +R.top[0].os.pf.toFixed(2), +R.top[0].os.dd.toFixed(1), R.top[0].pass, R.top[0].luck]])(__T.BL.run)")
    R["bl_seed_first"] = await ev("JSON.stringify(__T.BL.run.q[0])")
    R["bl_dom"] = await ev("[document.querySelectorAll('.blcard').length, document.querySelector('.blnums').innerText.replace(/\\n+/g,' '), !!document.querySelector('.bleq'), document.querySelector('#blCode').textContent.slice(0, 40)]")
    await pg.screenshot(path=f"/tmp/q_{tag}_bl1.png", full_page=False)
    await ev("document.querySelector('.blcard').scrollIntoView({block:'start'})"); await pg.wait_for_timeout(200); await pg.screenshot(path=f"/tmp/q_{tag}_bl2.png")
    await tap("#blSave"); await pg.wait_for_timeout(300); R["mystrat"] = await ev("[__T.ST.mystrat.name, __T.ST.mystrat.rules.slice(0, 50), !!document.querySelector('.blmine')]")
    await tap("#blVerdict"); await pg.wait_for_timeout(1500); R["verdict"] = await ev("[document.querySelector('#blQ').innerText.slice(0, 50), /versions tested/.test(window.__samplePrompt), /Their own strategy, saved/.test(window.__samplePrompt)]")
    await ev("document.querySelector('.blpine').open = true"); await pg.wait_for_timeout(100)
    await tap("#blChk"); await pg.wait_for_timeout(600); R["chk"] = await ev("[document.querySelector('#blChkOut').innerText.replace(/\\n+/g,' | '), window.__bt.symbol, window.__bt.timeframe, /margin_long = 10/.test(window.__bt.code)]")
    await tap("#blTV"); await pg.wait_for_timeout(600); R["tv_save"] = await ev("[document.querySelector('#blTVs').textContent.slice(0, 70), window.__pine.name]")
    await ev("document.querySelector('.blpine').scrollIntoView({block:'start'})"); await pg.screenshot(path=f"/tmp/q_{tag}_bl3.png")
    # built-in data + no description + stop
    await tap('#blSrc [data-k="all"]'); await pg.fill("#blDesc", ""); await pg.select_option("#blBud", "0"); await tap("#blGo")
    for _ in range(120):
        if await ev("__T.BL.run.phase === 'done'"): break
        await pg.wait_for_timeout(250)
    R["bl_all"] = await ev("(R => [R.phase, R.i, R.q.length, R.pIS, R.pBoth, R.bars, R.ms, R.top[0] && [R.top[0].is.n, R.top[0].os.n, R.top[0].pass]])(__T.BL.run)")
    await ev("__T.closeSheet()")
    # screenshot reader
    await ev("__T.qtGo('shot')"); await pg.wait_for_timeout(300)
    await pg.set_input_files("#qtFile", CW + "/t/fixtures/chart-icon.png"); await pg.wait_for_timeout(600)
    R["shot0"] = await ev("[!!document.querySelector('#qtPrev img'), document.querySelector('#qtGo').disabled, __T.QT.shot.blob && __T.QT.shot.blob.type, __T.QT.shot.blob && __T.QT.shot.blob.size > 1000]")
    await pg.fill("#qtQ", "should I hold this long?"); await tap("#qtGo"); await pg.wait_for_timeout(1500)
    R["shot1"] = await ev("[document.querySelector('#qtOut').innerText.replace(/\\n+/g,' | ').slice(0, 200), JSON.stringify(__T.ST.mnq && __T.ST.mnq.p), window.__sampleLog.slice(-1)[0], /should I hold this long/.test(window.__samplePrompt), document.querySelector('#qtFollow').hidden, /PRICE/.test(document.querySelector('#qtOut').innerText)]")
    await pg.screenshot(path=f"/tmp/q_{tag}_shot.png")
    await pg.fill("#qtF", "where is my stop?"); await pg.press("#qtF", "Enter"); await pg.wait_for_timeout(1500)
    R["shot2"] = await ev("[__T.QT.shot.turns.length, document.querySelectorAll('#qtOut .qtans').length, (JSON.parse(window.__samplePrompt) || []).map(m => m.role).join(',')]")
    await ev("__T.closeSheet()")
    # style + risk + lessons + nav + coach routing
    await ev("__T.qtGo('style')"); await pg.wait_for_timeout(200); await tap('#tsC [data-k="day"]'); await pg.wait_for_timeout(150)
    R["style"] = await ev("[__T.ST.tstyle, document.querySelector('#tsNow').textContent, document.querySelectorAll('#sheet .qttab tr').length]"); await pg.screenshot(path=f"/tmp/q_{tag}_style.png")
    await tap("#tsP2"); await pg.wait_for_timeout(900); R["style_go"] = await ev("[__T.MK.screen, __T.ST.style, __T.ST.rpack, __T.ST.mkt]")
    await ev("__T.mkShow('home')"); await pg.wait_for_timeout(300)
    await ev("__T.qtGo('risk')"); await pg.wait_for_timeout(200); await pg.fill("#rkN", "2"); await pg.fill("#rkS", "40"); await pg.fill("#rkT", "100"); await pg.fill("#rkL", "500"); await pg.wait_for_timeout(100)
    R["risk"] = await ev("document.querySelector('#rkOut').innerText.replace(/\\n+/g,' | ')"); await ev("__T.closeSheet()")
    await ev("__T.openLearn()"); await pg.wait_for_timeout(200); R["lessons"] = await ev("[...document.querySelectorAll('#sheet .lessonbox summary')].slice(0, 3).map(x => x.textContent)"); await ev("__T.closeSheet()")
    await ev("__T.mkShow(null)"); await pg.wait_for_timeout(500); await tap("#menubtn"); await pg.wait_for_timeout(300)
    R["nav"] = await ev("[...document.querySelectorAll('#nav [data-go^=\"qt:\"]')].map(b => b.innerText.trim().split('\\n')[0])")
    await tap('#nav [data-go="qt:style"]'); await pg.wait_for_timeout(300); R["nav_go"] = await ev("document.querySelector('#sheet h2').textContent"); await ev("__T.closeSheet()")
    R["easy"] = await ev("[__T.coachEasy('What is VWAP?'), __T.coachEasy('what is this candle telling me'), __T.coachEasy('Should I buy here?'), __T.coachEasy('define slippage')]")
    R["tv_by"] = await ev("window.__tvBy"); R["fmp_calls_end"] = await ev("__T.callsToday()")
    R["errs"] = errs[:8]; out[tag] = R; await ctx.close()
async def down(b, out):  # TradingView not connected: everything else must still work
    ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.clock.install(time=T0); await pg.clock.resume()
    await pg.add_init_script("window.__tvDown = true;" + TV); await pg.add_init_script(MOCK); await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2500)
    await pg.evaluate("__T.mkShow('home'); __T.closeSheet()"); await pg.wait_for_timeout(1200)
    R = {"st": await pg.evaluate("__T.MK.st"), "btc": await pg.evaluate("!!__T.MK.q.BTC"), "es": await pg.evaluate("!!__T.MK.q.ES"), "mnq": await pg.evaluate("[!!__T.MK.q.MNQ, JSON.stringify(__T.MK.err['q:MNQ'] || __T.MK.err['s:MNQ'])]"), "tile": await pg.evaluate("(document.querySelector('#hmFut [data-key=\"MNQ\"]') || {}).innerText"), "tvcalls": await pg.evaluate("window.__tvCalls")}
    await pg.evaluate("__T.qtGo('prac')"); await pg.wait_for_timeout(700); R["prac"] = await pg.evaluate("document.querySelector('#prBody').innerText")
    await pg.evaluate("__T.closeSheet(); __T.qtGo('movers')"); await pg.wait_for_timeout(700); R["mv"] = await pg.evaluate("document.querySelector('#mvBody').innerText.slice(0, 120)")
    await pg.evaluate("__T.closeSheet(); __T.qtGo('lab')"); await pg.wait_for_timeout(300); await pg.tap("#blGo"); await pg.wait_for_timeout(700); R["lab"] = await pg.evaluate("document.querySelector('#blOut').innerText.slice(0, 160)")
    await pg.wait_for_timeout(3000); R["tvcalls_later"] = await pg.evaluate("window.__tvCalls"); R["errs"] = errs[:5]; out["down"] = R; await ctx.close()
async def main():
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"])
        which = sys.argv[1] if len(sys.argv) > 1 else "all"
        if which in ("all", "m"): await run(b, 390, 844, True, "m", out)
        if which in ("all", "d"): await run(b, 1280, 800, False, "d", out)
        if which in ("all", "down"): await down(b, out)
        await b.close()
    for k, v in out.items():
        print("=====", k)
        for kk, vv in v.items(): print(f"{kk}: {json.dumps(vv, ensure_ascii=False)[:700]}")
asyncio.run(main())
