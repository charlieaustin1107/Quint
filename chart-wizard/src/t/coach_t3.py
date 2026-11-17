import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
import asyncio, json, sys
from playwright.async_api import async_playwright
MOCK = r"""
window.__mock = { calls: [], mode: 'ok', snaps: [] };
(() => {
  const f = async (input, opts) => {
    const last = input[input.length - 1].content, rec = { n: input.length, roles: input.map(m => m.role), nImages: opts.images ? opts.images.length : 0, hasTools: 'tools' in opts, cache: opts.cache, prompt: last };
    window.__mock.calls.push(rec);
    if (window.__mock.mode === 'noimg' && opts.images) throw { code: 'images_unavailable', message: 'x' };
    const rows = last.split('#,time,open,high,low,close,volume\n')[1].split('\n\n')[0].split('\n').map(r => r.split(','));
    const L = rows[rows.length - 1], lo = +L[4], hi = +L[3], c = +L[5], r60 = rows[59];
    const parts = ['### The short answer\nPrice swept the low. [[lev', `el ${c} | Last close]] Look here.\n[[zone ${lo} - ${hi} | Last range]]\n`,
      `[[line #60 ${r60[4]} > #80 ${lo} | Trend line]]\n[[box #70 - #75 | Sweep]]\n[[point #75 low | Sweep low]]\n[[arrow #80 ${c} > #90 ${hi} | Possible path]]\n[[focus #50 - #80]]\n[[bogus 1 2 3]]\n[[timeframe 15m]]\n### Remember\nWait for the close.`];
    let text = '';
    for (const p of parts) {
      await new Promise(r => setTimeout(r, window.__mock.mode === 'slow' ? 800 : 120));
      if (opts.signal && opts.signal.aborted) throw { code: 'cancelled', message: 'x', text };
      text += p; opts.onText({ text, delta: p });
      window.__mock.snaps.push(document.querySelector('#cmsgs .cmsg.a:last-child') ? null : null);
    }
    return { text, truncated: false };
  };
  f.limits = async () => ({ images: { maxCount: 4 }, maxPromptBytes: 262144 });
  setTimeout(() => { window.claude = { use: async name => name === 'sample' ? f : null }; }, 300);
})();
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"])
        for W, H, touch in [(390, 844, True), (1440, 900, False)]:
            ctx = await b.new_context(viewport={"width": W, "height": H}, has_touch=touch, is_mobile=touch, device_scale_factor=2); await ctx.add_init_script(MOCK)
            pg = await ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(900)
            for _ in range(4): await pg.click("#tnext")
            await pg.evaluate("__T.ST.rwait = false; if (__T.G && __T.G.replay) { __T.ST.style = 'scalp'; __T.newRound(); }"); await pg.wait_for_timeout(150)
            await pg.evaluate("__T.ST.style = 'scalp'; __T.newRound()"); await pg.wait_for_timeout(200)
            await pg.click("#coachbtn"); await pg.click("#csugg .chip")
            await pg.wait_for_timeout(200)
            mid = await pg.evaluate("document.querySelector('#cmsgs .cmsg.a:last-child').innerText")
            await pg.wait_for_function("!__T.CO.busy", timeout=8000)
            out = {"size": W, "mid_hides_partial": "[[" not in mid and "lev" not in mid.split("low.")[-1][:6]}
            c = await pg.evaluate("__mock.calls[0]")
            out["no_tools"] = not c["hasTools"]; out["img"] = c["nImages"]; out["has_csv"] = "#,time,open,high,low,close,volume" in c["prompt"]; out["has_cmds_help"] = "[[level PRICE | label]]" in c["prompt"]; out["prompt_kb"] = round(len(c["prompt"]) / 1024, 1)
            out["ai_overlays"] = await pg.evaluate("__T.G.overlays.filter(o => o.ai).map(o => o.type)")
            out["view"] = await pg.evaluate("__T.G.view")
            bub = await pg.evaluate("(() => { const a = document.querySelector('#cmsgs .cmsg.a:last-child'); return { text: a.innerText, acts: [...a.querySelectorAll('.cact')].map(b => b.textContent) }; })()")
            out["no_raw_cmds"] = "[[" not in bub["text"] and "]]" not in bub["text"]; out["acts"] = bub["acts"]
            await pg.screenshot(path=fCW + "/t/coach_draw_{W}.png")
            await pg.evaluate("__T.chart.toLatest()"); r0 = await pg.evaluate("__T.chart.right"); await pg.click("#cmsgs .cact >> nth=3"); r1 = await pg.evaluate("__T.chart.right"); out["chip_focus_moves"] = r0 != r1
            # tapped candle -> suggestion + prompt line
            await pg.evaluate("(() => { const c = __T.chart; c.setCross(c.x(c.S.n - 10, c.geo()), 200); })()"); await pg.wait_for_timeout(100)
            out["tap_sugg"] = await pg.evaluate("[...document.querySelectorAll('#csugg .chip')].some(b => b.textContent === 'Explain the candle I tapped')")
            await pg.evaluate("__T.coachSend('Explain the candle I tapped')"); await pg.wait_for_function("!__T.CO.busy", timeout=8000)
            c2 = await pg.evaluate("__mock.calls[1]"); out["tap_in_prompt"] = "The user has tapped candle #" in c2["prompt"]; out["roles2"] = c2["roles"]
            # image fallback
            await pg.evaluate("__mock.mode = 'noimg'"); await pg.evaluate("__T.coachSend('again')"); await pg.wait_for_function("!__T.CO.busy && __mock.calls.length >= 4", timeout=8000)
            cs = await pg.evaluate("__mock.calls.slice(2).map(c => c.nImages)"); out["img_fallback"] = cs
            out["fallback_answer_ok"] = await pg.evaluate("!document.querySelector('#cmsgs .cmsg.a:last-child').classList.contains('err')")
            # stop
            await pg.evaluate("__mock.mode = 'slow'"); await pg.evaluate("__T.coachSend('slow one'); 0"); await pg.wait_for_timeout(1000)
            out["dbg_slow"] = await pg.evaluate("[__T.CO.busy, document.querySelector('#cstop').hidden, __mock.calls.length, __T.CO.msgs.length]")
            await pg.evaluate("document.querySelector('#cstop').click()"); await pg.wait_for_function("!__T.CO.busy", timeout=8000)
            out["stopped"] = await pg.evaluate("document.querySelector('#cmsgs .cmsg.a:last-child').innerText.slice(-10)")
            out["errors"] = errs
            print(json.dumps(out)); await ctx.close()
        await b.close()
asyncio.run(main())
