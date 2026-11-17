import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width": 390, "height": 844}, reduced_motion="reduce"); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto("file://" + CW + "/../index.html"); await pg.wait_for_timeout(600); await pg.click('#hmNav'); await pg.wait_for_timeout(300); await pg.click('#nav [data-go="train"]'); await pg.wait_for_timeout(500)
        for _ in range(4): await pg.click("#tnext")
        await pg.click("#menubtn"); await pg.wait_for_timeout(250); await pg.evaluate("document.querySelector('#nav details.oldt').open = true"); await pg.click('#nav [data-go="mode:scalp"]'); await pg.wait_for_timeout(300)
        for r in range(4):
            for i in range(4):
                if await pg.query_selector(".ord.buy") or await pg.query_selector("#lockchk"): break
                if await pg.query_selector(".opt:not([disabled])"): await pg.click(".opt:not([disabled])")
                elif await pg.query_selector("#showme"): await pg.click("#showme")
                await pg.click("#nextq")
            if await pg.query_selector("#lockchk"):
                for btn in await pg.query_selector_all('.chk .seg button[data-v="1"]'): await btn.click()
                await pg.click("#lockchk")
            await pg.click("#sell")
            for w in range(80):
                if await pg.query_selector("#next, #acctgo"): break
                if await pg.evaluate("(()=>{const e=document.querySelector('#pp');if(e&&e.textContent.includes('Resume')){e.click();return 1}return 0})()"): pass
                await pg.wait_for_timeout(80)
            await pg.click("#next" if await pg.query_selector("#next") else "#acctgo")
        print("ok rounds, errors:", errs)
        await b.close()
asyncio.run(main())
