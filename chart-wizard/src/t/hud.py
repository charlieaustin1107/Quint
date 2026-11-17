import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# Session HUD and Lucid guard: the maths, the cards on the home page, the settings sheet, Quint's brief, and no extra calls
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
SPY = """(() => { window.__rtc = []; const h = setInterval(() => { const T = window.__tv; if (T && !T.__spy) { const f = T; window.__tv = (tool, input) => { window.__rtc.push(tool); return f(tool, input); }; window.__tv.__spy = 1; clearInterval(h); } }, 5); })()"""
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []; R = {}; bad = []
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS, SPY): await pg.add_init_script(s)
        await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2500); ev = pg.evaluate
        await ev("__T.mkShow('home'); __T.closeSheet(); __T.ST.seenTut = true"); await pg.wait_for_timeout(2000)
        R["hud"] = await ev("[!!document.querySelector('#hmSess .hud'), document.querySelector('#hudClk').textContent, (document.querySelector('.hudnx') || {}).innerText, __T.hudPhase(Date.now()).lab]")
        if not R["hud"][0] or ":" not in R["hud"][1]: bad.append("hud missing")
        R["setup_card"] = await ev("(document.querySelector('#hmLucid .lg.set') || {}).innerText")
        if not R["setup_card"]: bad.append("lucid setup card missing")
        R["brief_before"] = await ev("__T.lgBrief()")
        if R["brief_before"] is not None: bad.append("brief should be empty before setup")
        await pg.screenshot(path="/tmp/hud_home0.png")
        # Open the sheet, type a day the owner might see on Lucid, save
        await ev("document.querySelector('#lgOpen').click()"); await pg.wait_for_timeout(400)
        await pg.screenshot(path="/tmp/hud_sheet.png")
        for k, v in [("lgBal", "50850"), ("lgPeak", "51200"), ("lgToday", "-350"), ("lgBest", "900"), ("lgStop", "20"), ("lgDll", "1200")]:
            await pg.fill("#" + k, v)
        await ev("document.querySelector('#lgSave').click()"); await pg.wait_for_timeout(400)
        c = await ev("(c => ({ floor: c.floor, roomMll: c.roomMll, roomDay: c.roomDay, room: c.room, profit: c.profit, perStop: c.perStop, maxN: c.maxN, safeN: c.safeN, share: c.share, lvl: c.lvl, dayLimit: c.dayLimit }))(__T.lgCalc())")
        R["calc"] = c
        # floor = min(51200 - 2000, 50000) = 49200; room to max loss 1650; daily room 1200 - 350 = 850; one MNQ 20-pt stop = $40 + $2.50 costs
        exp = {"floor": 49200, "roomMll": 1650, "roomDay": 850, "room": 850, "profit": 850, "perStop": 42.5, "maxN": 20, "safeN": 5, "dayLimit": True}
        for k, v in exp.items():
            if c[k] != v: bad.append(f"{k}={c[k]} want {v}")
        if abs(c["share"] - 900 / 850 * 100) > 0.01: bad.append("share")
        R["card"] = await ev("document.querySelector('#hmLucid .lg').innerText")
        if "850" not in R["card"] or "20 MNQ" not in R["card"]: bad.append("card text")
        await pg.screenshot(path="/tmp/hud_home1.png")
        await ev("document.querySelector('#hmLucid').scrollIntoView()"); await pg.wait_for_timeout(200); await pg.screenshot(path="/tmp/hud_lucid.png")
        # the floor locks at the starting balance once it gets there
        await ev("__T.ST.lucid.peak = 53500; __T.ST.lucid.bal = 53000"); c2 = await ev("__T.lgCalc().floor")
        if c2 != 50000: bad.append(f"locked floor {c2}")
        await ev("__T.ST.lucid.lock = false"); c3 = await ev("__T.lgCalc().floor")
        if c3 != 51500: bad.append(f"unlocked floor {c3}")
        await ev("Object.assign(__T.ST.lucid, { lock: true, peak: 51200, bal: 50850 })")
        R["brief"] = await ev("__T.lgBrief()")
        if not R["brief"] or "REAL Lucid" not in R["brief"] or "$850" not in R["brief"]: bad.append("brief text")
        # Quint's brief for MNQ carries the guard; one for a stock doesn't
        R["in_dkBrief"] = await ev("__T.dkBrief(__T.MKDEF.MNQ).then(r => r.text.includes('LUCID GUARD'))")
        if not R["in_dkBrief"]: bad.append("dkBrief missing guard")
        # survives a reload (saved on the phone)
        await pg.wait_for_timeout(300); await pg.reload(); await pg.wait_for_timeout(2500)
        await ev("__T.mkShow('home'); __T.closeSheet()"); await pg.wait_for_timeout(1200)
        R["after_reload"] = await ev("[__T.lgCalc().room, !!document.querySelector('#hmLucid .lg:not(.set)')]")
        if R["after_reload"] != [850, True]: bad.append("not saved")
        n0 = await ev("window.__rtc.length"); await pg.wait_for_timeout(3500); n1 = await ev("window.__rtc.length")
        R["calls_while_clock_ticks"] = n1 - n0
        if n1 != n0: bad.append("the clock made TradingView calls")
        R["bad"] = bad; R["errs"] = errs[:6]; await b.close()
    for k, v in R.items(): print(k, json.dumps(v, ensure_ascii=False)[:500])
asyncio.run(main())
