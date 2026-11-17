import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# Quint Brain (the published page): a tap wakes the audio, a call plays its chime, the settings hold the switches,
# and voice mode shows the 3D core
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
TV2 = TV2.replace('update_mode: "delayed_streaming_600"', 'update_mode: "streaming"')
F = open(CW + '/t/fx.py').read(); AUDIO = F.split('AUDIO = """')[1].split('"""')[0]; IPHONE = F.split('IPHONE = "')[1].split('"')[0]
FAKE_TTS = open(CW + '/t/voice.py').read().split('FAKE_TTS = """')[1].split('"""')[0]
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []; R = {}; bad = []
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2, user_agent=IPHONE)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS, AUDIO, FAKE_TTS): await pg.add_init_script(s)
        await pg.goto("file://" + QB + "/../index.html"); await pg.wait_for_timeout(4500); ev = pg.evaluate
        await pg.tap('#chips button'); await pg.wait_for_timeout(300)
        for _ in range(60):
            if not await ev("document.querySelector('#go').classList.contains('stop')"): break
            await pg.wait_for_timeout(150)
        await pg.wait_for_timeout(500)
        R["call"] = await ev("[window.__ctx, (window.__sfx || []).slice(-1)[0], window.__played, (window.__haps || []).length]")
        if R["call"][0] != 1 or R["call"][1] not in ("buy", "sell", "flat") or R["call"][2] < 1 or R["call"][3] < 1: bad.append(f"call sound/haptic {R['call']}")
        await pg.tap("#setb"); await pg.wait_for_timeout(300)
        R["settings"] = await ev("[!!document.querySelector('#fxSnd'), !!document.querySelector('#fxHap'), !!document.querySelector('#fxVol')]")
        if R["settings"] != [True, True, True]: bad.append("settings")
        await ev("document.querySelector('#fxSnd').scrollIntoView({ block: 'center' })"); await pg.wait_for_timeout(200); await pg.screenshot(path="/tmp/qb_fx_set.png")
        await ev("document.querySelector('#setx').click()"); await pg.wait_for_timeout(200)
        await pg.tap("#mic"); await pg.wait_for_timeout(600)
        R["core"] = await ev("[!!document.querySelector('#vmbar canvas.qcore'), (window.__sfx || []).includes('on')]")
        if R["core"] != [True, True]: bad.append(f"voice core {R['core']}")
        await pg.screenshot(path="/tmp/qb_fx_vm.png")
        R["bad"] = bad; R["errs"] = errs[:5]; await b.close()
    for k, v in R.items(): print(k, json.dumps(v, ensure_ascii=False)[:300])
asyncio.run(main())
