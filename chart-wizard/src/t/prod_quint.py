import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("F = 'agent-proxy")[0]
sys.argv=[sys.argv[0],"none"]; exec(src)
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2); pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS): await pg.add_init_script(s)
        await pg.goto("file://" + CW + "/../index.html"); await pg.wait_for_timeout(2500)
        await pg.tap('#hmTabs [data-tab="quint"]'); await pg.wait_for_timeout(800)
        await pg.tap('#qdkQ [data-qq="call"]')
        await pg.wait_for_selector('#qdkB .qcall', timeout=30000); await pg.wait_for_timeout(500)
        await pg.tap('#qdkB [data-cal$=":t"]'); await pg.wait_for_timeout(800)
        r = await pg.evaluate("[document.querySelector('#qdkB .qcall').innerText.replace(/\\n+/g,' | ').slice(0,220), typeof window.__T, window.__alert && [window.__alert.condition, window.__alert.name, window.__alert.mobile_push], document.querySelector('#hmtoast').textContent, document.querySelector('#qdkAl').textContent]")
        await pg.tap('#qdkAl'); await pg.wait_for_timeout(900)
        r.append(await pg.evaluate("document.querySelector('#qdkB').innerText.replace(/\\n+/g,' | ').slice(0, 260)"))
        print(json.dumps(r), errs[:5]); await b.close()
asyncio.run(main())
