import os as _os
def _repo():  # the repo's root, found from this test's own location (works when one test runs another's mocks)
    d = _os.path.dirname(_os.path.abspath(__file__))
    while d != "/" and not _os.path.isdir(_os.path.join(d, "chart-wizard", "src")): d = _os.path.dirname(d)
    return d
CW = _repo() + "/chart-wizard/src"; QB = _repo() + "/quint-brain/src"
CHROME = "/usr/bin/google-chrome" if _os.path.exists("/usr/bin/google-chrome") else None  # else Playwright's own Chromium
import asyncio, json, re
from playwright.async_api import async_playwright
BASE = re.search(r'MOCK = r"""(.*?)"""', open(CW + '/t/news.py').read(), re.S).group(1)
DB = r"""
(() => { const base = window.claude.use; const store = () => { try { return JSON.parse(localStorage.getItem("__mockdb") || "{}"); } catch (e) { return {}; } };
  const snap = path => { const d = store()[path]; return { id: path.split("/").pop(), exists: d != null, data: () => d == null ? undefined : d, metadata: { fromCache: false, hasPendingWrites: false } }; };
  window.__db = { writes: 0, log: [], reads: 0, denied: 0, big: 0 };
  const db = { doc: path => { if (path.split("/").length % 2) throw new TypeError("document path needs an even number of segments"); if (!/^[A-Za-z0-9_\-.~:@+\/]+$/.test(path)) throw new TypeError("bad segment in " + path); return { id: path.split("/").pop(), path,
      get: async () => { window.__db.reads++; return snap(path); },
      set: async data => { await new Promise(r => setTimeout(r, 20)); if (window.__dbDeny) { window.__db.denied++; throw { code: "invalid_argument", message: "denied" }; } const n = JSON.stringify(data).length; window.__db.big = Math.max(window.__db.big, n); if (n > 256 * 1024) throw { code: "invalid_argument", message: "too big" }; const s = store(); s[path] = JSON.parse(JSON.stringify(data)); localStorage.setItem("__mockdb", JSON.stringify(s)); window.__db.writes++; window.__db.log.push(path); },
      onSnapshot: (next, err) => { let on = true, last; const tick = () => { if (!on) return; const body = JSON.stringify(store()[path] || null); if (body !== last) { last = body; next(snap(path)); } }; setTimeout(tick, 60); const iv = setInterval(tick, 250); return () => { on = false; clearInterval(iv); }; } }; } };
  const user = { isOwner: async () => window.__role === "owner", canEdit: async () => window.__role === "owner", can: async () => window.__role === "owner" };
  window.claude = { use: async name => name === "db" ? (window.__role === "friend_nodb" ? null : db) : name === "user" ? (window.__role === "owner" || window.__role === "member" ? user : null) : name === "mcp" ? (/^friend/.test(window.__role) ? null : base("mcp")) : base(name) };
})();
"""
URL = "file://" + CW + "/test.html"
async def page(b, role, pre="", mob=True):
    ctx = await b.new_context(viewport={"width": 390, "height": 844} if mob else {"width": 1280, "height": 800}, has_touch=mob, is_mobile=mob, device_scale_factor=2 if mob else 1)
    pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    await pg.add_init_script(f"window.__role = {json.dumps(role)};" + pre + BASE + DB)
    await pg.goto(URL); return ctx, pg, errs
