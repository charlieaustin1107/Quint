import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
import asyncio, json, re, sys
sys.argv = [sys.argv[0], "none"]
src = open(CW + '/t/quint.py').read().split("async def run(")[0]
exec(src)
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2); pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
        await pg.clock.install(time=T0); await pg.clock.resume()
        await pg.add_init_script(TV); await pg.add_init_script(MOCK); await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2200)
        ev = pg.evaluate; R = {}
        await ev("__T.mkShow('home'); __T.closeSheet(); __T.ST.seenTut = true"); await pg.wait_for_timeout(800)
        await ev("__T.dkFeed('CME_MINI:MNQ1!', null, 0)"); await pg.wait_for_timeout(600) # the strategies sheet re-tests on candles already on the phone; it doesn't fetch them itself
        await pg.tap('#hmTabs [data-tab="quint"]'); await pg.wait_for_timeout(600); await pg.tap('.qstools [data-qt="best"]'); await pg.wait_for_timeout(1500)
        R["rows"] = await ev("__T.BS.rows.map(r => [r.s.id, r.all.n, +r.all.pf.toFixed(2), +r.all.tot.toFixed(1), r.is.n, r.os.n, r.held])")
        R["days"] = await ev("__T.BS.days"); R["open"] = await ev("__T.BS.open")
        R["orb_tr"] = await ev("(r => r.tr.slice(0, 3).map(x => [new Date(__T.BS.B.t[x.a] * 1000).toISOString().slice(5, 16), x.i - x.a, x.j - x.i, x.d, +x.e.toFixed(1), +x.st.toFixed(1), x.tg && +x.tg.toFixed(1), +x.x.toFixed(1), +x.r.toFixed(2), +x.hi.toFixed(1), +x.lo.toFixed(1)]))(__T.BS.rows.find(r => r.s.id === 'orb15'))")
        R["orb_check"] = await ev("(r => { const B = __T.BS.B, C = __T.blClock(B); return r.tr.every(x => C.em[x.a] === 570 && C.em[x.i] >= 585 && C.em[x.i] < 690 && C.em[x.j] < 960 && C.ed[x.j] === C.ed[x.a] && (x.d > 0 ? B.c[x.i] > x.hi : B.c[x.i] < x.lo) && Math.abs(x.e - B.o[x.i + 1]) < 1e-9); })(__T.BS.rows.find(r => r.s.id === 'orb15'))")
        await ev("document.querySelector('[data-bs=\"orb15\"]').click()"); await pg.wait_for_timeout(200)
        if not await ev("__T.BS.open === 'orb15'"): await ev("document.querySelector('[data-bs=\"orb15\"]').click()")
        await pg.wait_for_timeout(900); await pg.screenshot(path="/tmp/b_1.png")
        R["tv_card"] = await ev("[(document.querySelector('.bscard.open .bstv') || {innerText: 'none'}).innerText.slice(0, 400), JSON.stringify(__T.ST.bstv || null).slice(0, 200)]")
        await ev("document.querySelector('.bscard.open [data-bspn]') && document.querySelector('.bscard.open [data-bspn]').click()"); await pg.wait_for_timeout(700)
        R["tv_save"] = await ev("(document.querySelector('.bscard.open .bsok') || document.querySelector('.bscard.open [data-bspn]') || {innerText: 'none'}).innerText.slice(0, 200)")
        await ev("document.querySelector('.bscard.open .bstv').scrollIntoView({block:'center'})"); await pg.screenshot(path="/tmp/b_1b.png")
        await pg.tap('[data-bse="orb15"]'); await pg.wait_for_timeout(300); R["ex"] = await ev("[document.querySelectorAll('#bsBody canvas.prcv').length, document.querySelector('#bsx0').width > 0]")
        await ev("document.querySelector('#bsx0').scrollIntoView({block:'center'})"); await pg.screenshot(path="/tmp/b_2.png")
        await pg.tap('[data-bsm="orb15"]'); await pg.wait_for_timeout(200); R["mine"] = await ev("[__T.ST.mystrat.name, __T.ST.mystrat.rules.slice(0, 60)]")
        await pg.tap('[data-bsp="orb15"]'); await pg.wait_for_timeout(900)
        res = []
        for k in range(6):
            truth = await ev("(U => U.t ? (U.t.d > 0 ? 'buy' : 'sell') : 'none')(__T.QT.su)")
            await pg.tap(f'[data-su="{truth if k % 2 == 0 else "none"}"]'); await pg.wait_for_timeout(150)
            res.append([truth, await ev("document.querySelector('.prres b').textContent")])
            if k == 0: await pg.screenshot(path="/tmp/b_3.png")
            await pg.tap("#suNext"); await pg.wait_for_timeout(150)
        R["setup"] = res; R["su_stats"] = await ev("[__T.ST.mnqp.su, __T.ST.mnqp.suOk]")
        await pg.tap("#suBack"); await pg.wait_for_timeout(600)
        await ev("document.querySelector('.bscard.open [data-bsq]').click()"); await pg.wait_for_timeout(900)
        R["askq"] = await ev("[__T.MK.screen, (document.querySelector('#qdkB .m, #qdkB .qdkm') || {innerText: ''}).innerText.slice(0, 160)]")
        await ev("__T.closeSheet(); __T.openLearn()"); await pg.wait_for_timeout(200); R["lesson"] = await ev("document.querySelector('#sheet .lessonbox summary').textContent")
        await ev("__T.closeSheet(); __T.openSetup(__T.BEST[0])"); await pg.wait_for_timeout(900); R["su_pull"] = await ev("[__T.QT.su.tr.length, !!document.querySelector('#suCv')]")
        R["errs"] = errs[:6]
        for k, v in R.items(): print(f"{k}: {json.dumps(v, ensure_ascii=False)[:600]}")
        await b.close()
asyncio.run(main())
