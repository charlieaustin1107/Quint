import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# Practising the strategies spends no TradingView calls: practice candles when none are saved, the saved real candles when they are
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
TV2 = TV2.replace('update_mode: "delayed_streaming_600"', 'update_mode: "streaming"')
SPY = """(() => { window.__rtc = []; const h = setInterval(() => { const T = window.__tv; if (T && !T.__spy) { const f = T; window.__tv = (tool, input) => { window.__rtc.push([Date.now(), tool.replace('mcp-tv-', '') + (input && input.symbol ? ':' + input.symbol.split(':').pop() : '') + (input && input.interval ? ':' + input.interval : '')]); return f(tool, input); }; window.__tv.__spy = 1; clearInterval(h); } }, 5); })()"""
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []; R = {}
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS, SPY): await pg.add_init_script(s)
        await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2500); ev = pg.evaluate
        await ev("__T.mkShow('home'); __T.closeSheet(); __T.ST.seenTut = true"); await pg.wait_for_timeout(2500)
        n0 = await ev("window.__rtc.length")
        # 1) nothing saved yet
        await ev("__T.openBest('brk')"); await pg.wait_for_timeout(1500)
        R["best_sheet"] = await ev("[__T.BS.rows.map(r => [r.s.id, r.none || false, r.held]), (document.querySelector('.bscard.open .qttab') || {}).innerText]")
        await ev("document.querySelector('.bscard.open [data-bsp]').click()"); await pg.wait_for_timeout(1500)
        R["spot_brk"] = await ev("[!!__T.QT.su.B, __T.QT.su.B && __T.QT.su.B.sim, __T.QT.su.tr.length, (document.querySelector('.prsrc') || {}).innerText]")
        res = []
        for k in range(10):
            truth = await ev("(U => U.t ? (U.t.d > 0 ? 'buy' : 'sell') : 'none')(__T.QT.su)")
            await ev(f"document.querySelector('[data-su=\"{truth}\"]').click()"); await pg.wait_for_timeout(80)
            res.append(await ev("document.querySelector('.prres b').textContent.slice(0, 30)"))
            await ev("document.querySelector('#suNext').click()"); await pg.wait_for_timeout(80)
        R["spot_rounds"] = res
        await pg.screenshot(path="/tmp/prac_spot.png")
        await ev("__T.openSetup(__T.BEST.find(s => s.id === 'orb15'))"); await pg.wait_for_timeout(1500)
        R["spot_orb"] = await ev("[__T.QT.su.B && __T.QT.su.B.sim, __T.QT.su.tr.length, __T.QT.su.err || null]")
        out = []
        for k, tf in [("MNQ", "15m"), ("MNQ", "5m"), ("MNQ", "1m"), ("MNQ", "1h"), ("ES", "5m"), ("GC", "15m"), ("YM", "15m")]:
            await ev(f"__T.ST.prk = '{k}'; __T.openPrac('{k}')"); await pg.wait_for_timeout(300)
            await ev(f"document.querySelector('#prTf [data-k=\"{tf}\"]').click()"); await pg.wait_for_timeout(700)
            out.append([k, tf, await ev("[!!__T.QT.pr.B, __T.QT.pr.B && __T.QT.pr.B.sim, __T.QT.pr.B && __T.QT.pr.B.n, __T.QT.pr.err || null, !!document.querySelector('#prReal')]")])
        R["prac"] = out
        await ev("__T.ST.prk = 'MNQ'; __T.openPrac('MNQ')"); await pg.wait_for_timeout(800); await pg.screenshot(path="/tmp/prac_chart.png")
        await ev("__T.closeSheet(); __T.mkShow(null)"); await pg.wait_for_timeout(800)
        R["calls_while_practising_nothing_saved"] = await ev(f"window.__rtc.slice({n0}).map(x => x[1])")
        # 2) once Quint has loaded the candles, practice uses them, still with no calls
        await ev("__T.dkFeed('CME_MINI:MNQ1!', null, 0)"); await pg.wait_for_timeout(800); n1 = await ev("window.__rtc.length")
        await ev("__T.openSetup(__T.BEST.find(s => s.id === 'brk'))"); await pg.wait_for_timeout(1200)
        R["spot_real"] = await ev("[__T.QT.su.B && !__T.QT.su.B.sim, __T.QT.su.tr.length, (document.querySelector('.prsrc') || {}).innerText]")
        await ev("__T.ST.prk = 'MNQ'; __T.openPrac('MNQ')"); await pg.wait_for_timeout(300); await ev("document.querySelector('#prTf [data-k=\"5m\"]').click()"); await pg.wait_for_timeout(700)
        R["prac_real"] = await ev("[__T.QT.pr.B && !__T.QT.pr.B.sim, __T.QT.pr.B && __T.QT.pr.B.n]")
        await ev("__T.openBest('pil')"); await pg.wait_for_timeout(1500)
        R["best_real"] = await ev("[__T.BS.rows.map(r => [r.s.id, r.all.n]), __T.BS.B && __T.BS.B.c.length]")
        R["calls_while_practising_saved"] = await ev(f"window.__rtc.slice({n1}).map(x => x[1])")
        R["errs"] = errs[:6]; await b.close()
    for k, v in R.items(): print(k, json.dumps(v, ensure_ascii=False)[:600])
asyncio.run(main())
