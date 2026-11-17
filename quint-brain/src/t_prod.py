import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
TV2 = TV2.replace('update_mode: "delayed_streaming_600"', 'update_mode: "streaming"')
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS): await pg.add_init_script(s)
        await pg.goto("file://" + QB + "/../index.html"); await pg.wait_for_timeout(4000)
        r = await pg.evaluate("[document.querySelector('#stat').textContent, document.querySelector('#rfa').textContent, document.querySelector('#vd').innerText.replace(/\\n/g,' | '), !!document.querySelector('#brain')]")
        await pg.click('#chips [data-qq="pil"]'); await pg.wait_for_timeout(4000)
        r2 = await pg.evaluate("(document.querySelector('#log .m.a:last-child') || {}).innerText")
        print(json.dumps(r), json.dumps((r2 or '')[:300]), errs[:4])
        await b.close()
asyncio.run(main())
