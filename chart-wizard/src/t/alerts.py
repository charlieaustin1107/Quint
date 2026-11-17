import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# Quint's own screen, the tab bar, the simpler home and phone alerts to TradingView
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_ARGV = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _ARGV
from playwright.async_api import async_playwright
async def run(b, w, h, mob, tag, out):
    ctx = await b.new_context(viewport={"width": w, "height": h}, has_touch=mob, is_mobile=mob, device_scale_factor=2 if mob else 1)
    pg = await ctx.new_page(); errs = []; R = {}
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    await pg.clock.install(time=T0); await pg.clock.resume()
    await pg.add_init_script(TV); await pg.add_init_script(TV2); await pg.add_init_script(MOCK); await pg.add_init_script(DS)
    await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2200)
    tap = (lambda sel: pg.tap(sel)) if mob else (lambda sel: pg.click(sel))
    ev = pg.evaluate
    async def idle():
        for _ in range(50):
            if not await ev("__T.DK.busy"): return
            await pg.wait_for_timeout(150)
    await ev("__T.mkShow('home'); __T.closeSheet(); __T.ST.seenTut = true"); await pg.wait_for_timeout(1500)
    R["home_hdr"] = await ev("[!!document.querySelector('#hmGo'), !!document.querySelector('#hmLTb'), [...document.querySelectorAll('#hmHome .hmh button')].map(b => b.getAttribute('aria-label') || b.textContent)]")
    R["tabs"] = await ev("[!document.querySelector('#hmTabs').hidden, [...document.querySelectorAll('#hmTabs [data-tab]')].map(b => b.innerText.trim() + (b.getAttribute('aria-current') ? '*' : ''))]")
    R["hero"] = await ev("[document.querySelector('#hmHero .hero').dataset.k, document.querySelector('#hmHero .hero').innerText.replace(/\\n+/g, ' | ').slice(0, 160)]")
    R["ask_bar"] = await ev("(document.querySelector('#hmQT') || {}).innerText")
    R["lt_empty"] = await ev("document.querySelector('#hmLT').innerHTML.length")
    R["foot"] = await ev("document.querySelector('.hmfoot').innerText")
    R["btc_idx"] = await ev("[...document.querySelectorAll('#hmFut .mtile')].map(t => t.dataset.key).includes('BTC')")
    await pg.screenshot(path=f"/tmp/a_{tag}_home.png")
    await tap('#hmFutG [data-fg="cry"]'); await pg.wait_for_timeout(900)
    R["btc_cry"] = await ev("[...document.querySelectorAll('#hmFut .mtile')].map(t => t.dataset.key + ' ' + t.querySelector('.mpx').textContent)")
    await tap('#hmFutG [data-fg="idx"]'); await pg.wait_for_timeout(300)
    # Quint's own tab
    await tap('#hmTabs [data-tab="quint"]'); await pg.wait_for_timeout(800)
    R["qs"] = await ev("[__T.MK.screen, __T.DK.k, document.querySelector('#qsMk').value, document.querySelectorAll('#qsMk option').length, document.querySelector('#qdkSub').textContent, [...document.querySelectorAll('.qstools .chip')].map(b => b.textContent).join(' / '), document.querySelector('#qdkI').placeholder, (document.querySelector('.qdkhi') || {innerText: ''}).innerText.slice(0, 80), document.querySelector('#hmTabs [aria-current]').dataset.tab]")
    R["qs_layout"] = await ev("(() => { const f = document.querySelector('#qdkF').getBoundingClientRect(), t = document.querySelector('#hmTabs').getBoundingClientRect(), b = document.querySelector('#qdkB').getBoundingClientRect(); return [Math.round(f.bottom), Math.round(t.top), Math.round(t.bottom), Math.round(b.height), innerHeight]; })()")
    await pg.screenshot(path=f"/tmp/a_{tag}_quint0.png")
    await pg.select_option("#qsMk", "ES"); await pg.wait_for_timeout(500)
    R["qs_es"] = await ev("[__T.DK.k, __T.HS().qk, document.querySelector('#qdkSub').textContent, document.querySelector('#qdkI').placeholder]")
    await pg.select_option("#qsMk", "MNQ"); await pg.wait_for_timeout(400)
    await tap('#qdkQ [data-qq="call"]'); await pg.wait_for_timeout(300); await idle()
    R["qs_brief"] = await ev("(/USER'S CHART:[^\\n]*/.exec(window.__brief) || [''])[0]")
    R["qs_card"] = await ev("(document.querySelector('#qdkB .qcall') || {innerText:''}).innerText.replace(/\\n+/g, ' | ')")
    R["qs_chips"] = await ev("[...document.querySelectorAll('#qdkB .qcals .chip')].map(b => b.textContent)")
    await pg.screenshot(path=f"/tmp/a_{tag}_quint1.png")
    # stop alert from the call card
    await ev("document.querySelector('#qdkB [data-cal$=\":s\"]').click()"); await pg.wait_for_timeout(600)
    R["stop_alert"] = await ev("(a => a && [a.symbol, a.price, a.condition, a.mobile_push, a.auto_deactivate, a.resolution, a.name, a.message, Math.round((Date.parse(a.expiration) - Date.now()) / 6e4)])(window.__alert)")
    R["stop_chip"] = await ev("[...document.querySelectorAll('#qdkB .qcals .chip')].map(b => b.textContent + (b.disabled ? ' (off)' : ''))")
    R["toast1"] = await ev("document.querySelector('#hmtoast').textContent")
    R["al_count"] = await ev("[document.querySelector('#qdkAl').textContent, __T.dkAls().length]")
    # plan limit full: the real reason shows
    await ev("window.__alertFail = 'Maximum number of active alerts reached for your plan'"); await ev("document.querySelector('#qdkB [data-cal$=\":t\"]').click()"); await pg.wait_for_timeout(600)
    R["limit"] = await ev("[document.querySelector('#hmtoast').textContent, document.querySelector('#qdkB [data-cal$=\":t\"]').textContent]")
    await ev("window.__alertFail = null")
    # a limit-entry call with ALERT lines
    await pg.fill("#qdkI", "Where's a pullback buy?"); await pg.press("#qdkI", "Enter"); await pg.wait_for_timeout(200); await idle()
    R["lim_card"] = await ev("[...document.querySelectorAll('#qdkB .qcall')].pop().innerText.replace(/\\n+/g, ' | ')")
    R["lim_btns"] = await ev("[...document.querySelectorAll('#qdkB [data-alert]')].map(b => b.textContent)")
    R["lim_clean"] = await ev("/ALERT:/.test(document.querySelector('#qdkB').innerText)")
    await ev("[...document.querySelectorAll('#qdkB [data-alert]')][0].click()"); await pg.wait_for_timeout(600)
    R["line_alert"] = await ev("(a => [a.price, a.condition, a.name, a.message])(window.__alert)")
    await ev("[...document.querySelectorAll('#qdkB [data-cal$=\":e\"]')].pop().click()"); await pg.wait_for_timeout(600)
    R["entry_alert"] = await ev("(a => [a.price, a.condition, a.name, a.message, Math.round((Date.parse(a.expiration) - Date.now()) / 6e4)])(window.__alert)")
    await pg.screenshot(path=f"/tmp/a_{tag}_quint2.png")
    # the alerts screen: list, fired log, delete with two taps
    await ev("window.__alLog = [{ name: 'Quint ▲ BUY MNQ 27,300.00', fire_time: new Date(Date.now() - 36e5).toISOString(), symbol: 'CME_MINI:MNQ1!' }]")
    await tap("#qdkAl"); await pg.wait_for_timeout(900)
    R["al_view"] = await ev("document.querySelector('#qdkB').innerText.replace(/\\n+/g, ' | ').slice(0, 700)")
    await pg.screenshot(path=f"/tmp/a_{tag}_alerts.png")
    n0 = await ev("document.querySelectorAll('#qdkB [data-aldel]').length")
    await ev("document.querySelector('#qdkB [data-aldel]').click()"); await pg.wait_for_timeout(200)
    R["del1"] = await ev("[document.querySelector('#qdkB [data-aldel]').textContent, window.__del || null]")
    await ev("document.querySelector('#qdkB [data-aldel]').click()"); await pg.wait_for_timeout(900)
    R["del2"] = await ev("[window.__del, document.querySelectorAll('#qdkB [data-aldel]').length]"); R["del_n0"] = n0
    await tap("#qdkBack"); await pg.wait_for_timeout(300)
    # set_alert only when asked
    R["tool_gate"] = await ev("""(async () => { const T = __T.dkTools(__T.MKDEF.MNQ, null).find(t => t.name === 'set_alert'), o = [];
      __T.DK.lastQ = "what's the call?"; try { o.push(await T.execute({ price: 27400, action: 'BUY' })); } catch (e) { o.push('ERR ' + e.message); }
      __T.DK.lastQ = 'set an alert for 27400 please'; __T.DK.alN = 0; o.push(await T.execute({ price: 27400, action: 'BUY', note: 'stop 27380' })); o.push(window.__alert.condition); return o; })()""")
    R["errof"] = await ev("[__T.tvErrOf({ success: true, message: 'x', alert_id: 1 }), __T.tvErrOf({ success: false, error: 'e1' }), __T.tvErrOf({ message: 'Symbol not found' }), __T.tvErrOf('text'), __T.tvErrOf({ data: [1] })]")
    R["parse"] = await ev("__T.dkAlertLines('ALERT: SELL 27,300.50 · stop 27,340\\nALERT: 27420 crossing down\\n**ALERT:** EXIT 27,250 - take profit\\n```pine\\nALERT: 1 nope\\n```\\nALERT: MNQ1! 9 junk')")
    # chart from Quint's screen, and back
    await tap("#qsChart"); await pg.wait_for_timeout(1200)
    R["to_chart"] = await ev("[__T.MK.screen, __T.MK.sel, document.querySelector('#hmTabs').hidden, !!document.querySelector('#qFab')]")
    await tap("#hcBack"); await pg.wait_for_timeout(700)
    R["back_quint"] = await ev("[__T.MK.screen, document.querySelectorAll('#qdkB .qdkm').length]")
    # tabs
    for t in ["trades", "news", "home"]:
        await tap(f'#hmTabs [data-tab="{t}"]'); await pg.wait_for_timeout(600)
        R["tab_" + t] = await ev("[__T.MK.screen, document.querySelector('#hmTabs [aria-current]') && document.querySelector('#hmTabs [aria-current]').dataset.tab, !!document.querySelector('#ltBack, #nwBack')]")
        if t == "trades": await pg.screenshot(path=f"/tmp/a_{tag}_trades.png")
    await tap('#hmTabs [data-tab="learn"]'); await pg.wait_for_timeout(1500)
    R["tab_learn"] = await ev("[__T.MK.screen, (document.querySelector('#sheet h2') || {}).textContent, [...document.querySelectorAll('.bscard .nm b')].map(b => b.textContent), (document.querySelector('.bsteps') || {innerText: ''}).innerText.slice(0, 300)]")
    await pg.screenshot(path=f"/tmp/a_{tag}_learn.png"); await ev("__T.closeSheet()"); await pg.wait_for_timeout(300)
    # the menu's tiles
    await ev("document.querySelector('#hmNav').click()"); await pg.wait_for_timeout(500)
    R["menu"] = await ev("[[...document.querySelectorAll('#nav .ntile')].map(b => b.innerText.trim()), [...document.querySelectorAll('#nav h6')].map(h => h.textContent), document.querySelectorAll('#nav .ni').length]")
    await pg.screenshot(path=f"/tmp/a_{tag}_menu.png")
    await ev("document.querySelector('#nav .ntile[data-go=\"qt:chat\"]').click()"); await pg.wait_for_timeout(700)
    R["menu_quint"] = await ev("[__T.MK.screen, !document.querySelector('#nav').classList.contains('open')]")
    R["errs"] = errs[:8]; out[tag] = R; await ctx.close()
async def main():
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"])
        which = sys.argv[1] if len(sys.argv) > 1 else "m"
        if which in ("all", "m"): await run(b, 390, 844, True, "m", out)
        if which in ("all", "d"): await run(b, 1280, 800, False, "d", out)
        await b.close()
    for k, v in out.items():
        print("=====", k)
        for kk, vv in v.items(): print(f"{kk}: {json.dumps(vv, ensure_ascii=False)[:900]}")
asyncio.run(main())
