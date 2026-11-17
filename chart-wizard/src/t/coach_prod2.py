import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
import asyncio, sys
sys.path.insert(0, CW + "/t")
src = open(CW + "/t/coach_t3.py").read(); MOCK = src.split('MOCK = r"""')[1].split('"""')[0]
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True); await ctx.add_init_script(MOCK)
        pg = await ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("file://" + CW + "/../index.html"); await pg.wait_for_timeout(900); await pg.click('#hmNav'); await pg.wait_for_timeout(300); await pg.click('#nav [data-go="train"]'); await pg.wait_for_timeout(500)
        for _ in range(4): await pg.click("#tnext")
        await pg.click("#menubtn"); await pg.wait_for_timeout(250); await pg.evaluate("document.querySelector('#nav details.oldt').open = true"); await pg.click('#nav [data-go="mode:scalp"]'); await pg.wait_for_timeout(300)
        await pg.click("#coachbtn"); await pg.click("#csugg .chip"); await pg.wait_for_selector("#cmsgs .cact", timeout=8000); await pg.wait_for_timeout(800)
        print("prod coach chips:", await pg.evaluate("document.querySelectorAll('#cmsgs .cact').length"), errs)
        await b.close()
asyncio.run(main())
