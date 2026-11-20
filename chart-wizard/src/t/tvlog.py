import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# The TradingView call log: every call is listed with what it fetched and why (opening, you, Quint, automatic),
# saved copies and refusals don't count, and both apps show their list
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []; R = {}; bad = []
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS): await ctx.add_init_script(s)
        await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2500); ev = pg.evaluate
        await ev("__T.mkShow('home'); __T.closeSheet(); __T.ST.seenTut = true"); await pg.wait_for_timeout(1500)
        L0 = await ev("__T.tvLog().map(e => [e.w, e.y, e.st || '', e.a])"); R["opening"] = L0[:4]
        if not L0 or not all(x[1] == "the app opening" for x in L0): bad.append(f"opening calls not labelled: {L0[:3]}")
        if not any("Prices for" in x[0] for x in L0): bad.append("the price batch isn't logged")
        # you open MNQ and ask Quint: those calls are Quint's
        await ev("__T.mkShow('chart', 'MNQ')"); await pg.wait_for_timeout(1200); await pg.tap("#qFab"); await pg.wait_for_timeout(300)
        n0 = await ev("__T.tvLog().length"); await pg.tap('#qdkQ [data-qq="call"]')
        for _ in range(50):
            if not await ev("__T.DK.busy"): break
            await pg.wait_for_timeout(200)
        L1 = await ev(f"__T.tvLog().slice(0, __T.tvLog().length - {n0}).map(e => [e.w, e.y])"); R["quint"] = L1[:5]
        if not L1 or not any(x[1] == "Quint answering you" for x in L1): bad.append(f"Quint's calls not labelled: {L1[:3]}")
        if any(x[1] == "the app opening" for x in L1): bad.append("Quint's calls labelled as opening")
        if not any("MNQ" in x and "5-minute candles" in x for x in await ev("__T.tvLog().map(e => e.w)")): bad.append("candle calls not described")
        # each logged call was counted once; a saved copy is then taken off the count
        R["count"] = await ev("[__T.tvUsed(), __T.tvLog().filter(e => !e.st || e.st === 'error').length]")
        if R["count"][0] != R["count"][1]: bad.append(f"count {R['count']} doesn't match the log")
        await ev("(e => __T.tvLogEnd(e, 'saved'))(__T.tvLog().find(e => !e.st))")
        R["after_saved"] = await ev("[__T.tvUsed(), __T.tvLog().filter(e => e.st === 'saved').length]")
        if R["after_saved"] != [R["count"][0] - 1, 1]: bad.append(f"saved copy still counted {R['after_saved']}")
        # the list in "TradingView calls"
        await ev("__T.openTvPlan()"); await pg.wait_for_timeout(300)
        R["sheet"] = await ev("[document.querySelectorAll('#sheet ul.tvlog li.tvl').length, (document.querySelector('#sheet ul.tvlog') || {}).innerText.slice(0, 220)]")
        if R["sheet"][0] < 3 or "saved copy, free" not in R["sheet"][1] + await ev("document.querySelector('#sheet ul.tvlog').innerText"): bad.append(f"sheet list {R['sheet']}")
        await ev("document.querySelector('#sheet ul.tvlog').scrollIntoView({ block: 'center' })"); await pg.wait_for_timeout(200); await pg.screenshot(path="/tmp/tvlog_cw.png")
        # kept across a reload
        await pg.wait_for_timeout(1200); n = await ev("__T.tvLog().length"); await pg.reload(); await pg.wait_for_timeout(2500)
        R["reload"] = [n, await ev("__T.tvLog().length")]
        if R["reload"][1] < n: bad.append("log lost on reload")
        # Quint Brain: its own list in Settings
        qb = await ctx.new_page(); qb.on("pageerror", lambda e: errs.append("QB " + str(e))); await qb.clock.install(time=T0); await qb.clock.resume()
        await qb.goto("file://" + QB + "/../index.html"); await qb.wait_for_timeout(4500)
        await qb.tap("#setb"); await qb.wait_for_timeout(300); await qb.evaluate("document.querySelector('details.tvlogd').open = true; document.querySelector('details.tvlogd').scrollIntoView({ block: 'start' })"); await qb.wait_for_timeout(200)
        R["qb"] = await qb.evaluate("[document.querySelectorAll('details.tvlogd li.tvl').length, (document.querySelector('details.tvlogd') || {}).innerText.slice(0, 200)]")
        if R["qb"][0] < 1 or "Quint Brain made" not in R["qb"][1]: bad.append(f"Quint Brain list {R['qb']}")
        await qb.screenshot(path="/tmp/tvlog_qb.png")
        R["bad"] = bad; R["errs"] = errs[:6]; await b.close()
    for k, v in R.items(): print(k, json.dumps(v, ensure_ascii=False)[:400])
asyncio.run(main())
