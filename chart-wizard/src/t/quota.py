import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# TradingView's connector says "cool down": the app stops calling it, says so, keeps Quint from spending Claude usage, and recovers
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
TV2 = TV2.replace('update_mode: "delayed_streaming_600"', 'update_mode: "streaming"')
GATE = """(() => { window.__n = 0; window.__quota = false; const h = setInterval(() => { const T = window.__tv; if (T && !T.__q) { const f = T; window.__tv = (tool, input) => { window.__n++; if (window.__quota) return { success: false, error: 'tool_pre_invoke blocked by plugin ToolQuotaPlugin: TOOL_QUOTA_EXCEEDED - Tool call quota exceeded (MCP cooldown is currently active. You can make another call in 6 mins, once the cooldown is lifted.)' }; return f(tool, input); }; window.__tv.__q = 1; clearInterval(h); } }, 5); })()"""
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width": 390, "height": 844}); pg = await ctx.new_page(); errs = []; R = {}
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS, GATE): await pg.add_init_script(s)
        await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2500); ev = pg.evaluate
        await ev("__T.mkShow('chart', 'MNQ'); __T.closeSheet()"); await pg.wait_for_timeout(2000)
        n0 = await ev("window.__n"); await pg.wait_for_timeout(60000); R["calls_per_min_on_chart"] = await ev("window.__n") - n0
        await ev("window.__quota = true"); await pg.wait_for_timeout(16000)
        R["cool"] = await ev("[__T.tvCooling(), Math.round((__T.TVQ.until - Date.now()) / 6e4), __T.TVQ.slow]")
        n1 = await ev("window.__n"); await pg.wait_for_timeout(40000); R["calls_while_cooling_40s"] = await ev("window.__n") - n1
        await ev("document.querySelector('#qFab').click()"); await pg.wait_for_timeout(300); d0 = await ev("(window.__ds || []).length")
        await ev("document.querySelector('#qdkQ [data-qq=\"call\"]').click()"); await pg.wait_for_timeout(500)
        R["quint_blocked"] = [await ev("(window.__ds || []).length") - d0, await ev("document.querySelector('#hmtoast').textContent")]
        await ev("__T.mkShow('home')"); await pg.wait_for_timeout(800); R["banner"] = await ev("document.querySelector('#hmBan').innerText")
        await ev("window.__quota = false"); await pg.clock.fast_forward(7 * 60000); await pg.wait_for_timeout(5000)
        R["after"] = await ev("[__T.tvCooling(), document.querySelector('#hmBan').innerText.slice(0, 60)]")
        n2 = await ev("window.__n"); await pg.wait_for_timeout(35000); R["home_calls_35s_after"] = await ev("window.__n") - n2
        R["errs"] = errs[:5]; await b.close()
    for k, v in R.items(): print(f"{k}: {json.dumps(v, ensure_ascii=False)[:400]}")
asyncio.run(main())
