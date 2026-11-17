import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# Real-time TradingView feed: the app notices it, refreshes faster, and Quint's brief carries the live detail
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_ARGV = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _ARGV
TV2 = TV2.replace('update_mode: "delayed_streaming_600"', 'update_mode: (window.__tvLive ? "streaming" : "delayed_streaming_600")')
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg = await ctx.new_page(); errs = []; R = {}
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
        await pg.clock.install(time=T0); await pg.clock.resume()
        await pg.add_init_script("window.__tvLive = true; window.__rtc = []")
        await pg.add_init_script(TV); await pg.add_init_script(TV2); await pg.add_init_script(MOCK); await pg.add_init_script(DS)
        await pg.add_init_script("""(() => { const h = setInterval(() => { const T = window.__tv; if (T && !T.__spy) { const f = T; window.__tv = (tool, input) => { window.__rtc.push(tool + (input && input.count ? ':' + input.count : '')); return f(tool, input); }; window.__tv.__spy = 1; clearInterval(h); } }, 5); })()""")
        await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2200)
        ev = pg.evaluate
        await ev("__T.mkShow('home'); __T.closeSheet(); __T.ST.seenTut = true"); await pg.wait_for_timeout(1800)
        R["live_flag"] = await ev("[__T.MK.tvLive, (document.querySelector('#hmFutNote') || {}).textContent]")
        await ev("__T.mkShow('chart', 'MNQ')"); await pg.wait_for_timeout(1500)
        R["chart_sub"] = await ev("(document.querySelector('#hmChart') || {innerText: ''}).innerText.match(/price from[^\\n]*/) && document.querySelector('#hmChart').innerText.match(/price from[^\\n]*/)[0]")
        R["watch_iv"] = await ev("Object.entries(__T.MK.W).filter(([k]) => /MNQ|qb/.test(k)).map(([k, v]) => k + ':' + (v.w ? v.w.iv : v.iv))")
        n0 = await ev("window.__rtc.filter(c => c === 'mcp-tv-get-ohlcv:3').length")
        await ev("__T.hcSetTf && __T.hcSetTf('5m')"); await pg.wait_for_timeout(1500)
        await pg.wait_for_timeout(24000)
        R["topups_24s"] = await ev("window.__rtc.filter(c => c === 'mcp-tv-get-ohlcv:3').length") - n0
        R["quotes_24s"] = await ev("window.__rtc.filter(c => c === 'mcp-tv-get-symbol-data').length")
        await ev("document.querySelector('#qFab').click()"); await pg.wait_for_timeout(400)
        await ev("document.querySelector('#qdkQ [data-qq=\"call\"]').click()"); await pg.wait_for_timeout(300)
        for _ in range(60):
            if not await ev("__T.DK.busy"): break
            await pg.wait_for_timeout(200)
        br = await ev("window.__brief || ''")
        R["brief_has"] = {k: (k in br) for k in ["DATA FEED: REAL-TIME", "1-MINUTE CHART:", "LAST MINUTES:", "AROUND IT", "TODAY'S RANGE SO FAR", "LAST 20 1-MINUTE CANDLES"]}
        R["brief_len"] = len(br)
        R["around"] = (br.split("AROUND IT")[1][:200] if "AROUND IT" in br else "")
        R["range"] = (br.split("TODAY'S RANGE SO FAR")[1][:200] if "TODAY'S RANGE SO FAR" in br else "")
        R["errs"] = errs[:6]
        await b.close()
    for k, v in R.items(): print(f"{k}: {json.dumps(v, ensure_ascii=False)[:600]}")
asyncio.run(main())