async def main():
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"])
        # 1. the owner's page saves what it loads
        ctx, pg, errs = await page(b, "owner"); await pg.wait_for_timeout(9000)
        await pg.evaluate("__T.mkShow('chart', 's:TSLA')"); await pg.wait_for_timeout(1500); await pg.evaluate("__T.mkShow('home')"); await pg.wait_for_timeout(8000)
        o = await pg.evaluate("({ role: __T.SH.role, can: __T.SH.canWrite, writes: window.__db.writes, log: window.__db.log, big: window.__db.big, fmp: window.__calls.n })")
        store = await pg.evaluate("localStorage.getItem('__mockdb')"); S = json.loads(store)
        o["events"] = {k: v.get("lines", [])[:2] for k, v in S.get("live/events", {}).get("ev", {}).items()}
        o["board_rows"] = len(S.get("live/board", {}).get("rows", [])); o["news_items"] = len(S.get("live/news", {}).get("items", [])); o["hist_docs"] = sorted(k for k in S if k.startswith("hist/")); o["hist_n"] = S.get("hist/BTC", {}).get("n")
        await pg.reload(); await pg.wait_for_timeout(11000)
        o["after_reload_log"] = await pg.evaluate("window.__db.log"); o["errs"] = errs[:4]; out["owner"] = o; await ctx.close()
        # 2. the friend: no connector at all, signed in, reads the shared feed
        seed = "try { localStorage.setItem('__mockdb', " + json.dumps(store) + "); } catch (e) {}"
        ctx, pg, errs = await page(b, "friend", seed); await pg.wait_for_timeout(1600)
        f = await pg.evaluate("""({ mk: __T.MK.st, role: __T.SH.role, stat: document.querySelector('#hmStat').innerText.replace(/\\n+/g, ' | '), ban: document.querySelector('#hmBan').innerText,
          tiles: [...document.querySelectorAll('#hmFut .mtile, #hmStk .mtile')].map(t => t.innerText.replace(/\\n+/g, ' ').slice(0, 44)), hero: document.querySelector('#hmHero').innerText.replace(/\\n+/g, ' ').slice(0, 90),
          news: document.querySelectorAll('#hmNewsBox .nwrow').length, edit_hidden: document.querySelector('#hmEdit').hidden, add_tile: !!document.querySelector('#hmAddT'), ref_hidden: document.querySelector('#hmRef').hidden,
          writes: window.__db.writes, fmp: window.__calls.n })""")
        f["lt"] = await pg.evaluate("[document.querySelector('#hmTabs [data-tab=\"trades\"]') ? 'tab' : 'none', document.querySelector('#hmLT').innerHTML.length]")
        await pg.screenshot(path="/tmp/sh_friend_home.png")
        await pg.evaluate("(() => { const s = JSON.parse(localStorage.getItem('__mockdb')); const r = s['live/board'].rows.find(x => x.k === 'MNQ'); if (r) { r.q.p = 28888.5; r.q.ch = 99; } s['live/board'].at = Date.now(); localStorage.setItem('__mockdb', JSON.stringify(s)); })()"); await pg.wait_for_timeout(900)
        f["live_update_hero"] = await pg.evaluate("document.querySelector('#hmHero .mpx').innerText")
        await pg.click("#hmHero .hero"); await pg.wait_for_timeout(900)
        f["chart"] = await pg.evaluate("({ scr: __T.MK.screen, hist: __T.SH.hist.BTC, n: __T.SH.H.BTC && __T.SH.H.BTC.n, note: document.querySelector('#hcNote').textContent, px: document.querySelector('#hcPx').innerText.replace(/\\n+/g, ' ').slice(0, 80), side: document.querySelector('#hcSide').innerText.replace(/\\n+/g, ' ').slice(0, 400), buy_disabled: (document.querySelector('#lvbuy') || {}).disabled })")
        await pg.screenshot(path="/tmp/sh_friend_chart.png")
        await pg.click("#hcBack"); await pg.wait_for_timeout(300)
        await pg.evaluate("__T.mkShow('chart', 's:TSLA')"); await pg.wait_for_timeout(900)
        f["tsla_chart"] = await pg.evaluate("document.querySelector('#hcNews').innerText.replace(/\\n+/g, ' | ').slice(0, 420)"); f["tsla_hist"] = await pg.evaluate("__T.SH.hist['s:TSLA']")
        await pg.click("#hcRead"); await pg.wait_for_timeout(1100); f["friend_lean"] = await pg.evaluate("(document.querySelector('#hcNews .lean') || {}).innerText")
        f["friend_prompt_facts"] = await pg.evaluate("[/LIVE FACTS:/.test(window.__samplePrompt), /Analysts' ratings/.test(window.__samplePrompt), /shared feed/.test(window.__samplePrompt)]")
        await pg.screenshot(path="/tmp/sh_friend_tsla.png")
        await pg.evaluate("__T.mkShow('home')"); await pg.wait_for_timeout(300); await pg.click("#hmNewsAll"); await pg.wait_for_timeout(500)
        f["newspage"] = await pg.evaluate("({ stat: document.querySelector('#nwStat').innerText.replace(/\\n+/g, ' | '), ban: document.querySelector('#nwBan').innerText.slice(0, 150), cards: document.querySelectorAll('#nwList .nwi').length, ref_hidden: document.querySelector('#nwRef').hidden, more: !!document.querySelector('#nwMoreB'), xss: document.querySelectorAll('#hmNews img').length })")
        await pg.screenshot(path="/tmp/sh_friend_news.png")
        f["writes_end"] = await pg.evaluate("window.__db.writes"); f["fmp_end"] = await pg.evaluate("window.__calls.n"); f["errs"] = errs[:4]; out["friend"] = f; await ctx.close()
        # 3. friend before the owner has ever opened it; 4. friend whose view has no store; 5. a member with FMP who isn't the owner; 6. owner whose save is refused
        for name, role, pre in [("friend_empty", "friend", ""), ("friend_nodb", "friend_nodb", ""), ("member", "member", ""), ("owner_denied", "owner", "window.__dbDeny = true;")]:
            ctx, pg, errs = await page(b, role, pre); await pg.wait_for_timeout(9500 if role in ("member", "owner") else 1500)
            out[name] = await pg.evaluate("({ mk: __T.MK.st, role: __T.SH.role, can: __T.SH.canWrite, stat: document.querySelector('#hmStat').innerText.replace(/\\n+/g, ' | ').slice(0, 60), ban: document.querySelector('#hmBan').innerText.slice(0, 170), writes: window.__db.writes, denied: window.__db.denied })"); out[name]["errs"] = errs[:3]
            if name == "friend_empty": await pg.screenshot(path="/tmp/sh_friend_empty.png")
            await ctx.close()
        print(json.dumps(out, indent=1)); await b.close()
asyncio.run(main())
