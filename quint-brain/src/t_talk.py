import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# Quint Brain (the published page): small talk spends no TradingView calls; voice mode listens, answers out loud, listens again
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
TV2 = TV2.replace('update_mode: "delayed_streaming_600"', 'update_mode: "streaming"')
T = open(CW + '/t/talk.py').read()
FAKE_TTS = open(CW + '/t/voice.py').read().split('FAKE_TTS = """')[1].split('"""')[0]
SPY = T.split('SPY = """')[1].split('"""')[0]; REC = T.split('REC = """')[1].split('"""')[0]
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []; bad = []; R = {}
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=1)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS, SPY, FAKE_TTS, REC): await pg.add_init_script(s)
        await pg.goto("file://" + QB + "/../index.html"); await pg.wait_for_timeout(4500); ev = pg.evaluate
        async def idle():
            for _ in range(60):
                if not await ev("document.querySelector('#go').classList.contains('stop')"): break
                await pg.wait_for_timeout(150)
            await pg.wait_for_timeout(300)
        n0 = await ev("window.__rtc"); await pg.fill("#q", "hey quint, how's your day been?"); await pg.press("#q", "Enter"); await pg.wait_for_timeout(300); await idle()
        R["chat"] = [await ev("window.__rtc") - n0, await ev("window.__ds.slice(-1)[0].model"), await ev("window.__ds.slice(-1)[0].tools")]
        if R["chat"][0] or R["chat"][1] != "claude-opus-5-5" or R["chat"][2]: bad.append(f"small talk {R['chat']}")
        await ev("window.__said.length = 0; window.__say = ['what do you reckon about the weekend', 'buy or sell MNQ now?']")
        await ev("document.querySelector('#mic').click()"); await pg.wait_for_timeout(300)
        for _ in range(90):
            if await ev("window.__heard.length >= 2 && window.__recStarts >= 3"): break
            await pg.wait_for_timeout(150)
        await idle(); await pg.wait_for_timeout(600)
        said = [x["t"] for x in await ev("window.__said") if x != "<cancel>"]
        R["heard"] = await ev("window.__heard"); R["said"] = said[:5]; R["bar"] = await ev("(document.querySelector('#vmbar') || {}).innerText")
        if len(R["heard"]) < 2 or len([x for x in said if x.strip()]) < 2: bad.append("voice mode loop")
        await pg.screenshot(path="/tmp/qb_talk.png")
        await ev("document.querySelector('#vmbar .vmx').click()"); R["end"] = await ev("[document.querySelector('#mic').getAttribute('aria-pressed') === 'true', !!document.querySelector('#vmbar')]")
        if R["end"] != [False, False]: bad.append("end")
        R["bad"] = bad; R["errs"] = errs[:5]; await b.close()
    for k, v in R.items(): print(k, json.dumps(v, ensure_ascii=False)[:400])
asyncio.run(main())
