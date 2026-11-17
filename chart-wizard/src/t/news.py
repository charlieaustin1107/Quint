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
(() => {
  const et = ms => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(ms)).replace(",", "");
  const art = (minsAgo, title, tick, pts, extra) => ({ title, date: et(Date.now() - minsAgo * 6e4), content: "<ul>" + pts.map(p => "<li>" + p + "</li>").join("") + "</ul><p>" + (extra || pts[0]) + "</p><script>window.__xss = 1<\/script>", tickers: tick, image: "https://images.example.com/x.jpg", link: "https://financialmodelingprep.com/market-news/" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), author: "A", site: "Financial Modeling Prep" });
  const P0 = [
    art(4, "Tesla (NASDAQ: TSLA) Slides After Shareholders Vote on Musk Pay Package", "NASDAQ:TSLA", ["Tesla shares fell <strong>4.2%</strong> after the vote result.", "Elon Musk's package is tied to market-value milestones.", "Deliveries guidance was left unchanged."]),
    art(11, "Nvidia (NASDAQ: NVDA) Rises as Data-Center Chip Demand Beats Estimates", "NASDAQ:NVDA", ["Nvidia revenue rose <strong>62%</strong>.", "Guidance topped estimates.", "Semiconductors led the Nasdaq-100 higher."]),
    art(25, "Deere (NYSE: DE) Cuts Outlook as Trump Tariffs Raise Steel Costs", "NYSE:DE", ["Deere lowered its profit outlook.", "Management cited tariffs on imported steel.", "Shares fell 3%."], "The White House said new tariffs take effect next month."),
    art(40, "Coinbase (NASDAQ: COIN) Jumps as Bitcoin Tops $100,000", "NASDAQ:COIN", ["Coinbase rose 6%.", "Bitcoin crossed $100,000.", "Trading volumes climbed."]),
    art(58, "Exxon Mobil (NYSE: XOM) Falls as Oil Prices Drop on OPEC+ Output Plan", "NYSE:XOM", ["Crude fell 2.4%.", "OPEC+ signalled higher output.", "Exxon shares slipped."]),
    art(75, "Wix (NASDAQ: WIX) Exceeds Earnings and Revenue Estimates", "NASDAQ:WIX", ["EPS of $1.42 beat the $1.40 estimate.", "Bookings grew 11%.", "Gross margin was 69%."]),
    art(95, "UBS upgrades Morgan Stanley Direct Lending Fund (NYSE: MSDL) from Neutral to Buy", "NYSE:MSDL", ["UBS upgraded MSDL to Buy.", "Net investment income beat.", "Credit concerns persist."]),
    art(130, "<img src=x onerror=alert(1)> Fed Holds Rates as Powell Flags Inflation Risk", "", ["The Federal Reserve held rates.", "Powell said inflation risks remain."]),
    Object.assign(art(200, "Apple (NASDAQ: AAPL) Price Target Raised", "NASDAQ:AAPL, NYSE:XYZ", ["Target raised to $300."]), { link: "javascript:alert(1)" }),
  ];
  const P1 = [art(1500, "Newmont (NYSE: NEM) Gains as Gold Hits Record", "NYSE:NEM", ["Gold set a record high.", "Newmont rose 3%."]), art(1700, "Small Cap Co (NASDAQ: SMLL) Reports Q3 Earnings", "NASDAQ:SMLL", ["Revenue rose 2%."])];
  const C = window.__calls = { n: 0, news: 0, by: {} };
  const quote = sym => [{ symbol: sym, name: sym, price: 100 + sym.length, change: 1.2, changePercentage: 1.1, dayLow: 99, dayHigh: 103, open: 99.5, previousClose: 99, volume: 123456, yearHigh: 150, yearLow: 60, priceAvg50: 98, priceAvg200: 90, marketCap: 1e12, timestamp: Math.floor(Date.now() / 1000) }];
  const hist = () => { const out = []; let p = 100; for (let i = 80; i >= 1; i--) { const d = new Date(Date.now() - i * 864e5); if (d.getUTCDay() % 6 === 0) continue; const o = p; p = Math.max(20, p + Math.sin(i / 3) * 2 + (i % 5 - 2) * 0.4); out.push({ date: d.toISOString().slice(0, 10), open: o, high: Math.max(o, p) + 1, low: Math.min(o, p) - 1, close: p, volume: 1e6 }); } return out; };
  const answer = (tool, input) => { C.n++; C.by[tool] = (C.by[tool] || 0) + 1;
    if (tool === "news") { C.news++; if (window.__newsErr) throw { code: "tool_error", message: window.__newsErr }; return { payload: (input.page ? P1 : (window.__extra ? [art(1, "Fresh: Microsoft (NASDAQ: MSFT) Announces Buyback", "NASDAQ:MSFT", ["Microsoft announced a buyback."])].concat(P0) : P0)) }; }
    if (tool === "calendar") return { payload: [{ symbol: input.symbol, date: "2027-01-27", epsActual: null, epsEstimated: 0.51, revenueActual: null, revenueEstimated: 28638190000 }, { symbol: input.symbol, date: "2026-10-21", epsActual: 0.48, epsEstimated: 0.4488, revenueActual: 28046000000, revenueEstimated: 28056790000 }] };
    if (tool === "analyst" && input.endpoint === "price-target-consensus") return { payload: [{ symbol: input.symbol, targetHigh: 840, targetLow: 157, targetConsensus: 442.59, targetMedian: 442 }] };
    if (tool === "analyst") return { payload: [{ symbol: input.symbol, strongBuy: 0, buy: 36, hold: 33, sell: 14, strongSell: 0, consensus: "Buy" }] };
    if (/historical/.test(input.endpoint)) return { payload: hist() };
    return { payload: quote(input.symbol || "X") }; };
  const mcp = { callTool: async (server, tool, input, opts) => { await new Promise(r => setTimeout(r, 60)); return answer(tool, input); },
    watchTool: (server, tool, input, handler, opts) => { let on = true; setTimeout(() => { if (!on) return; try { handler({ type: "data", result: answer(tool, input) }); } catch (e) { handler({ type: "error", error: e }); } }, 80); return () => { on = false; }; },
    listTools: async () => ({ servers: [{ tools: [] }] }) };
  const sample = async (input, opts) => { window.__samplePrompt = typeof input === "string" ? input : JSON.stringify(input); window.__sampleOpts = { model: opts.model, effort: opts.effort }; const full = /LEAN: </.test(window.__samplePrompt) ? "LEAN: SELL for Tesla (TSLA) · confidence low\n- **Why:** price is below its 50-day average.\n- **A buy would need:** a close back above 106.\n- **A sell would need:** a break of 99.\n- **Wrong if:** it reclaims 106." : "- **What happened:** the company reported results.\n- **What it could move, and why:** the stock itself; little effect on MNQ.\n- **Check before acting:** the daily trend and the earnings calendar."; for (let i = 1; i <= 4; i++) { await new Promise(r => setTimeout(r, 120)); opts.onText && opts.onText({ text: full.slice(0, Math.floor(full.length * i / 4)) }); } return { text: full, truncated: false, modelApplied: "claude-fable-5-2" }; };
  sample.limits = async () => ({ images: false });
  window.claude = { use: async name => name === "mcp" ? (window.__noMcp ? null : mcp) : name === "sample" ? sample : null };
})();
"""
async def run(b, w, h, mob, tag, out):
    ctx = await b.new_context(viewport={"width": w, "height": h}, has_touch=mob, is_mobile=mob, device_scale_factor=2 if mob else 1)
    pg = await ctx.new_page(); errs = []; R = {}
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    await pg.add_init_script(MOCK)
    await pg.goto("file://" + CW + "/test.html"); await pg.wait_for_timeout(1800)
    R["home_rows"] = await pg.evaluate("document.querySelectorAll('#hmNewsBox .nwrow').length")
    R["st"] = await pg.evaluate("__T.MK.st"); R["calls_news_boot"] = await pg.evaluate("window.__calls.news")
    el = await pg.query_selector("#hmNewsBox"); await el.scroll_into_view_if_needed(); await pg.wait_for_timeout(200); await pg.screenshot(path=f"/tmp/nw_{tag}_home.png")
    await pg.click("#hmNewsAll"); await pg.wait_for_timeout(500)
    R["screen"] = await pg.evaluate("__T.MK.screen"); R["cards"] = await pg.evaluate("document.querySelectorAll('#nwList .nwi').length")
    R["cats"] = await pg.evaluate("[...document.querySelectorAll('#nwCats .chip')].map(c => c.textContent)")
    R["xss"] = await pg.evaluate("[!!window.__xss, document.querySelectorAll('#hmNews img').length, [...document.querySelectorAll('#hmNews a')].filter(a => !/^https:/.test(a.getAttribute('href'))).length]")
    R["first"] = await pg.evaluate("document.querySelector('#nwList .nwi').innerText.replace(/\\n+/g, ' | ').slice(0, 300)")
    R["stat"] = await pg.evaluate("document.querySelector('#nwStat').innerText.replace(/\\n+/g, ' | ')")
    await pg.screenshot(path=f"/tmp/nw_{tag}_news.png")
    for cat in ["musk", "trump", "crypto", "fut", "mnq", "mine", "earn", "calls"]:
        await pg.click(f'#nwCats [data-cat="{cat}"]'); await pg.wait_for_timeout(120)
        R["cat_" + cat] = await pg.evaluate("[...document.querySelectorAll('#nwList .nwi h3')].map(h => h.textContent.slice(0, 34))")
    await pg.click('#nwCats [data-cat="all"]'); await pg.fill("#nwFind", "tariff"); await pg.wait_for_timeout(200)
    R["find_tariff"] = await pg.evaluate("[...document.querySelectorAll('#nwList .nwi h3')].map(h => h.textContent.slice(0, 34))")
    R["find_focus_kept"] = await pg.evaluate("document.activeElement && document.activeElement.id")
    await pg.fill("#nwFind", "zzzz"); await pg.wait_for_timeout(200); R["find_none"] = await pg.evaluate("document.querySelector('#nwList').innerText.slice(0, 90)")
    await pg.fill("#nwFind", ""); await pg.wait_for_timeout(200)
    await pg.click('#nwList .nwi [data-more]'); await pg.wait_for_timeout(150); R["pts_open"] = await pg.evaluate("document.querySelectorAll('#nwList .nwi')[0].querySelectorAll('.nwpts li').length")
    await pg.click('#nwList .nwi [data-take]'); await pg.wait_for_timeout(250); R["take_mid"] = await pg.evaluate("(document.querySelector('#nwList .nwi [data-q]') || {}).innerText")
    await pg.wait_for_timeout(700); R["take_done"] = await pg.evaluate("(document.querySelector('#nwList .nwi [data-q]') || {}).innerText.slice(0, 80)")
    R["take_btn"] = await pg.evaluate("document.querySelector('#nwList .nwi [data-take]').textContent"); R["sample_opts"] = await pg.evaluate("window.__sampleOpts")
    R["prompt_has"] = await pg.evaluate("[/HEADLINE: Tesla/.test(window.__samplePrompt), /Do not tell the user to buy or sell/.test(window.__samplePrompt)]")
    await pg.screenshot(path=f"/tmp/nw_{tag}_take.png")
    await pg.evaluate("document.querySelector('#hmNews').scrollTop = 0"); await pg.click("#nwBriefGo"); await pg.wait_for_timeout(900)
    R["brief"] = await pg.evaluate("document.querySelector('#nwBriefOut').innerText.slice(0, 60)"); R["brief_prompt_rows"] = await pg.evaluate("(window.__samplePrompt.match(/^- \\[/gm) || []).length")
    await pg.screenshot(path=f"/tmp/nw_{tag}_brief.png")
    n0 = await pg.evaluate("window.__calls.news"); await pg.evaluate("window.__extra = true"); await pg.click("#nwRef"); await pg.wait_for_timeout(500)
    R["refresh_calls"] = await pg.evaluate("window.__calls.news") - n0; R["new_badges"] = await pg.evaluate("document.querySelectorAll('#nwList .nwnew').length"); R["cards_after"] = await pg.evaluate("document.querySelectorAll('#nwList .nwi').length")
    await pg.click("#nwRef"); await pg.wait_for_timeout(400); R["refresh_again_calls"] = await pg.evaluate("window.__calls.news") - n0; R["toast"] = await pg.evaluate("document.querySelector('#hmtoast').textContent")
    await pg.evaluate("document.querySelector('#nwMoreB').scrollIntoView()"); await pg.click("#nwMoreB"); await pg.wait_for_timeout(500)
    R["older_cards"] = await pg.evaluate("document.querySelectorAll('#nwList .nwi').length"); R["more_btn_left"] = await pg.evaluate("!!document.querySelector('#nwMoreB')")
    R["budget"] = await pg.evaluate("__T.callsToday()")
    await pg.evaluate("document.querySelector('#hmNews').scrollTop = 300"); y0 = await pg.evaluate("document.querySelector('#hmNews').scrollTop")
    await pg.evaluate("document.querySelector('#nwList [data-sym=\"NVDA\"]').click()"); await pg.wait_for_timeout(600)
    R["sym_screen"] = await pg.evaluate("[__T.MK.screen, __T.MK.sel]"); await pg.screenshot(path=f"/tmp/nw_{tag}_chart.png")
    await pg.click("#hcBack"); await pg.wait_for_timeout(400); R["back"] = await pg.evaluate("[__T.MK.screen, document.querySelector('#hmNews').scrollTop]"); R["y0"] = y0
    await pg.click("#nwGo"); await pg.wait_for_timeout(600); await pg.evaluate("__T.closeSheet()"); await pg.click("#menubtn"); await pg.wait_for_timeout(300)
    R["nav_item"] = await pg.evaluate("(document.querySelector('#nav [data-go=\"news\"]') || {}).innerText"); await pg.click('#nav [data-go="news"]'); await pg.wait_for_timeout(400); R["nav_opens"] = await pg.evaluate("__T.MK.screen")
    R["errs"] = errs[:5]; out[tag] = R; await ctx.close()
async def offline(b, out):
    ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
    pg = await ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script("window.__noMcp = true;" + MOCK)
    await pg.goto("file://" + CW + "/test.html"); await pg.wait_for_timeout(1200)
    await pg.click("#hmNewsAll"); await pg.wait_for_timeout(400)
    out["offline"] = {"stat": await pg.evaluate("document.querySelector('#nwStat').innerText"), "ban": await pg.evaluate("document.querySelector('#nwBan').innerText.slice(0, 120)"), "list": await pg.evaluate("document.querySelector('#nwList').innerText"), "errs": errs}
    await pg.screenshot(path="/tmp/nw_offline.png"); await ctx.close()
async def locked(b, out):
    ctx = await b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
    pg = await ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script("window.__newsErr = 'Access denied: this endpoint needs a higher plan';" + MOCK)
    await pg.goto("file://" + CW + "/test.html"); await pg.wait_for_timeout(1500)
    await pg.click("#hmNewsAll"); await pg.wait_for_timeout(600)
    out["locked"] = {"ban": await pg.evaluate("document.querySelector('#nwBan').innerText.slice(0, 90)"), "calls": await pg.evaluate("window.__calls.news"), "budget": await pg.evaluate("__T.callsToday()"), "errs": errs}
    await pg.wait_for_timeout(1000); out["locked"]["calls_later"] = await pg.evaluate("window.__calls.news"); await ctx.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox"]); out = {}
        await run(b, 390, 844, True, "m", out); await run(b, 1280, 800, False, "d", out); await offline(b, out); await locked(b, out)
        print(json.dumps(out, indent=1)); await b.close()
asyncio.run(main())
