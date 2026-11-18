import os as _os
def _repo():  # the repo's root, found from this test's own location
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None
# TradingView calls go out one at a time, at least 3 seconds apart and at most 6 a minute (a burst on opening sets off TradingView's
# cooldowns), opening Quint Brain fetches only the candles, and a cooldown survives a reload with no calls sent until it ends.
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
TV2 = TV2.replace('update_mode: "delayed_streaming_600"', 'update_mode: "streaming"')
SLOW = "window.__tvFast = false;"
SPY = """(() => { window.__rtc = []; const h = setInterval(() => { const T = window.__tv; if (T && !T.__spy) { const f = T; window.__tv = (tool, input) => { window.__rtc.push([Date.now(), tool.replace('mcp-tv-', '') + (input && input.interval ? ':' + input.interval : '')]); if (window.__quota) return { success: false, error: "TOOL_QUOTA_EXCEEDED - MCP cooldown is currently active. You can make another call in 5 mins" }; return f(tool, input); }; window.__tv.__spy = 1; clearInterval(h); } }, 2); })()"""
from playwright.async_api import async_playwright
def gaps(L): return [round((L[i][0] - L[i - 1][0]) / 1000, 1) for i in range(1, len(L))]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []; R = {}
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (SLOW, TV, TV2, MOCK, DS, SPY): await pg.add_init_script(s)
        await pg.goto("file://" + QB + "/quint_test.html"); await pg.wait_for_timeout(12000); ev = pg.evaluate
        L = await ev("window.__rtc"); R["boot_calls"] = [x[1] for x in L]; R["boot_gaps_s"] = gaps(L)
        R["boot_price"] = await ev("[__Q.MK.st, !!(__Q.MK.q.MNQ && __Q.MK.q.MNQ.p)]")
        n0 = len(L); await ev("__Q.qaAsk('call')")
        for _ in range(300):
            if not await ev("__Q.DK.busy"): break
            await pg.wait_for_timeout(250)
        L = await ev("window.__rtc"); R["ask_calls"] = [x[1] for x in L[n0:]]; R["all_gaps_s_min"] = min(gaps(L)) if len(L) > 1 else None
        R["max_in_any_minute"] = max(sum(1 for y in L if 0 <= y[0] - x[0] < 60000) for x in L)
        # a cooldown: refused, then the page is reopened while it's still on
        await ev("window.__quota = true; __Q.qaRefresh(true)"); await pg.wait_for_timeout(4500)
        R["cooling"] = await ev("[__Q.tvCooling(), Math.round((__Q.TVQ.until - Date.now()) / 6e4), !!__Q.ST.set.tvUntil]")
        await ev("window.__quota = false"); await pg.reload(); await pg.wait_for_timeout(6000)
        R["after_reload"] = await ev("[__Q.tvCooling(), window.__rtc.length, document.querySelector('#stat').textContent]")
        R["errs"] = errs[:4]; await b.close()
    for k, v in R.items(): print(k, json.dumps(v)[:400])
asyncio.run(main())
