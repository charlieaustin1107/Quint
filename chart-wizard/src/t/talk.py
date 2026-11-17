import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# Normal conversation (no TradingView calls, the quick model, a friendly brief) and voice mode (listen, send, answer out loud,
# listen again; the keyboard-dictation fallback when the phone won't let the page listen)
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
FAKE_TTS = open(CW + '/t/voice.py').read().split('FAKE_TTS = """')[1].split('"""')[0]
SPY = """(() => { window.__rtc = 0; const h = setInterval(() => { const T = window.__tv; if (T && !T.__spy) { const f = T; window.__tv = (tool, input) => { window.__rtc++; return f(tool, input); }; window.__tv.__spy = 1; clearInterval(h); } }, 5); })()"""
CAP = """(() => { const h = setInterval(() => { const c = window.claude; if (!c || c.__cap) return; const u = c.use; c.use = async n => { const r = await u(n); if (n !== 'sample' || !r) return r; const f = (input, opts) => { window.__lastIn = Array.isArray(input) ? input : [{ content: String(input) }]; return r(input, opts); }; Object.assign(f, r); f.limits = r.limits; return f; }; c.__cap = 1; clearInterval(h); }, 1); })()"""
# a fake speech recogniser: hears whatever window.__say holds next
REC = """(() => { window.__heard = []; window.__recStarts = 0;
  window.SpeechRecognition = window.webkitSpeechRecognition = function () { const me = this; this.start = () => { window.__recStarts++; const t = (window.__say || []).shift(); setTimeout(() => { if (t) { me.onresult && me.onresult({ results: [[{ transcript: t }]] }); window.__heard.push(t); } me.onend && me.onend(); }, 120); }; this.stop = () => {}; this.abort = () => {}; };
})()"""
from playwright.async_api import async_playwright
async def run(no_rec):
    R = {}; bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=1)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS, SPY, CAP, FAKE_TTS) + (() if no_rec else (REC,)): await pg.add_init_script(s)
        await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2500); ev = pg.evaluate
        await ev("__T.mkShow('home'); __T.closeSheet(); __T.ST.seenTut = true"); await pg.wait_for_timeout(500)
        await ev("__T.mkShow('chart', 'MNQ')"); await pg.wait_for_timeout(1500); await ev("document.querySelector('#qFab').click()"); await pg.wait_for_timeout(500)
        async def wait_idle():
            for _ in range(60):
                if not await ev("__T.DK.busy"): break
                await pg.wait_for_timeout(150)
        async def ask(q):
            n0 = await ev("window.__rtc"); await pg.fill("#qdkI", q); await pg.press("#qdkI", "Enter"); await pg.wait_for_timeout(200); await wait_idle()
            return await ev("window.__rtc") - n0, await ev("window.__ds.slice(-1)[0]"), await ev("window.__lastIn[window.__lastIn.length - 1].content.slice(0, 300) + ' ||| ' + window.__lastIn[0].content")
        if not no_rec:
            # 1) small talk: no TradingView calls, the quick model, no tools or screenshot, the friendly brief
            calls, ds, last = await ask("hey quint, how are you doing today?"); R["chat"] = [calls, ds["model"], ds["tools"], ds["img"], last[:120]]
            if calls or ds["model"] != "claude-opus-5-5" or ds["tools"] or ds["img"] or "just talking" not in last or "LIVE BRIEF" in last: bad.append(f"small talk went the trading way: {R['chat']}")
            # 2) a trading question still gets the full read
            calls, ds, last = await ask("buy or sell MNQ now?"); R["trade"] = [calls, ds["model"], ds["tools"]]
            if not calls or ds["model"] == "claude-opus-5-5" or "LIVE BRIEF" not in last: bad.append(f"trade question lost the brief: {R['trade']}")
            # 3) a short follow-up to it stays a trading question
            calls, ds, last = await ask("why?"); R["followup"] = ds["model"]
            if ds["model"] == "claude-opus-5-5": bad.append("follow-up treated as small talk")
            R["classify"] = await ev("['thanks!', 'lol', 'I am so stressed today', 'tell me a joke', 'what is VWAP', 'how was the open', 'should I take this trade', 'i lost 300 on nq'].map(t => [t, __T.dkIsChat(t, null, {})])")
            want = [True, True, True, True, False, True, False, False]  # 'how was the open' has no trading word: small talk is fine
            if [x[1] for x in R["classify"]][:4] != want[:4] or R["classify"][4][1] or R["classify"][6][1] or R["classify"][7][1]: bad.append(f"classifier {R['classify']}")
            # 4) voice mode: tap the mic, it hears you, sends, answers out loud, then listens again
            await ev("window.__said.length = 0; window.__say = ['hey, how is your day going', 'buy or sell MNQ now?']")
            await ev("document.querySelector('#qdkMic').click()"); await pg.wait_for_timeout(400)
            R["vm_state1"] = await ev("[__T.VM.on, __T.VM.st, (document.querySelector('#qdkVm') || {}).innerText]")
            for _ in range(80):
                if await ev("window.__recStarts >= 2 && !__T.DK.busy && __T.VM.st !== 'speak' && __T.VM.st !== 'think' && window.__heard.length >= 2"): break
                await pg.wait_for_timeout(150)
            await wait_idle(); await pg.wait_for_timeout(800)
            R["vm_heard"] = await ev("window.__heard"); R["vm_recStarts"] = await ev("window.__recStarts")
            msgs = await ev("__T.dkMsgs('MNQ').filter(x => x.r === 'u').slice(-2).map(x => x.t)"); R["vm_msgs"] = msgs
            said = [x["t"] for x in await ev("window.__said") if x != "<cancel>"]; R["vm_said"] = said[:6]
            if msgs != ["hey, how is your day going", "buy or sell MNQ now?"]: bad.append("voice mode didn't send what it heard")
            if len(said) < 2: bad.append("voice mode didn't answer out loud")
            if R["vm_recStarts"] < 2: bad.append("didn't listen again after answering")
            vh = await ev("window.__lastIn[window.__lastIn.length - 1].content.includes('VOICE MODE')")
            if not vh: bad.append("Quint wasn't told he's being heard out loud")
            await pg.screenshot(path="/tmp/talk_vm.png")
            await ev("document.querySelector('#qdkVm .vmx').click()"); R["vm_end"] = await ev("[__T.VM.on, !!document.querySelector('#qdkVm')]")
            if R["vm_end"] != [False, False]: bad.append("End didn't stop voice mode")
        else:
            # 5) no speech recognition in this app: keyboard dictation, and Quint still answers out loud
            await ev("delete window.webkitSpeechRecognition; delete window.SpeechRecognition; window.__said.length = 0")
            await ev("document.querySelector('#qdkMic').click()"); await pg.wait_for_timeout(300)
            R["fallback"] = await ev("[__T.VM.on, __T.VM.st, (document.querySelector('#qdkVm') || {}).innerText]")
            if R["fallback"][1] != "type" or "keyboard" not in (R["fallback"][2] or ""): bad.append(f"fallback {R['fallback']}")
            await pg.fill("#qdkI", "thanks mate"); await pg.press("#qdkI", "Enter"); await pg.wait_for_timeout(300); await wait_idle(); await pg.wait_for_timeout(500)
            said = [x["t"] for x in await ev("window.__said") if x != "<cancel>"]; R["fallback_said"] = said[:3]
            if not said: bad.append("typed message in voice mode wasn't answered out loud")
            R["fallback_after"] = await ev("__T.VM.st")
            if R["fallback_after"] != "type": bad.append("fallback state after answer")
            await pg.screenshot(path="/tmp/talk_vm_kb.png")
        R["bad"] = bad; R["errs"] = errs[:6]; await b.close()
    return R
async def main():
    for no_rec in (False, True):
        R = await run(no_rec)
        for k, v in R.items(): print(("kb_" if no_rec else "") + k, json.dumps(v, ensure_ascii=False)[:400])
asyncio.run(main())
