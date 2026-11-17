import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# Quint Brain's Listen button on the published page: opens with the call, speaks sentence by sentence, premium voice, the user's speed
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
TV2 = TV2.replace('update_mode: "delayed_streaming_600"', 'update_mode: "streaming"')
FAKE_TTS = open(CW + '/t/voice.py').read().split('FAKE_TTS = """')[1].split('"""')[0]
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []; bad = []
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=1)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS, FAKE_TTS): await pg.add_init_script(s)
        await pg.goto("file://" + QB + "/../index.html"); await pg.wait_for_timeout(4000)
        await pg.click('#chips button'); await pg.wait_for_timeout(5000)  # the first quick ask: a call
        n = await pg.evaluate("document.querySelectorAll('#log .say').length")
        if not n: bad.append("no Listen button")
        await pg.evaluate("[...document.querySelectorAll('#log .say')].pop().click()"); await pg.wait_for_timeout(800)
        said = [x for x in await pg.evaluate("window.__said") if x != "<cancel>"]
        if len(said) < 3: bad.append(f"{len(said)} utterances")
        if any(x["voice"] != "Ava (Premium)" for x in said): bad.append("voice")
        if said and not said[0]["t"].startswith(("Buy ", "Sell ", "No trade")): bad.append("doesn't open with the call: " + said[0]["t"][:60])
        if any(s in x["t"] for x in said for s in ("CALL", "**", "·", "▲", "PRICE:")): bad.append("reads symbols")
        print("said", json.dumps([x["t"] for x in said][:6], ensure_ascii=False)[:700]); print("bad", bad); print("errs", errs[:4])
        await b.close()
asyncio.run(main())
