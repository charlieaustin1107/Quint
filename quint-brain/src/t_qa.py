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
async def run(b, w, h, mob, tag, out):
    ctx = await b.new_context(viewport={"width": w, "height": h}, has_touch=mob, is_mobile=mob, device_scale_factor=2 if mob else 1)
    pg = await ctx.new_page(); errs = []; R = {}
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    await pg.clock.install(time=T0); await pg.clock.resume()
    for s in (TV, TV2, MOCK, DS): await pg.add_init_script(s)
    await pg.goto("file://" + QB + "/quint_test.html"); await pg.wait_for_timeout(3500)
    ev = pg.evaluate
    R["boot"] = await ev("[__Q.MK.st, __Q.MK.tvLive, document.querySelector('#stat').innerText, document.querySelector('#vd').innerText.replace(/\\n/g,' | '), __Q.DK.lights.join(''), !!__Q.DK.lv, document.querySelector('#log').innerText.slice(0, 300)]")
    await pg.screenshot(path=f"/tmp/q_{tag}_0.png")
    if mob:
        await ev("__Q.setView('matrix')"); await pg.wait_for_timeout(900)
    R["matrix"] = await ev("document.querySelector('#side').innerText.slice(0, 900)")
    await pg.screenshot(path=f"/tmp/q_{tag}_matrix.png", full_page=False)
    if mob: await ev("__Q.setView('console')"); await pg.wait_for_timeout(300)
    await ev("document.querySelector('#chips [data-qq=\"call\"]').click()"); await pg.wait_for_timeout(400)
    for _ in range(80):
        if not await ev("__Q.DK.busy"): break
        await pg.wait_for_timeout(200)
    R["model"] = await ev("window.__ds && window.__ds.length ? [window.__ds[window.__ds.length-1].model, window.__ds[window.__ds.length-1].effort] : null")
    R["card"] = await ev("(document.querySelector('#log .call') || {innerText: 'none'}).innerText.replace(/\\n+/g, ' | ').slice(0, 400)")
    R["verdict"] = await ev("document.querySelector('#vd').innerText.replace(/\\n/g, ' | ')")
    R["lv_tape"] = await ev("__Q.HC.lvl && __Q.HC.lvl.arr.map(x => x.lab)")
    await pg.screenshot(path=f"/tmp/q_{tag}_call.png")
    await ev("document.querySelector('#log [data-cal$=\":s\"]') && document.querySelector('#log [data-cal$=\":s\"]').click()"); await pg.wait_for_timeout(700)
    R["alert"] = await ev("window.__alert ? [window.__alert.condition, window.__alert.name, window.__alert.message.slice(0, 120)] : null")
    await ev("document.querySelector('#log [data-in]') && document.querySelector('#log [data-in]').click()"); await pg.wait_for_timeout(300)
    R["pos"] = await ev("JSON.stringify(__Q.ST.pos || null).slice(0, 200)")
    await pg.fill("#q", "What is VWAP?"); await pg.press("#q", "Enter"); await pg.wait_for_timeout(300)
    for _ in range(60):
        if not await ev("__Q.DK.busy"): break
        await pg.wait_for_timeout(200)
    R["easy_model"] = await ev("window.__ds && window.__ds.length ? [window.__ds[window.__ds.length-1].model, window.__ds[window.__ds.length-1].effort] : null")
    await ev("__Q.setView('record')"); await pg.wait_for_timeout(400); R["record"] = await ev("document.querySelector('#side').innerText.slice(0, 300)")
    await ev("__Q.setView('alerts')"); await pg.wait_for_timeout(900); R["alerts"] = await ev("document.querySelector('#side').innerText.slice(0, 300)")
    await pg.screenshot(path=f"/tmp/q_{tag}_alerts.png")
    await ev("__Q.setView('console')"); await ev("__Q.openSet()"); await pg.wait_for_timeout(500)
    R["settings"] = await ev("document.querySelector('#sheet').innerText.slice(0, 400)")
    await pg.screenshot(path=f"/tmp/q_{tag}_set.png")
    await ev("document.querySelector('#setx').click()"); await pg.wait_for_timeout(200)
    await pg.select_option("#mk", "ES"); await pg.wait_for_timeout(1500)
    R["es"] = await ev("[__Q.DK.k, document.querySelector('#vd').innerText.replace(/\\n/g,' | '), document.querySelector('#q').placeholder]")
    R["errs"] = errs[:8]; out[tag] = R; await ctx.close()
async def main():
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"])
        await run(b, 390, 844, True, "m", out)
        if len(sys.argv) > 1: await run(b, 1280, 800, False, "d", out)
        await b.close()
    for k, v in out.items():
        print("=====", k)
        for kk, vv in v.items(): print(f"{kk}: {json.dumps(vv, ensure_ascii=False)[:700]}")
asyncio.run(main())
