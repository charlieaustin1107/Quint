import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# Sound effects, haptics and the 3D Quint core: the right sound and feel for each moment, the settings obeyed,
# quiet while Quint talks, and the core drawing in Quint's header
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
AUDIO = """(() => { window.__played = 0; window.__ctx = 0;
  window.AudioContext = function () { window.__ctx++; this.state = 'running'; this.destination = {}; this.resume = () => Promise.resolve();
    this.createBufferSource = () => ({ connect() {}, start() { window.__played++; } }); this.createBuffer = (c, n) => ({ n, getChannelData: () => ({ set() {} }) }); };
})()"""
IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []; R = {}; bad = []
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2, user_agent=IPHONE)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS, AUDIO): await pg.add_init_script(s)
        await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2500); ev = pg.evaluate
        await ev("__T.mkShow('home'); __T.closeSheet(); __T.ST.seenTut = true"); await pg.wait_for_timeout(500)
        R["before_tap"] = await ev("[window.__ctx, (window.__sfx || []).length]")
        await pg.tap("#hmRef"); await pg.wait_for_timeout(200)  # any tap wakes the audio and builds the haptic switch
        R["after_tap"] = await ev("[window.__ctx, !!document.querySelector('label input[switch]')]")
        if R["after_tap"] != [1, True]: bad.append(f"unlock {R['after_tap']}")
        await ev("__T.sfx('buy')"); await pg.wait_for_timeout(300); R["buy"] = await ev("[window.__sfx.slice(-1)[0], window.__played]")
        if R["buy"] != ["buy", 2]: bad.append(f"buy chime {R['buy']}")
        # Spot it: a wrong answer sounds and feels wrong, inside the tap
        await ev("__T.openSetup(__T.BEST.find(s => s.id === 'brk'))"); await pg.wait_for_timeout(1500)
        truth = await ev("(U => U.t ? (U.t.d > 0 ? 'buy' : 'sell') : 'none')(__T.QT.su)"); wrong = "sell" if truth != "sell" else "buy"
        await ev(f"document.querySelector('[data-su=\"{wrong}\"]').click()"); await pg.wait_for_timeout(300)
        R["spot_wrong"] = await ev("[window.__sfx.slice(-1)[0], (window.__haps || []).slice(-2)]")
        if R["spot_wrong"][0] != "wrong" or "wrong" not in R["spot_wrong"][1]: bad.append(f"spot-it wrong {R['spot_wrong']}")
        # placing a drawing ticks
        await ev("__T.ST.su = null; document.querySelector('#suNext') && document.querySelector('#suNext').click()"); await pg.wait_for_timeout(500)
        await ev("document.querySelector('#suCv').scrollIntoView({ block: 'center' })"); await pg.wait_for_timeout(200)
        bx = await ev("(b => ({ x: b.left + b.width / 2, y: b.top + b.height * .4 }))(document.querySelector('#suCv').getBoundingClientRect())")
        await ev("document.querySelector('#suBody [data-lt=\"h\"]').click()"); await pg.mouse.click(bx["x"], bx["y"]); await pg.wait_for_timeout(200)
        R["draw"] = await ev("window.__sfx.slice(-1)[0]")
        if R["draw"] != "draw": bad.append(f"draw sound {R['draw']}")
        # the voice sheet holds the settings; turning sound off silences, haptics off stops the taps
        await ev("__T.closeSheet(); __T.openVoice()"); await pg.wait_for_timeout(300)
        R["sheet"] = await ev("[!!document.querySelector('#fxSnd'), !!document.querySelector('#fxHap'), !!document.querySelector('#fxVol')]")
        if R["sheet"] != [True, True, True]: bad.append("settings missing")
        await pg.screenshot(path="/tmp/fx_sheet.png")
        await ev("document.querySelector('#fxSnd').click(); document.querySelector('#fxHap').click()")
        n0 = await ev("[window.__sfx.length, (window.__haps || []).length, window.__played]")
        await ev("__T.sfx('win'); __T.sfx('alert')"); await pg.wait_for_timeout(400)
        n1 = await ev("[window.__sfx.length, (window.__haps || []).length, window.__played]")
        if n1 != n0: bad.append(f"off still plays {n0} {n1}")
        await ev("document.querySelector('#fxSnd').click(); document.querySelector('#fxHap').click()"); await pg.wait_for_timeout(200)
        # quiet while Quint talks (except a trade closing)
        await ev("__T.QT.speaking = true"); k0 = await ev("window.__sfx.length"); await ev("__T.sfx('buy'); __T.sfx('win', { over: true })"); k1 = await ev("window.__sfx.slice(" + str(k0) + ")")
        await ev("__T.QT.speaking = false")
        if k1 != ["win"]: bad.append(f"ducking {k1}")
        # Quint's call: a buy rises; the 3D core sits in his header and draws
        await ev("__T.closeSheet(); __T.mkShow('chart', 'MNQ')"); await pg.wait_for_timeout(1500); await ev("document.querySelector('#qFab').click()"); await pg.wait_for_timeout(500)
        await ev("document.querySelector('#qdkQ [data-qq=\"call\"]').click()")
        for _ in range(50):
            if not await ev("__T.DK.busy"): break
            await pg.wait_for_timeout(200)
        await pg.wait_for_timeout(300); R["call_sound"] = await ev("window.__sfx.slice(-1)[0]")
        if R["call_sound"] not in ("buy", "sell", "flat"): bad.append(f"call sound {R['call_sound']}")
        R["core"] = await ev("""(c => c && (() => { const x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < x.length; i += 4) if (x[i] > 20) n++; return [c.width, n > 50, !!__T.QCORE.raf]; })())(document.querySelector('.qdkh canvas.qcore'))""")
        if not R["core"] or not R["core"][1]: bad.append(f"3D core {R['core']}")
        await pg.screenshot(path="/tmp/fx_core.png", clip={"x": 0, "y": 380, "width": 390, "height": 80})
        R["bad"] = bad; R["errs"] = errs[:6]; await b.close()
    for k, v in R.items(): print(k, json.dumps(v, ensure_ascii=False)[:300])
asyncio.run(main())
