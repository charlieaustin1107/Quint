import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# Quint keeps up with live MNQ: the price every ~10s from 1-minute top-ups, small top-ups instead of full reloads, and an instant answer when asked
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
TV2 = TV2.replace('update_mode: "delayed_streaming_600"', 'update_mode: "streaming"')
SPY = """(() => { window.__rtc = []; const h = setInterval(() => { const T = window.__tv; if (T && !T.__spy) { const f = T; window.__tv = (tool, input) => { window.__rtc.push([Date.now(), tool.replace('mcp-tv-', '') + (input && input.interval ? ':' + input.interval : '') + (input && input.count ? ':' + input.count : '')]); return f(tool, input); }; window.__tv.__spy = 1; clearInterval(h); } }, 5); })()"""
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []; R = {}
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS, SPY): await pg.add_init_script(s)
        await pg.goto("file://" + QB + "/quint_test.html"); await pg.wait_for_timeout(4000); ev = pg.evaluate
        R["boot"] = await ev("[__Q.MK.tvLive, window.__rtc.length, window.__rtc.map(x => x[1]).join(' '), __Q.tvUsed(), __Q.tvPlan(), __Q.tvBgEvery()]")
        t0 = await ev("Date.now()"); await pg.wait_for_timeout(65000)
        R["background_calls_65s_plan50"] = await ev(f"window.__rtc.filter(x => x[0] > {t0}).map(x => x[1])")
        R["age_btn"] = await ev("[document.querySelector('#rfa').textContent, document.querySelector('#rf').title]")
        n9 = await ev("window.__rtc.length"); await ev("document.querySelector('#rf').click()"); await pg.wait_for_timeout(1500)
        R["refresh_calls"] = await ev(f"window.__rtc.slice({n9}).map(x => x[1])")
        R["1m_series"] = await ev("(() => { const B = __Q.dkCached('CME_MINI:MNQ1!', '1m'); return B ? [B.n, B.t.every((t, i) => !i || t > B.t[i - 1])] : null; })()")
        await ev("__Q.setView('matrix')"); await pg.wait_for_timeout(500); R["pillar_panel"] = await ev("(document.querySelector('.pil') || {}).innerText")
        await pg.screenshot(path="/tmp/live_matrix.png")
        # the AI add-on: refreshes on its own every 2 minutes
        await ev("__Q.ST.set.tvPlan = 500; __Q.ST.set.tvPlanSet = 1"); R["bg_500"] = await ev("__Q.tvBgEvery()")
        await ev("__Q.ST.set.tvPlan = 50")
        # ask: the instant line shows at once, and the brief needs (almost) no new TradingView calls
        n0 = await ev("window.__rtc.length"); d0 = await ev("(window.__ds || []).length")
        await ev("window.__askT = Date.now(); __Q.qaAsk('call')"); await pg.wait_for_timeout(120)
        R["instant"] = await ev("(document.querySelector('#log .m.a:last-child .now') || {}).textContent || null")
        for _ in range(100):
            if await ev(f"(window.__ds || []).length > {d0}"): break
            await pg.wait_for_timeout(50)
        R["ask_tv_calls_before_claude"] = await ev(f"window.__rtc.slice({n0}).map(x => x[1])")
        R["ms_to_claude"] = await ev("Date.now() - window.__askT")
        for _ in range(60):
            if not await ev("__Q.DK.busy"): break
            await pg.wait_for_timeout(200)
        R["brief_speed"] = await ev("(window.__brief || '').split('\\n').filter(l => /^SPEED|^LATEST PRICE|^DATA FEED/.test(l)).map(l => l.slice(0, 160))")
        await ev("__Q.setView('console')"); await pg.wait_for_timeout(300); await pg.screenshot(path="/tmp/live_ask.png")
        R["errs"] = errs[:5]; await b.close()
    for k, v in R.items(): print(k, json.dumps(v, ensure_ascii=False)[:600])
asyncio.run(main())
