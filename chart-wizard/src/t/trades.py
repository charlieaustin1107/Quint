import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
import asyncio, json, re, datetime
from playwright.async_api import async_playwright
MOCK = re.search(r'MOCK = r"""(.*?)"""', open(CW + '/t/news.py').read(), re.S).group(1)
old = "const quote = sym => [{ symbol: sym, name: sym, price: 100 + sym.length, change: 1.2, changePercentage: 1.1, dayLow: 99, dayHigh: 103,"
assert old in MOCK
MOCK = MOCK.replace(old, "const pxOf = sym => (window.__px && window.__px[sym] != null) ? window.__px[sym] : 100 + sym.length; const quote = sym => [{ symbol: sym, name: sym, price: pxOf(sym), change: 1.2, changePercentage: 1.1, dayLow: Math.min(99, pxOf(sym)), dayHigh: Math.max(103, pxOf(sym)),")
# futures now come from TradingView: answer its tools from the same controllable prices
a2 = "const answer = (tool, input) => { C.n++; C.by[tool] = (C.by[tool] || 0) + 1;"
assert a2 in MOCK
MOCK = MOCK.replace(a2, """const TVM = { "CME_MINI:ES1!": "ESUSD", "COMEX:GC1!": "GCUSD", "COMEX:SI1!": "SIUSD", "NYMEX:BZ1!": "BZUSD", "CME_MINI:MNQ1!": "MNQUSD" };
  const tvq = s => { const p = pxOf(TVM[s] || s); return { close: p, change: 1.1, change_abs: 1.2, high: Math.max(103, p), low: Math.min(99, p), open: p - 1, volume: 1000, update_mode: "delayed_streaming_600" }; };
  const tvAns = (tool, input) => { if (tool === "mcp-tv-get-symbol-data") return { success: true, data: tvq(input.symbol) }; if (tool === "mcp-tv-get-symbol-data-batch") { const d = {}; input.symbols.forEach(s => { d[s] = tvq(s); }); return { success: true, data: d }; }
    if (tool === "mcp-tv-get-ohlcv") { const p = pxOf(TVM[input.symbol] || input.symbol), n = Math.min(input.count || 60, 120), sec = input.interval === "1D" ? 86400 : 300, end = Math.floor(Date.now() / 1000 / sec) * sec - (input.interval === "1D" ? 86400 : 0), t = [], o = [], h = [], l = [], c = [], v = []; for (let i = 0; i < n; i++) { const x = p * (1 + Math.sin(i / 5) * 0.01); t.push(end - (n - 1 - i) * sec); o.push(x); h.push(x * 1.01); l.push(x * 0.99); c.push(x * 1.002); v.push(1000); } return { success: true, bars: { t, o, h, l, c, v } }; }
    return { success: false }; };
  const answer = (tool, input) => { if (/^mcp-tv-/.test(tool)) { window.__tvN = (window.__tvN || 0) + 1; return { payload: tvAns(tool, input) }; } C.n++; C.by[tool] = (C.by[tool] || 0) + 1;""")
