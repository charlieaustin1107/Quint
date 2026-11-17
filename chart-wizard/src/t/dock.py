import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
import asyncio, json, sys
src = open(CW + '/t/quint.py').read().split("async def run(")[0]
sys_argv = sys.argv; sys.argv = [sys.argv[0], "none"]; exec(src); sys.argv = sys_argv
from playwright.async_api import async_playwright
TV2 = r"""
(() => { const base = window.__tv;
  const px = s => /MNQ|NQ1/.test(s) ? 27347.25 : /ES1|MES/.test(s) ? 7420.25 : /6E/.test(s) ? 1.1012 : /GC1|MGC/.test(s) ? 3865 : /CL1|MCL/.test(s) ? 85.19 : /6J/.test(s) ? 0.0062935 : /ZN/.test(s) ? 105.515625 : 500;
  const q = (s, i) => { const p = px(s); return { close: p, change: ((i || 0) % 3 - 1) * 0.8, change_abs: p * 0.008 * ((i || 0) % 3 - 1), high: p * 1.004, low: p * 0.993, open: p * 0.997, volume: 1000 + (i || 0), update_mode: "delayed_streaming_600", price_52_week_high: p * 1.2, price_52_week_low: p * 0.8, SMA50: p * 1.01, SMA200: p * 0.97 }; };
  window.__tv = (tool, input) => {
    (window.__tvLog = window.__tvLog || []).push(tool + " " + (input.symbol || (input.symbols || []).length || "") + " " + (input.interval || ""));
    if (tool === "mcp-tv-get-symbol-data") return { success: true, data: q(input.symbol) };
    if (tool === "mcp-tv-get-symbol-data-batch") { const d = {}; input.symbols.forEach((s, i) => { d[s] = q(s, i); }); window.__batchN = (window.__batchN || 0) + 1; window.__batchSyms = input.symbols.length; return { success: true, data: d, missing: [] }; }
    if (tool === "mcp-tv-get-ohlcv") { const r = base(tool, input), k = px(input.symbol) / 27000; if (k !== px("MNQ") / 27000) for (const a of ["o", "h", "l", "c"]) r.bars[a] = r.bars[a].map(x => x * k);
      if (/^(1m|5m)$/.test(input.interval) && r.bars && r.bars.c && r.bars.c.length) { const sh = px(input.symbol) - r.bars.c[r.bars.c.length - 1]; for (const a of ["o", "h", "l", "c"]) r.bars[a] = r.bars[a].map(x => x + sh); } // the newest candle closes at the quote, as on TradingView
      return r; }
    if (tool === "mcp-tv-get-technicals-rating") return { success: true, data: { "Recommend.All": -0.4, RSI: 41 } };
    if (tool === "mcp-tv-validate-pine-script") { window.__val = (window.__val || 0) + 1; const bad = /BROKEN/.test(input.code); return { success: true, valid: !bad, errors: bad ? [{ message: "Undeclared identifier 'foo'", start: { line: 3 } }] : [], warnings: [] }; }
    if (tool === "mcp-tv-create-alert") { window.__alert = input; (window.__alerts = window.__alerts || []).push(input); if (window.__alertFail) return { success: false, error: window.__alertFail };
      const id = 6000 + window.__alerts.length; (window.__alList = window.__alList || []).unshift({ alert_id: id, name: input.name, symbol: input.symbol, active: true, condition_type: input.condition, threshold: input.price, resolution: "1", expiration: input.expiration });
      return { alert_id: id, auto_deactivate: true, message: input.message, mobile_push: input.mobile_push, name: input.name, status: "starting", success: true, symbol: input.symbol, type: "price" }; } // TradingView echoes the alert's own message back
    if (tool === "mcp-tv-list-alerts") return { success: true, alerts: window.__alList || [] };
    if (tool === "mcp-tv-delete-alert") { window.__del = input.alert_ids; window.__alList = (window.__alList || []).filter(a => !input.alert_ids.includes(a.alert_id)); return { deleted: input.alert_ids.length, success: true }; }
    if (tool === "mcp-tv-get-alerts-log") return { success: true, events: window.__alLog || [] };
    return base(tool, input);
  };
})();
"""
DS = r"""
(() => { const _use = window.claude.use;
  window.claude.use = async n => { if (n !== "sample") return _use(n); const orig = await _use("sample");
    const DS = async (input, opts) => {
      const all = JSON.stringify(input), last = Array.isArray(input) ? input[input.length - 1].content : String(input);
      (window.__ds = window.__ds || []).push({ n: Array.isArray(input) ? input.length : 1, tools: (opts.tools || []).length, img: (opts.images || []).length, model: opts.model, effort: opts.effort, tier: opts.modelTier, cache: opts.cache, len: all.length });
      let full;
      if (/PRICE: 27354\.25 MNQ/.test(all) && /CALL: BUY · ENTRY NOW/.test(all) && !/LIVE BRIEF/.test(all)) full = "**BUY MNQ now: stop 28,300, target 28,440, 62%**\n### What I can see\nMNQ 1m, long 1 from 28394.25.\n### The plan\nHold above 28327.\nPRICE: 28346.75 MNQ\nCALL: BUY · ENTRY NOW · STOP 28300.00 · TARGET 28440.00 · CONF 62% · HOLD 40m";
      else if (/LIVE BRIEF/.test(last)) {
        window.__brief = last; const p = +((/LATEST PRICE: ([0-9,.]+)/.exec(last) || [])[1] || "27347.25").replace(/,/g, "");
        if (opts.tools && opts.tools.length) { if (window.__dsToolsUnavail) throw { code: "tools_unavailable", message: "no tools here" };
          const T = nm => opts.tools.find(t => t.name === nm), out = {}; window.__dsToolNames = opts.tools.map(t => t.name);
          if (!window.__dsQuick) {
            out.c = await T("get_candles").execute({ symbol: "CME_MINI:ES1!", timeframe: "1h", count: 20 }, { signal: opts.signal });
            out.q = await T("get_quotes").execute({ symbols: ["TVC:DXY", "CBOE:VIX", "ES"] }, {});
            out.d = await T("draw_levels").execute({ levels: [{ price: p - 30, label: "PDL", kind: "support" }, { price: p + 60, label: "PDH", kind: "resistance" }] }, {});
            out.b = await T("quick_backtest").execute({ family: "orb", timeframe: "15m", direction: "both", params: { or: 15, cut: 120, mid: 0, tgt: 2 } }, {});
            out.v = await T("check_pine").execute({ code: "//@version=6\nindicator('x')\nplot(close)" }, {});
            out.n = await T("get_news").execute({}, {}); out.cal = await T("get_calendar").execute({ days: 2 }, {}); out.tech = await T("get_technicals").execute({ timeframe: "15m" }, {});
            out.pb = await T("pine_backtest").execute({ code: "//@version=6\nstrategy('t')", timeframe: "15m" }, {});
            out.tf = await T("draw_levels").execute({ levels: [{ price: p - 30, label: "PDL", kind: "support" }, { price: p + 60, label: "PDH", kind: "resistance" }], timeframe: "15m" }, {});
            try { out.bad = await T("get_candles").execute({ symbol: "not a symbol!!", timeframe: "5m" }, {}); } catch (e) { out.bad = "ERR " + e.message; }
            window.__dsOut = out; } }
        const q = /QUESTION: (.*)$/s.exec(last)[1];
        if (/^Is it a no trade/i.test(q)) full = "**NO TRADE on MNQ: wait, 70%**\n### Why\nPrice is chopping inside the opening range.\nCALL: NO TRADE · CONF 70% · WAIT FOR a 5m close above 27400";
        else if (/pine/i.test(q)) full = "Here's an indicator that marks both.\n```pine\n//@version=6\nindicator(\"FVG + OB together\", overlay = true)\nplot(close)\n```\nSet an alert at the trigger level.\nALERT: 27420.25 crossing up";
        else if (/broken/i.test(q)) full = "```pine\n//@version=6\nindicator(\"Broken\")\nBROKEN foo\n```";
        else if (/pullback/i.test(q)) full = `**BUY MNQ on a pullback to ${(p - 20).toFixed(2)}: stop ${(p - 50).toFixed(2)}, target ${(p + 40).toFixed(2)}, 58%**\n### Plan\nLet it come back to VWAP.\nALERT: BUY ${(p - 20).toFixed(2)} · stop ${(p - 50).toFixed(2)}, target ${(p + 40).toFixed(2)}\nALERT: **MNQ1! ${(p + 30).toFixed(2)}** breaks above, watch for a retest\nCALL: BUY · ENTRY ${(p - 20).toFixed(2)} · STOP ${(p - 50).toFixed(2)} · TARGET ${(p + 40).toFixed(2)} · CONF 58% · HOLD 60m`;
        else if (/silly/i.test(q)) full = `**BUY MNQ now**\nCALL: BUY · ENTRY NOW · STOP ${(p + 10).toFixed(2)} · TARGET ${(p + 60).toFixed(2)} · CONF 95% · HOLD 30m`;
        else full = `**BUY MNQ now: stop ${(p - 30).toFixed(2)}, target ${(p + 60).toFixed(2)}, 64%**\n### Why\nThe hourly trend is up and price is holding VWAP.\n### Levels\n- **PDL** ${(p - 30).toFixed(2)}\n### Plan\nBuy now, stop below the swing low.\nCALL: BUY · ENTRY NOW · STOP ${(p - 30).toFixed(2)} · TARGET ${(p + 60).toFixed(2)} · CONF 64% · HOLD 45m`;
      } else return orig(input, opts);
      for (let i = 1; i <= 3; i++) { await new Promise(r => setTimeout(r, 90)); opts.onText && opts.onText({ text: full.slice(0, Math.floor(full.length * i / 3)) }); }
      return { text: full, truncated: false, modelApplied: opts.model };
    };
    DS.limits = async () => window.__dsLim || ({ images: { maxCount: 4, maxInputBytes: 2e7, mediaTypes: ["image/png", "image/jpeg"] }, tools: { maxCount: 10 } });
    return DS; };
})();
"""
F = 'agent-proxy|connect_rejected|Allowed domains|For details'
async def run(b, w, h, mob, tag, out):
    ctx = await b.new_context(viewport={"width": w, "height": h}, has_touch=mob, is_mobile=mob, device_scale_factor=2 if mob else 1)
    pg = await ctx.new_page(); errs = []; R = {}
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    await pg.clock.install(time=T0); await pg.clock.resume()
    await pg.add_init_script(TV); await pg.add_init_script(TV2); await pg.add_init_script(MOCK); await pg.add_init_script(DS)
    await pg.goto("file://" + CW + "/test.html#t"); await pg.wait_for_timeout(2200)
    tap = (lambda sel: pg.tap(sel)) if mob else (lambda sel: pg.click(sel))
    ev = pg.evaluate
    await ev("__T.mkShow('home'); __T.closeSheet(); __T.ST.seenTut = true"); await pg.wait_for_timeout(1500)
    R["groups"] = await ev("[...document.querySelectorAll('#hmFutG .chip')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : ''))")
    R["tiles_idx"] = await ev("[...document.querySelectorAll('#hmFut .mtile')].map(t => t.dataset.key + ' ' + t.querySelector('.mpx').textContent)")
    R["batch"] = await ev("[window.__batchN, window.__batchSyms, __T.FUT_KEYS.length]")
    R["futN"] = await ev("document.querySelector('#hmFutN').textContent")
    await ev("document.querySelector('#hmFut').scrollIntoView({block:'center'})"); await pg.screenshot(path=f"/tmp/d_{tag}_home.png")
    await tap('#hmFutG [data-fg="nrg"]'); await pg.wait_for_timeout(900)
    R["tiles_nrg"] = await ev("[...document.querySelectorAll('#hmFut .mtile')].map(t => t.dataset.key + ' ' + t.querySelector('.mpx').textContent + ' ' + (t.querySelector('.msp polyline') ? 'spark' : t.querySelector('.drng') ? 'range' : 'none'))")
    await tap('#hmFutG [data-fg="all"]'); await pg.wait_for_timeout(900)
    R["tiles_all"] = await ev("document.querySelectorAll('#hmFut .mtile').length")
    R["specs"] = await ev("['YM','NG','ZN','6J','MBT','HG'].map(k => k + ': ' + __T.MKDEF[k].what)")
    await pg.screenshot(path=f"/tmp/d_{tag}_all.png")
    # a non-MNQ future on intraday candles, then a paper trade sized from that timeframe
    await ev("__T.mkShow('chart', '6E')"); await pg.wait_for_timeout(1500)
    R["6e_chart"] = await ev("[__T.HC.tf, __T.HC.ib && __T.HC.ib.B.n, document.querySelector('#hcLg').textContent.slice(0, 60), [...document.querySelectorAll('#hcRng [data-tf]')].map(b => b.textContent).join(' '), document.querySelector('.hctitle small').textContent]")
    R["6e_ticket"] = await ev("(n => n && [n.X.intra, n.X.lab, n.X.mult, +n.sd.toFixed(5), n.micros, +n.risk.toFixed(2)])(__T.lvTicket(__T.MKDEF['6E'], __T.MK.q['6E']))")
    R["6e_ticket_text"] = await ev("(document.querySelector('#hcSide .ordnote') ? document.querySelector('#hcSide p.small[style]') : null) && [...document.querySelectorAll('#hcSide .q p.small')].map(p => p.textContent).find(t => /ATR/.test(t))")
    await pg.screenshot(path=f"/tmp/d_{tag}_6e.png")
    await ev("__T.hcSetTf('1h')"); await pg.wait_for_timeout(900)
    R["6e_1h"] = await ev("[__T.HC.tf, __T.HC.ib && __T.HC.ib.tf, __T.HC.ib && __T.HC.ib.B.n]")
    await ev("__T.hcSetTf('1D')"); await pg.wait_for_timeout(600)
    R["6e_1d"] = await ev("[__T.HC.tf, !!__T.hcBars(__T.MKDEF['6E']), __T.hcBars(__T.MKDEF['6E']) && __T.hcBars(__T.MKDEF['6E']).n, (__T.lvTicket(__T.MKDEF['6E'], __T.MK.q['6E']) || {X:{}}).X.lab]")
    await ev("__T.hcSetTf('5m')"); await pg.wait_for_timeout(900)
    await ev("__T.ST.riskPct = 0.5"); await tap("#lvbuy"); await pg.wait_for_timeout(900)
    R["6e_trade"] = await ev("__T.lvOpenList().map(P => [P.key, P.ctf, P.qty, +P.e.toFixed(5), +P.stop.toFixed(5), +P.tgt.toFixed(5)])")
    # MNQ with Quint docked
    await ev("__T.mkShow('chart', 'MNQ')"); await pg.wait_for_timeout(1400)
    R["fab"] = await ev("[!!document.querySelector('#qFab'), document.querySelector('#qFab') && !document.querySelector('#qFab').hidden, document.querySelector('#qDk').hidden]")
    await pg.screenshot(path=f"/tmp/d_{tag}_fab.png")
    await tap("#qFab"); await pg.wait_for_timeout(500)
    R["dock_open"] = await ev("[!document.querySelector('#qDk').hidden, document.querySelector('#home').classList.contains('qdk-on'), Math.round(document.querySelector('#qDk').getBoundingClientRect().height), Math.round(document.querySelector('.hcchart').getBoundingClientRect().bottom), Math.round(document.querySelector('#qDk').getBoundingClientRect().top), document.querySelectorAll('#qdkQ .chip').length]")
    await pg.screenshot(path=f"/tmp/d_{tag}_dock0.png")
    await tap('#qdkQ [data-qq="call"]'); await pg.wait_for_timeout(300)
    R["busy"] = await ev("[__T.DK.busy, document.querySelector('#qdkS').textContent, (document.querySelector('.qthink') || {}).textContent]")
    for _ in range(40):
        if not await ev("__T.DK.busy"): break
        await pg.wait_for_timeout(200)
    R["ds_last"] = await ev("window.__ds.slice(-1)[0]")
    R["tool_names"] = await ev("window.__dsToolNames")
    R["tool_out"] = await ev("(o => o && { c: o.c && o.c.stats.slice(0, 90), rows: o.c && o.c.candles.split('\\n').length, q: o.q, d: o.d, b: o.b && o.b.all, v: o.v, n: o.n && o.n.length, cal: o.cal && o.cal.length, tech: o.tech && o.tech.slice(0, 40), pb: o.pb, tf: o.tf, bad: o.bad })(window.__dsOut)")
    R["brief"] = await ev("(b => [b.length, ...['MARKET:', 'TIME:', 'LATEST PRICE:', 'DAILY CHART:', 'HOURLY CHART:', '15-MINUTE CHART:', '5-MINUTE CHART:', \"TODAY'S LEVELS:\", 'opening range', 'session VWAP', 'previous New York session', 'LAST 30', 'OPEN POSITION:', 'PAPER ACCOUNT:', 'US EVENTS'].map(k => b.includes(k) ? 1 : k)])(window.__brief)")
    R["brief_levels"] = await ev("(/TODAY'S LEVELS:[\\s\\S]*?(?=\\nLAST)/.exec(window.__brief) || [''])[0].slice(0, 600)")
    R["msg"] = await ev("[document.querySelectorAll('#qdkB .qdkm').length, (document.querySelector('#qdkB .qcall') || {}).className, (document.querySelector('#qdkB .qcall') || {innerText:''}).innerText.replace(/\\n+/g, ' | ').slice(0, 260), /CALL:/.test(document.querySelector('#qdkB').innerText)]")
    R["call"] = await ev("(c => c && [c.side, c.entry, c.stop, c.tgt, c.conf, c.hold, c.ty, c.st, c.tf, c.src])(__T.dkCalls()[0])")
    R["lines"] = await ev("[__T.HC.lvl && __T.HC.lvl.arr.map(x => x.lab + ' ' + x.p).join(', '), __T.HC.tf, !document.querySelector('#hcLvX').hidden]")
    await pg.screenshot(path=f"/tmp/d_{tag}_dock1.png")
    if not await ev("!!document.querySelector('[data-qcgo]')"):
        R["DEBUG"] = await ev("[document.querySelector('#qdkB').innerText.slice(0, 900), JSON.stringify(__T.dkCalls()[0]), __T.MK.st, JSON.stringify(__T.MK.q.MNQ && {p:__T.MK.q.MNQ.p, ts: __T.MK.q.MNQ.ts})]"); R["errs"] = errs[:8]; out[tag] = R; return
    await tap("[data-qcgo]"); await pg.wait_for_timeout(300)
    if await ev("!!document.querySelector('[data-qcgo]') && /Tap again/.test(document.querySelector('[data-qcgo]').textContent)"):
        R["two_tap"] = True; await tap("[data-qcgo]")
    await pg.wait_for_timeout(1100)
    R["quint_trade"] = await ev("(P => P && [P.dir, +P.e.toFixed(2), +P.stop.toFixed(2), +P.tgt.toFixed(2), P.qc === __T.dkCalls()[0].id, P.ctf, P.qty])(__T.lvOpenList().find(P => P.key === 'MNQ'))")
    R["toast"] = await ev("document.querySelector('#hmtoast').textContent")
    # manage, no-trade, pine + alert, broken code, a nonsense call
    await tap('#qdkQ [data-qq="mg"]'); await pg.wait_for_timeout(200)
    for _ in range(40):
        if not await ev("__T.DK.busy"): break
        await pg.wait_for_timeout(200)
    R["brief_pos"] = await ev("(/OPEN POSITION:[^\\n]*/.exec(window.__brief) || [''])[0]")
    await ev("window.__dsQuick = true")
    for q in ["Is it a no trade here?", "Write me a pine indicator for FVG and order blocks", "broken code please", "silly call"]:
        await pg.fill("#qdkI", q); await pg.press("#qdkI", "Enter"); await pg.wait_for_timeout(200)
        for _ in range(40):
            if not await ev("__T.DK.busy"): break
            await pg.wait_for_timeout(150)
    R["calls"] = await ev("__T.dkCalls().slice(0, 4).map(c => [c.side, c.st, c.conf, c.wait || ''])")
    R["nocall_card"] = await ev("[...document.querySelectorAll('#qdkB .qcall.none')].map(x => x.innerText.replace(/\\n+/g, ' | '))")
    btns = await ev("[...document.querySelectorAll('#qdkB [data-pine], #qdkB [data-alert]')].map(b => b.textContent)")
    R["extra_btns"] = btns
    await ev("document.querySelectorAll('#qdkB [data-pine]')[0].click()"); await pg.wait_for_timeout(500)
    await ev("document.querySelectorAll('#qdkB [data-pine]')[1] && document.querySelectorAll('#qdkB [data-pine]')[1].click()"); await pg.wait_for_timeout(500)
    await ev("document.querySelector('#qdkB [data-alert]').click()"); await pg.wait_for_timeout(500)
    R["pine_alert"] = await ev("[[...document.querySelectorAll('#qdkB [data-pine]')].map(b => b.textContent.slice(0, 80)), document.querySelector('#qdkB [data-alert]').textContent.slice(0, 90), window.__pine && window.__pine.name, window.__alert && [window.__alert.symbol, window.__alert.price, window.__alert.condition, window.__alert.mobile_push]]")
    R["bad_card"] = await ev("(x => x && x.innerText.replace(/\\n+/g, ' | '))([...document.querySelectorAll('#qdkB .qcall')].pop())")
    await pg.screenshot(path=f"/tmp/d_{tag}_dock2.png")
    # tools not available in this view: still answers
    await ev("window.__dsToolsUnavail = true; window.__dsQuick = false"); await pg.fill("#qdkI", "Call it again"); await pg.press("#qdkI", "Enter")
    for _ in range(40):
        if not await ev("__T.DK.busy"): break
        await pg.wait_for_timeout(150)
    R["no_tools"] = await ev("[__T.DK.noTools, window.__ds.slice(-1)[0].tools, (__T.dkCalls()[0] || {}).st, document.querySelectorAll('#qdkB .nwerr').length]")
    # grading against 1-minute candles
    R["grade"] = await ev("""(async () => { const L = __T.dkCalls(), now = Date.now(), B = await (async () => { const r = window.__tv('mcp-tv-get-ohlcv', { symbol: 'CME_MINI:MNQ1!', interval: '1m', count: 3000 }); return r.bars; })(); const i = B.t.length - 400, p = B.c[i];
      L.unshift({ id: 1, t: B.t[i] * 1000, tq: B.t[i] * 1000, k: 'MNQ', tv: 'CME_MINI:MNQ1!', name: 'x', side: 1, entry: p, stop: p - 6, tgt: p + 6, conf: 60, hold: 300, tf: '5m', ty: 'mkt', st: 'live' },
                { id: 2, t: B.t[i] * 1000, tq: B.t[i] * 1000, k: 'MNQ', tv: 'CME_MINI:MNQ1!', name: 'x', side: -1, entry: p + 500, stop: p + 520, tgt: p + 440, conf: 55, hold: 30, tf: '5m', ty: 'lim', st: 'live' },
                { id: 3, t: B.t[i] * 1000, tq: B.t[i] * 1000, k: 'MNQ', tv: 'CME_MINI:MNQ1!', name: 'x', side: 1, entry: p, stop: p - 9000, tgt: p + 9000, conf: 50, hold: 20, tf: '5m', ty: 'mkt', st: 'live' });
      await __T.dkGrade(true); const g = __T.dkCalls().filter(c => c.id <= 3).map(c => [c.id, c.st, c.R != null ? +c.R.toFixed(2) : null]); const r = __T.dkRec(); return [g, [r.n, r.w, r.l, r.tm, +r.R.toFixed(2), r.wr, r.conf]]; })()""")
    await tap("#qdkRec"); await pg.wait_for_timeout(300)
    R["rec_view"] = await ev("document.querySelector('#qdkB').innerText.slice(0, 220).replace(/\\n+/g, ' | ')")
    await pg.screenshot(path=f"/tmp/d_{tag}_rec.png")
    await tap("#qdkBack"); await tap("#qdkX"); await pg.wait_for_timeout(300)
    R["closed"] = await ev("[document.querySelector('#qDk').hidden, document.querySelector('#home').classList.contains('qdk-on'), !document.querySelector('#qFab').hidden]")
    # screenshot reader now makes a call too
    await ev("__T.mkShow('home')"); await pg.wait_for_timeout(500); await ev("__T.qtGo('shot')"); await pg.wait_for_timeout(300)
    await pg.set_input_files("#qtFile", CW + "/t/fixtures/chart-icon.png"); await pg.wait_for_timeout(500); await tap("#qtGo")
    await pg.wait_for_timeout(1600)
    R["shot"] = await ev("[document.querySelector('#qtOut').innerText.replace(/\\n+/g, ' | ').slice(0, 240), !!document.querySelector('#qtOut .qcall'), !document.querySelector('#qtOut [data-qcgo]'), (c => c && [c.src, c.side, c.entry, c.stop, c.tgt, c.ty])(__T.dkCalls()[0]), JSON.stringify(__T.ST.mnq && __T.ST.mnq.p)]")
    await ev("__T.closeSheet()")
    # practice on another market
    await ev("__T.openSetup && 0"); await ev("__T.qtGo('prac')"); await pg.wait_for_timeout(300)
    await pg.select_option("#prMk", "CL"); await pg.wait_for_timeout(1200)
    R["prac_cl"] = await ev("[__T.QT.pr.k, __T.QT.pr.B && __T.QT.pr.B.c.length, document.querySelector('#sheet').innerText.match(/per MCL[^.]*/) && document.querySelector('#sheet').innerText.match(/per MCL[^.]*/)[0], (document.querySelector('#prBody .small') || {}).textContent]")
    await ev("__T.closeSheet()")
    # home "Ask Quint" opens Quint's own screen on MNQ, with the same conversation
    await ev("__T.mkShow('home')"); await pg.wait_for_timeout(400); await ev("document.querySelector('#hmQT [data-qt=\"chat\"]').click()"); await pg.wait_for_timeout(900)
    R["ask"] = await ev("[__T.MK.screen, __T.DK.k, !!document.querySelector('#hmQuint #qDk'), document.querySelectorAll('#qdkB .qdkm').length, !document.querySelector('#hmTabs').hidden]")
    await pg.screenshot(path=f"/tmp/d_{tag}_ask.png")
    R["tvlog_n"] = await ev("window.__tvLog.length"); R["fmp_calls"] = await ev("__T.callsToday()")
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
