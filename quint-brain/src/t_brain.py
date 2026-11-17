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
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"])
        R = {}; errs = []
        for (w, h, mob, tag) in [(390, 844, True, "m"), (1280, 800, False, "d")]:
            ctx = await b.new_context(viewport={"width": w, "height": h}, has_touch=mob, is_mobile=mob, device_scale_factor=2 if mob else 1)
            pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.clock.install(time=T0); await pg.clock.resume()
            for s in (TV, TV2, MOCK, DS): await pg.add_init_script(s)
            await pg.goto("file://" + QB + "/quint_test.html"); await pg.wait_for_timeout(3500)
            ev = pg.evaluate
            R[tag + "_0"] = await ev("[__Q.QA.view, __Q.BR.nodes.length, __Q.BR.edges.length, __Q.BR.layers.map(l => l.name + ':' + l.nodes.length).join(' '), +__Q.BR.yaw.toFixed(2), (document.querySelector('#bfeed') || {}).textContent]")
            await pg.screenshot(path=f"/tmp/b3_{tag}_0.png")
            y0 = await ev("__Q.BR.yaw"); await pg.wait_for_timeout(2000); R[tag + "_autorot"] = round(await ev("__Q.BR.yaw") - y0, 2)
            box = await pg.locator("#brain").bounding_box(); cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
            if mob:
                await ev(f"(() => {{ const cv = document.querySelector('#brain'); const fire = (ty, x, y) => cv.dispatchEvent(new PointerEvent(ty, {{ pointerId: 3, clientX: x, clientY: y, bubbles: true }})); fire('pointerdown', {cx}, {cy}); for (let i = 1; i <= 10; i++) fire('pointermove', {cx} + i * 14, {cy} + i * 2); fire('pointerup', {cx} + 140, {cy} + 20); }})()")
            else:
                await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx + 140, cy + 20, steps=10); await pg.mouse.up()
            await pg.wait_for_timeout(400); R[tag + "_drag"] = [round(await ev("__Q.BR.yaw") - y0, 2), round(await ev("__Q.BR.pitch"), 2)]
            await pg.screenshot(path=f"/tmp/b3_{tag}_drag.png")
            await ev("__Q.qaAsk('call')"); await pg.wait_for_timeout(600); await pg.screenshot(path=f"/tmp/b3_{tag}_think.png")
            for _ in range(60):
                if not await ev("__Q.DK.busy"): break
                await pg.wait_for_timeout(200)
            await ev("__Q.setView('brain')"); await pg.wait_for_timeout(800)
            R[tag + "_feed"] = await ev("document.querySelector('#bfeed').textContent")
            await ev("(() => { const n = __Q.BR.nodes.find(n => n.id === 'vd'); const cv = document.querySelector('#brain'), r = cv.getBoundingClientRect(); for (const ty of ['pointerdown', 'pointerup']) cv.dispatchEvent(new PointerEvent(ty, { pointerId: 9, clientX: r.left + n.q[0], clientY: r.top + n.q[1], bubbles: true })); })()"); await pg.wait_for_timeout(500)
            R[tag + "_info"] = await ev("(document.querySelector('#binfo') || {}).innerText")
            await pg.screenshot(path=f"/tmp/b3_{tag}_call.png")
            fps = await ev("new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); })")
            R[tag + "_raf"] = fps
            await ctx.close()
        R["errs"] = errs[:6]
        await b.close()
    for k, v in R.items(): print(f"{k}: {json.dumps(v, ensure_ascii=False)[:500]}")
asyncio.run(main())