T0 = datetime.datetime(2026, 11, 11, 15, 30, tzinfo=datetime.timezone.utc)  # Wednesday 10:30 New York: stocks, futures and Bitcoin all open
async def run(b, w, h, mob, tag, out):
    ctx = await b.new_context(viewport={"width": w, "height": h}, has_touch=mob, is_mobile=mob, device_scale_factor=2 if mob else 1)
    pg = await ctx.new_page(); errs = []; R = {}
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    await pg.clock.install(time=T0); await pg.clock.resume()
    await pg.add_init_script(MOCK); await pg.goto("file://" + CW + "/test.html"); await pg.wait_for_timeout(1800)
    R["now"] = await pg.evaluate("new Date().toISOString()"); R["st"] = await pg.evaluate("__T.MK.st")
    await pg.evaluate("__T.ST.riskPct = 0.25")
    tap = (lambda sel: pg.tap(sel)) if mob else (lambda sel: pg.click(sel))
    await tap('#hmTabs [data-tab="trades"]'); await pg.wait_for_timeout(400); R["hdr_btn"] = await pg.evaluate("__T.MK.screen")
    await pg.evaluate("__T.mkShow(null)"); await pg.wait_for_timeout(600); await pg.evaluate("__T.closeSheet(); __T.ST.seenTut = true"); await pg.wait_for_timeout(300)
    await tap("#menubtn"); await pg.wait_for_timeout(300)
    R["nav"] = await pg.evaluate("(document.querySelector('#nav [data-go=\"trades\"]') || {}).innerText")
    await tap('#nav [data-go="trades"]'); await pg.wait_for_timeout(500)
    R["empty"] = await pg.evaluate("[__T.MK.screen, document.querySelector('#ltOpenL').innerText.slice(0, 60)]")
    async def trade(k, side):
        await pg.evaluate(f"__T.mkShow('chart', '{k}')"); await pg.wait_for_timeout(900)
        tick = await pg.evaluate("(document.querySelector('#hcSide .q .qk') || {}).textContent")
        await tap("#lvsell" if side < 0 else "#lvbuy"); await pg.wait_for_timeout(700)
        return [tick, await pg.evaluate("document.querySelector('#hmtoast').textContent")]
    R["open_btc"] = await trade("BTC", 1); R["open_es"] = await trade("ES", -1)
    R["es_note"] = await pg.evaluate("document.querySelector('#hcSide').innerText.includes('other trade')")
    R["open_tsla"] = await trade("s:TSLA", 1)
    R["tsla_ticket_mini"] = await pg.evaluate("(document.querySelector('#hcSide .ltmini') || {}).innerText")
    R["open_aapl"] = await trade("s:AAPL", -1)
    R["open"] = await pg.evaluate("__T.lvOpenList().map(P => P.key + ':' + P.kind + ':' + (P.dir > 0 ? 'L' : 'S') + ':' + P.qty + ' e' + P.e + ' s' + P.stop.toFixed(2) + ' t' + P.tgt.toFixed(2))")
    lv = await pg.evaluate("Object.fromEntries(__T.lvOpenList().map(P => [P.key, [P.e, P.stop, P.tgt]]))")
    await pg.evaluate("__T.mkShow('home')"); await pg.wait_for_timeout(500)
    R["home_card"] = await pg.evaluate("(document.querySelector('#hmLT') || {}).innerText")
    await pg.evaluate("document.querySelector('#hmLT').scrollIntoView({block: 'center'})"); await pg.wait_for_timeout(200); await pg.screenshot(path=f"/tmp/lt_{tag}_home.png")
    await tap("#hmLT .lthome"); await pg.wait_for_timeout(500)
    R["screen"] = await pg.evaluate("[__T.MK.screen, document.querySelectorAll('#ltOpenL .ltc').length, document.querySelector('#ltTot').textContent, document.querySelector('#ltStat').innerText.replace(/\\n+/g, ' | ')]")
    await pg.screenshot(path=f"/tmp/lt_{tag}_a.png")
    before = await pg.evaluate("[...document.querySelectorAll('#ltOpenL .ltc')].map(c => c.querySelector('.ltn b').textContent.trim() + ' ' + c.querySelector('[data-f=pnl]').textContent)")
    mv = lambda k, f: round(lv[k][0] + (lv[k][2] - lv[k][0]) * f, 4) if f >= 0 else round(lv[k][0] + (lv[k][1] - lv[k][0]) * -f, 4)  # a fraction of the way to the target (f > 0) or to the stop (f < 0)
    px = {"BTCUSD": mv("BTC", 0.5), "ESUSD": mv("ES", 0.3), "TSLA": mv("s:TSLA", 0.6), "AAPL": mv("s:AAPL", -0.4)}; R["px_set"] = px
    await pg.evaluate("px => { window.__px = px; __T.MK.manualAt = 0; }", px)
    await tap("#ltRef"); await pg.wait_for_timeout(1000)
    R["pnl_before"] = before
    R["pnl_after"] = await pg.evaluate("[...document.querySelectorAll('#ltOpenL .ltc')].map(c => [c.querySelector('.ltn b').textContent.trim(), c.querySelector('[data-f=pnl]').textContent, c.querySelector('[data-f=pnl]').className, c.querySelector('[data-f=r]').textContent, c.querySelector('[data-f=px]').textContent, c.querySelector('[data-f=dot]').style.left])")
    R["tot_after"] = await pg.evaluate("[document.querySelector('#ltTot').textContent, document.querySelector('#ltTotP').textContent, document.querySelector('#ltTotS').textContent, document.querySelector('#ltSkEq').textContent]")
    await pg.screenshot(path=f"/tmp/lt_{tag}_b.png")
    # close AAPL with two taps
    aid = await pg.evaluate("__T.lvOpenList().find(P => P.key === 's:AAPL').id")
    await tap(f'[data-ltc="{aid}"]'); await pg.wait_for_timeout(250)
    R["confirm_text"] = await pg.evaluate(f"document.querySelector('[data-ltc=\"{aid}\"]').textContent")
    await tap(f'[data-ltc="{aid}"]'); await pg.wait_for_timeout(1000)
    R["after_close"] = await pg.evaluate("[__T.lvOpenList().length, (document.querySelector('#ltHist .ltrow') || {}).innerText, document.querySelector('#hmtoast').textContent]")
    # TSLA falls through its stop
    await pg.evaluate("t => { window.__px.TSLA = t; __T.MK.manualAt = 0; }", round(lv["s:TSLA"][1] - 0.5, 2)); await tap("#ltRef"); await pg.wait_for_timeout(1000)
    R["stopout"] = await pg.evaluate("[__T.lvOpenList().map(P => P.key).join(','), (document.querySelector('#ltHist .ltrow') || {}).innerText, __T.SK().bal, document.querySelector('#hmtoast').textContent]")
    for f in ("stk", "prop", "all"):
        await pg.evaluate(f"document.querySelector('[data-ltf=\"{f}\"]').click()"); await pg.wait_for_timeout(150)
        R["hist_" + f] = await pg.evaluate("[document.querySelectorAll('#ltHist .ltrow').length, (document.querySelector('#ltHist .ltstats') || document.querySelector('#ltHist .nwempty') || {}).innerText]")
    await pg.screenshot(path=f"/tmp/lt_{tag}_c.png", full_page=False)
    await pg.evaluate("document.querySelector('#hmTrades').scrollTop = 200")
    await pg.evaluate("document.querySelector('#ltOpenL .ltc [data-ltk=\"BTC\"]').click()"); await pg.wait_for_timeout(900)
    R["to_chart"] = await pg.evaluate("[__T.MK.screen, __T.MK.sel, !!document.querySelector('#hcSide .posbox'), (document.querySelector('#hcSide .ltmini') || {}).innerText]")
    await tap("#hcBack"); await pg.wait_for_timeout(500)
    R["back"] = await pg.evaluate("[__T.MK.screen, document.querySelector('#hmTrades').scrollTop]")
    for k in ("GC", "SI", "BZ"): R["open_" + k] = await trade(k, 1)
    R["open_NVDA"] = await trade("s:NVDA", 1)
    R["n_open"] = await pg.evaluate("__T.lvOpenList().length")
    await pg.evaluate("__T.mkShow('chart', 's:MSFT')"); await pg.wait_for_timeout(800)
    R["max_panel"] = await pg.evaluate("document.querySelector('#hcSide .q').innerText.slice(0, 120)")
    await pg.reload(); await pg.wait_for_timeout(1800); await pg.evaluate("__T.mkShow('trades')"); await pg.wait_for_timeout(600)
    R["after_reload"] = await pg.evaluate("[document.querySelectorAll('#ltOpenL .ltc').length, document.querySelectorAll('#ltHist .ltrow').length]")
    await pg.screenshot(path=f"/tmp/lt_{tag}_d.png")
    R["errs"] = errs[:6]; out[tag] = R; await ctx.close()
async def safe(b, w, h, mob, tag, out):
    try: await run(b, w, h, mob, tag, out)
    except Exception as e: out[tag + "_fail"] = str(e)[:600]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); out = {}
        await safe(b, 390, 844, True, "m", out); await safe(b, 1280, 800, False, "d", out)
        print(json.dumps(out, indent=1)); await b.close()
asyncio.run(main())
