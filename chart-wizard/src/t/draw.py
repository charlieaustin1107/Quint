import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# Marking charts: the practice and "Spot it" questions use the full live chart (no future candles in it), and every
# tool draws: level, trend line, zone, measure; select, drag, delete, undo; marks survive the reveal and, on the live chart, a reload
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
from playwright.async_api import async_playwright
async def box(pg, sel):
    return await pg.evaluate(f"(b => ({{ x: b.left, y: b.top, w: b.width, h: b.height }}))(document.querySelector({json.dumps(sel)}).getBoundingClientRect())")
async def tap(pg, b, fx, fy):
    await pg.mouse.click(b["x"] + b["w"] * fx, b["y"] + b["h"] * fy)
async def drag(pg, b, f0, f1):
    await pg.mouse.move(b["x"] + b["w"] * f0[0], b["y"] + b["h"] * f0[1]); await pg.mouse.down()
    for k in range(1, 7): await pg.mouse.move(b["x"] + b["w"] * (f0[0] + (f1[0] - f0[0]) * k / 6), b["y"] + b["h"] * (f0[1] + (f1[1] - f0[1]) * k / 6))
    await pg.mouse.up()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []; R = {}; bad = []
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS): await pg.add_init_script(s)
        await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2500); ev = pg.evaluate
        await ev("__T.mkShow('home'); __T.closeSheet(); __T.ST.seenTut = true"); await pg.wait_for_timeout(800)
        # --- Spot it (strategy practice) ---
        await ev("__T.openSetup(__T.BEST.find(s => s.id === 'brk'))"); await pg.wait_for_timeout(1500)
        R["su_chart"] = await ev("(c => c && [c.B.n, __T.QT.su.i + 1 - Math.max(0, __T.QT.su.i - 70), !!document.querySelector('#suBody .lcbar'), c.B.t.length])(__T.LC_LIVE.get('suCv'))")
        if not R["su_chart"] or R["su_chart"][0] != R["su_chart"][1]: bad.append("spot-it chart shows candles after the question")
        if not R["su_chart"][2]: bad.append("no drawing toolbar on spot-it")
        await ev("document.querySelector('#suCv').scrollIntoView({ block: 'center' })"); await pg.wait_for_timeout(300)
        cb = await box(pg, "#suCv")
        await ev("document.querySelector('#suBody [data-lt=\"h\"]').click()"); await tap(pg, cb, 0.5, 0.35)
        await ev("document.querySelector('#suBody [data-lt=\"t\"]').click()"); await drag(pg, cb, (0.15, 0.3), (0.7, 0.6))
        await ev("document.querySelector('#suBody [data-lt=\"z\"]').click()"); await tap(pg, cb, 0.3, 0.45); await tap(pg, cb, 0.55, 0.55)  # tap, tap
        await ev("document.querySelector('#suBody [data-lt=\"m\"]').click()"); await drag(pg, cb, (0.2, 0.7), (0.6, 0.4))
        R["su_dr"] = await ev("__T.LC_LIVE.get('suCv').dr.map(d => d.k)"); R["meas"] = await ev("!!__T.LC_LIVE.get('suCv').meas")
        if R["su_dr"] != ["h", "t", "z"]: bad.append(f"drawings {R['su_dr']}")
        if not R["meas"]: bad.append("measure didn't show")
        await pg.screenshot(path="/tmp/draw_su.png")
        # select the level by tapping it, drag it up, delete it, then undo
        ch = "__T.LC_LIVE.get('suCv')"
        await ev(f"document.querySelector('#suBody [data-lt=\"cur\"]').click()")
        y0 = await ev(f"(c => c.yOf(c.dr[0].a.p) / c.geo().H)({ch})"); p0 = await ev(f"{ch}.dr[0].a.p")
        await tap(pg, cb, 0.85, y0); R["sel"] = await ev(f"{ch}.selD")
        if R["sel"] != 0: bad.append(f"tap didn't select the level: {R['sel']}")
        await drag(pg, cb, (0.85, y0), (0.85, y0 - 0.1)); p1 = await ev(f"{ch}.dr[0].a.p")
        if not p1 > p0: bad.append("dragging the level didn't move it")
        await ev("document.querySelector('#suBody [data-la=\"del\"]').click()"); n1 = await ev(f"{ch}.dr.length")
        await ev("document.querySelector('#suBody [data-la=\"undo\"]').click()"); n2 = await ev(f"{ch}.dr.length")
        if (n1, n2) != (2, 3): bad.append(f"delete/undo {n1} {n2}")
        # answer: the reveal keeps your marks and shades what happened next
        await ev("document.querySelector('[data-su=\"none\"]').click()"); await pg.wait_for_timeout(500)
        R["after_reveal"] = await ev(f"[{ch}.dr.length, {ch}.mark != null || !__T.QT.su.t, {ch}.B.n]")
        if R["after_reveal"][0] != 3: bad.append("marks lost on reveal")
        await ev("document.querySelector('#suCv').scrollIntoView({ block: 'center' })"); await pg.wait_for_timeout(200); await pg.screenshot(path="/tmp/draw_su2.png")
        # --- price practice ---
        await ev("__T.closeSheet(); __T.ST.prk = 'MNQ'; __T.openPrac('MNQ')"); await pg.wait_for_timeout(1500)
        R["pr_chart"] = await ev("(c => c && [c.B.n, !!document.querySelector('#prBody .lcbar'), !!__T.LC_LIVE.get('prCv2')])(__T.LC_LIVE.get('prCv'))")
        if not R["pr_chart"] or R["pr_chart"][0] != 100 or not R["pr_chart"][1]: bad.append(f"practice chart {R['pr_chart']}")
        await ev("document.querySelector('#prCv').scrollIntoView({ block: 'center' })"); await pg.wait_for_timeout(200); pb = await box(pg, "#prCv")
        await ev("document.querySelector('#prBody [data-lt=\"h\"]').click()"); await tap(pg, pb, 0.4, 0.4)
        await ev("document.querySelector('[data-g=\"dir\"][data-k=\"up\"]').click(); document.querySelector('[data-g=\"side\"][data-k=\"out\"]').click()"); await pg.wait_for_timeout(200)
        await ev("document.querySelector('#prGo').click()"); await pg.wait_for_timeout(500)
        R["pr_after"] = await ev("(c => [c.dr.length, c.mark, c.B.n])(__T.LC_LIVE.get('prCv'))")
        if R["pr_after"][0] != 1 or R["pr_after"][1] != 100: bad.append(f"practice reveal {R['pr_after']}")
        await ev("document.querySelector('#prCv').scrollIntoView({ block: 'center' })"); await pg.wait_for_timeout(200); await pg.screenshot(path="/tmp/draw_pr.png")
        # --- live chart: drawings saved per market and timeframe ---
        await ev("__T.closeSheet(); __T.mkShow('chart', 'MNQ')"); await pg.wait_for_timeout(2500)
        lb = await box(pg, "#hcCv")
        await ev("document.querySelector('#hmChart [data-lt=\"h\"]').click()"); await tap(pg, lb, 0.5, 0.3)
        await ev("document.querySelector('#hmChart [data-lt=\"z\"]').click()"); await drag(pg, lb, (0.3, 0.4), (0.6, 0.55))
        R["live_dr"] = await ev("__T.HC.chart.dr.map(d => d.k)")
        if R["live_dr"] != ["h", "z"]: bad.append(f"live drawings {R['live_dr']}")
        await pg.screenshot(path="/tmp/draw_live.png")
        await pg.wait_for_timeout(1800); await pg.reload(); await pg.wait_for_timeout(2500)
        await ev("__T.mkShow('chart', 'MNQ')"); await pg.wait_for_timeout(2000)
        R["live_after_reload"] = await ev("__T.HC.chart.dr.map(d => d.k)")
        if R["live_after_reload"] != ["h", "z"]: bad.append("live drawings not saved")
        R["bad"] = bad; R["errs"] = errs[:6]; await b.close()
    for k, v in R.items(): print(k, json.dumps(v, ensure_ascii=False)[:400])
asyncio.run(main())
