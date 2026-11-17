import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# TradingView says the day's calls are used up and nothing is saved yet: Quint still answers (and says he can't see the chart), no plan is guessed
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
TV2 = TV2.replace('update_mode: "delayed_streaming_600"', 'update_mode: "streaming"')
Q = r"""(() => { window.__tvn = 0; window.__quota = true; try { localStorage.setItem('quint-brain-test-plan', '1'); } catch (e) {}
  const h = setInterval(() => { const T = window.__tv; if (T && !T.__q) { const f = T; window.__tv = (tool, input) => { window.__tvn++; if (window.__quota) return { success: false, error: "TOOL_QUOTA_EXCEEDED - Tool call quota exceeded (You've reached your daily usage limit, and a 10-minute MCP cooldown has been enabled.)" }; return f(tool, input); }; window.__tv.__q = 1; clearInterval(h); } }, 2); })()"""
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []; R = {}
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS, Q): await pg.add_init_script(s)
        await pg.goto("file://" + QB + "/quint_test.html"); await pg.wait_for_timeout(3500); ev = pg.evaluate
        R["state"] = await ev("[__Q.MK.st, __Q.tvCooling(), __Q.ST.set.tvOut, __Q.ST.set.tvPlan || null, __Q.tvUsed(), document.querySelector('#stat').textContent]")
        nd = await ev("(window.__ds || []).length")
        await ev("__Q.qaAsk('call')"); await pg.wait_for_timeout(600)
        for _ in range(60):
            if not await ev("__Q.DK.busy"): break
            await pg.wait_for_timeout(200)
        R["claude_called"] = await ev(f"(window.__ds || []).length - {nd}")
        R["brief_no_candles"] = await ev("(window.__brief || '').split('\\n').filter(l => /^NO LIVE CANDLES/.test(l)).map(l => l.slice(0, 200))")
        await ev("document.querySelector('#setb').click()"); await pg.wait_for_timeout(400)
        R["settings"] = await ev("(document.querySelector('#tvu') || {}).textContent")
        R["errs"] = errs[:4]; await b.close()
    for k, v in R.items(): print(k, json.dumps(v)[:300])
asyncio.run(main())
