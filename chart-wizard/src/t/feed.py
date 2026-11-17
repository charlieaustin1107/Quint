import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# The feed: about one TradingView call per question, every timeframe rebuilt from 1-minute candles, kept on the phone; the 5-pillar playbook card
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
TV2 = TV2.replace('update_mode: "delayed_streaming_600"', 'update_mode: "streaming"')
SPY = """(() => { window.__rtc = []; const h = setInterval(() => { const T = window.__tv; if (T && !T.__spy) { const f = T; window.__tv = (tool, input) => { window.__rtc.push([Date.now(), tool.replace('mcp-tv-', '') + (input && input.symbol ? ':' + input.symbol.split(':').pop() : '') + (input && input.interval ? ':' + input.interval : '') + (input && input.count ? ':' + input.count : '')]); return f(tool, input); }; window.__tv.__spy = 1; clearInterval(h); } }, 5); })()"""
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []; R = {}
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS, SPY): await pg.add_init_script(s)
        await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2500); ev = pg.evaluate
        await ev("__T.mkShow('home'); __T.closeSheet(); __T.ST.seenTut = true"); await pg.wait_for_timeout(2500)
        R["home_calls"] = await ev("window.__rtc.map(x => x[1])")
        R["plan"] = await ev("[__T.tvPlan(), __T.tvUsed(), __T.tvLeft(), __T.tvBgEvery()]")
        n0 = await ev("window.__rtc.length")
        await ev("__T.openQuint()"); await pg.wait_for_timeout(600)
        d0 = await ev("(window.__ds || []).length")
        await ev("__T.dkSend(\"What's your call on MNQ right now?\")")
        for _ in range(100):
            if not await ev("__T.DK.busy"): break
            await pg.wait_for_timeout(200)
        R["first_question_calls"] = await ev(f"window.__rtc.slice({n0}).map(x => x[1])")
        F = await ev("(() => { const F = __T.FD['CME_MINI:MNQ1!']; const S = k => F[k] ? [F[k].n, F[k].t.every((t, i) => !i || t > F[k].t[i - 1])] : null; return { m1: S('m1'), m5: S('m5'), d1: S('d1'), h1: __T.fdTf(F, '1h').n, m15: __T.fdTf(F, '15m').n }; })()")
        R["feed"] = F
        n1 = await ev("window.__rtc.length"); await pg.wait_for_timeout(15000)
        await ev("__T.dkSend('And the 5-pillar check?')")
        for _ in range(100):
            if not await ev("__T.DK.busy"): break
            await pg.wait_for_timeout(200)
        R["second_question_calls"] = await ev(f"window.__rtc.slice({n1}).map(x => x[1])")
        R["brief_lines"] = await ev("(window.__brief || '').split('\\n').filter(l => /^TRADINGVIEW CALLS|^5-PILLAR|^DATA AGE|^LATEST PRICE/.test(l)).map(l => l.slice(0, 420))")
        R["stored"] = await ev("Math.round((localStorage.getItem('qfeed:CME_MINI:MNQ1!') || '').length / 1024) + ' KB'")
        R["used_after"] = await ev("[__T.tvUsed(), __T.tvLeft()]")
        # the playbook card
        n2 = await ev("window.__rtc.length")
        await ev("__T.openBest('pil')"); await pg.wait_for_timeout(2500)
        R["best_calls"] = await ev(f"window.__rtc.slice({n2}).map(x => x[1])")
        R["cards"] = await ev("[...document.querySelectorAll('.bscard .bshead .nm')].map(e => e.innerText.replace(/\\n/g, ' | '))")
        R["pil_proof"] = await ev("(document.querySelector('.bscard.open .qttab') || document.querySelector('.bscard.open .bsin') || {}).innerText")
        R["bspil"] = await ev("__T.ST.bspil")
        await pg.screenshot(path="/tmp/pil_card.png", full_page=False)
        t = await ev("(() => { const t0 = performance.now(); const X = __T.pxBacktest(__T.FD['CME_MINI:MNQ1!']); return [Math.round(performance.now() - t0), X.n, X.tr.slice(0, 3).map(x => [x.d, x.why, +x.r.toFixed(2)])]; })()")
        R["bt_ms_n"] = t
        # reload: the candles come back from the phone, so a question needs one small call
        await pg.reload(); await pg.wait_for_timeout(2500); await ev("__T.mkShow('home'); __T.closeSheet()"); await pg.wait_for_timeout(1500)
        n3 = await ev("window.__rtc.length"); await ev("__T.openQuint()"); await pg.wait_for_timeout(300)
        await ev("__T.dkSend('Quick: call?')")
        for _ in range(100):
            if not await ev("__T.DK.busy"): break
            await pg.wait_for_timeout(200)
        R["after_reload_calls"] = await ev(f"window.__rtc.slice({n3}).map(x => x[1])")
        R["errs"] = errs[:6]; await b.close()
    for k, v in R.items(): print(k, json.dumps(v, ensure_ascii=False)[:700])
asyncio.run(main())
