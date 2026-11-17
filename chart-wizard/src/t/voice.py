import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
# Quint's voice: what he says out loud (call first, trader words, no symbols), one sentence per utterance,
# the speed setting obeyed, the best phone voice chosen, and Claude's own voice used where it exists
import asyncio, json, sys
src = open(CW + '/t/dock.py').read().split("\nasync def run(")[0]
_A = list(sys.argv); sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = _A
# A fake iPhone speech engine that records every utterance instead of speaking
FAKE_TTS = """(() => {
  const voices = [{ name: 'Fred', lang: 'en-US', voiceURI: 'com.apple.speech.synthesis.voice.Fred', localService: true },
    { name: 'Samantha', lang: 'en-US', voiceURI: 'com.apple.voice.compact.en-US.Samantha', localService: true },
    { name: 'Ava (Premium)', lang: 'en-US', voiceURI: 'com.apple.voice.premium.en-US.Ava', localService: true }];
  window.__said = [];
  const S = { speaking: false, getVoices: () => voices, cancel() { window.__said.push('<cancel>'); }, speak(u) { window.__said.push({ t: u.text, rate: u.rate, pitch: u.pitch, voice: u.voice && u.voice.name }); setTimeout(() => u.onend && u.onend(), 5); }, onvoiceschanged: null };
  Object.defineProperty(window, 'speechSynthesis', { value: S, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; this.rate = 1; this.pitch = 1; };
})()"""
RAW = ("**BUY MNQ now: stop 27,317.25, target 27,407.25, 64%**\n### Why\nThe hourly trend is up and price is holding VWAP (27,247.88). "
       "Last 5 min +4.91 pts · 1m ◆ 5m ▲ 15m ▲.\n### Levels\n- **PDL** 27317.25\n- ORH 27,348.67 → ONH 27,347.66\n### Plan\nBuy now, stop below the swing low. Target 2.0R.\n"
       "PRICE: 27347.25 MNQ\nCALL: BUY · ENTRY NOW · STOP 27317.25 · TARGET 27407.25 · CONF 64% · HOLD 45m")
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); errs = []; R = {}; bad = []
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=1)
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.clock.install(time=T0); await pg.clock.resume()
        for s in (TV, TV2, MOCK, DS, FAKE_TTS): await pg.add_init_script(s)
        await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2500); ev = pg.evaluate
        await ev("__T.mkShow('home'); __T.closeSheet(); __T.ST.seenTut = true"); await pg.wait_for_timeout(800)
        script = await ev(f"__T.sayScript({json.dumps(RAW)}, 'MNQ')"); R["script"] = script
        must = ["Buy M N Q.", "In at the market, stop 27,317 and a quarter, that's 30 points of risk, target 27,407 and a quarter.", "about 64 percent",
                "Here's why.", "V-wap", "yesterday's low 27,317 and a quarter", "the opening range high", "plus 4.91 points", "1-minute flat, 5-minute up, 15-minute up", "2 R", "the opening range high 27,348.67 to the overnight high", "The plan."]
        for m in must:
            if m.lower() not in script.lower(): bad.append("missing: " + m)
        for m in ["CALL", "PRICE:", " 88.", "- ", "◆", "▲", "→", "**", "·", "BUY M N Q now: stop", "27,247.88,,"]:
            if m in script: bad.append("should not say: " + m)
        if script.count("27,407 and a quarter") != 1: bad.append("call said twice")
        # other phrasings
        R["no_trade"] = await ev("__T.sayCall({ side: 0, wait: 'a sweep of ONL' }, 'MNQ')")
        if R["no_trade"] != "No trade on M N Q yet. I'm waiting for a sweep of the overnight low.": bad.append("no-trade line")
        R["limit_sell"] = await ev("__T.sayCall({ side: -1, entry: 27400.5, stop: 27420.75, tgt: 27350, conf: 48 }, 'ES')")
        if R["limit_sell"] != "Sell E S. In at 27,400 and a half, stop 27,420 and three quarters, that's 20 and a quarter points of risk, target 27,350. Only about 48 percent, so keep it small.": bad.append("sell line")
        R["nums"] = await ev("__T.sayable('Gold 4123.4, ES −12.50 today, risk $480, +$1,200.75 and 0.62% · 3:1')")
        for m in ["4,123.4", "minus 12 and a half", "$480", "plus $1,200 and three quarters", "0.62%"]:
            if m not in R["nums"]: bad.append("nums: " + m)
        # the phone path: one utterance per sentence, the user's speed, the premium voice
        await ev("__T.HS().vrate = 1.2; __T.QT.tts = null")
        await ev(f"__T.qtSpeak({json.dumps(RAW)}, null, 'MNQ')"); await pg.wait_for_timeout(600)
        said = [x for x in await ev("window.__said") if x != "<cancel>"]; R["said"] = said[:4]; R["n_utt"] = len(said)
        if len(said) < 6: bad.append(f"only {len(said)} utterances")
        if any(abs(x["rate"] - 1.2) > 1e-9 for x in said): bad.append("speed setting ignored")
        if any(x["voice"] != "Ava (Premium)" for x in said): bad.append("didn't pick the premium voice")
        if not said or not said[0]["t"].startswith("Buy M N Q."): bad.append("doesn't open with the call")
        if any(len(x["t"]) > 400 for x in said): bad.append("an utterance is too long")
        # Claude's own voice: a few natural paragraphs, same script and speed
        R["claude_voice"] = await ev(f"""(async () => {{ const got = []; __T.QT.tts = {{ speak: async L => {{ got.push(...L); }}, stop() {{}} }}; __T.QT.speaking = false;
          __T.qtSpeak({json.dumps(RAW)}, null, 'MNQ'); await new Promise(r => setTimeout(r, 50)); __T.QT.tts = null; return got; }})()""")
        cv = R["claude_voice"]
        if not cv or not cv[0]["text"].startswith("Buy M N Q.") or any(x["rate"] != 1.2 or x["voice"] != "buttery" or len(x["text"]) > 2000 for x in cv): bad.append("claude voice lines")
        # the voice sheet tells an iPhone owner how to get a human-sounding voice
        await ev("__T.openVoice && __T.openVoice()"); await pg.wait_for_timeout(300)
        R["sheet"] = await ev("(document.querySelector('#sheet') || {}).innerText || ''")
        if "Premium" not in R["sheet"]: bad.append("voice sheet has no Premium voice tip")
        await pg.screenshot(path="/tmp/voice_sheet.png")
        # only basic voices visible: use the iPhone's own voice (the one set in Settings), not a basic one
        await ev("__T.closeSheet(); const S = window.speechSynthesis, all = S.getVoices(); S.getVoices = () => all.filter(v => !/Premium/.test(v.name)); __T.HS().voice = null; __T.QT.speaking = false; window.__said.length = 0")
        await ev(f"__T.qtSpeak({json.dumps(RAW)}, null, 'MNQ')"); await pg.wait_for_timeout(400)
        R["basic_only"] = list({x["voice"] for x in await ev("window.__said") if x != "<cancel>"})
        if R["basic_only"] != [None]: bad.append(f"forced a basic voice: {R['basic_only']}")
        await ev("__T.openVoice()"); await pg.wait_for_timeout(300)
        R["sheet_basic"] = await ev("[document.querySelector('[data-vu=\"__sys\"]').className, document.querySelector('#qvn').innerText.slice(0, 160)]")
        if "pri" not in R["sheet_basic"][0] or "none are Premium" not in R["sheet_basic"][1]: bad.append(f"sheet with basic voices {R['sheet_basic']}")
        # the page sees no voices at all (the Claude app on iPhone): explain it, and the iPhone's voice is selected
        await ev("window.speechSynthesis.getVoices = () => []; __T.closeSheet(); __T.openVoice()"); await pg.wait_for_timeout(300)
        R["sheet_none"] = await ev("document.querySelector('#qvn').innerText.slice(0, 200)")
        if "doesn't show your iPhone's voices" not in R["sheet_none"] or "Spoken Content" not in await ev("document.querySelector('#qvn').innerText"): bad.append("no-voices explanation")
        await pg.screenshot(path="/tmp/voice_sheet_none.png")
        R["bad"] = bad; R["errs"] = errs[:6]; await b.close()
    for k, v in R.items(): print(k, json.dumps(v, ensure_ascii=False)[:700])
asyncio.run(main())
