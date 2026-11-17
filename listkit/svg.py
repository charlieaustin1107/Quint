"""Tiny deterministic SVG renderers for the README carousel and ticker."""

from __future__ import annotations

from xml.sax.saxutils import escape

THEMES = {
    "dark": {"bg": "#0d1117", "card": "#161b22", "border": "#30363d", "fg": "#e6edf3", "muted": "#8b949e", "accent": "#3fb950"},
    "light": {"bg": "#ffffff", "card": "#f6f8fa", "border": "#d0d7de", "fg": "#1f2328", "muted": "#59636e", "accent": "#1a7f37"},
}
FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"


def clip(text: str, n: int) -> str:
    text = " ".join(text.split())
    return text if len(text) <= n else text[: n - 1].rstrip() + "…"


def _marquee(cards: list[str], card_w: int, height: int, theme: str, title: str, empty: str) -> str:
    t = THEMES[theme]
    width = 900
    head = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img" aria-label="{escape(title)}">\n'
        f'<rect width="{width}" height="{height}" rx="10" fill="{t["bg"]}" stroke="{t["border"]}"/>\n'
        f'<text x="16" y="24" font-family="{FONT}" font-size="13" font-weight="600" fill="{t["accent"]}">{escape(title)}</text>\n'
    )
    if not cards:
        return head + (
            f'<text x="16" y="{height // 2 + 14}" font-family="{FONT}" font-size="13" fill="{t["muted"]}">{escape(empty)}</text>\n</svg>\n'
        )
    strip_w = card_w * len(cards)
    # Duplicate the strip so the scroll loops seamlessly; pause-free CSS animation.
    duration = max(12, 4 * len(cards))
    body = [
        "<defs><clipPath id=\"c\"><rect x=\"8\" y=\"34\" width=\"%d\" height=\"%d\" rx=\"6\"/></clipPath></defs>"
        % (width - 16, height - 42),
        f"<style>.s{{animation:m {duration}s linear infinite}}"
        f"@keyframes m{{from{{transform:translateX(0)}}to{{transform:translateX(-{strip_w}px)}}}}"
        "@media (prefers-reduced-motion:reduce){.s{animation:none}}</style>",
        '<g clip-path="url(#c)"><g class="s">',
    ]
    for copy in range(2):
        for i, card in enumerate(cards):
            x = 12 + copy * strip_w + i * card_w
            body.append(f'<g transform="translate({x},38)">{card}</g>')
    body.append("</g></g>")
    return head + "\n".join(body) + "\n</svg>\n"


def recently_added(rows: list[dict], theme: str) -> str:
    t = THEMES[theme]
    w, h = 280, 92
    cards = []
    for r in rows:
        cat = r["Category"] + (f" / {r['Sub-Category']}" if r["Sub-Category"] else "")
        cards.append(
            f'<rect width="{w - 12}" height="{h}" rx="8" fill="{t["card"]}" stroke="{t["border"]}"/>'
            f'<text x="12" y="24" font-family="{FONT}" font-size="14" font-weight="600" fill="{t["fg"]}">{escape(clip(r["Display Name"], 30))}</text>'
            f'<text x="12" y="44" font-family="{FONT}" font-size="11" fill="{t["accent"]}">{escape(clip(cat, 40))}</text>'
            f'<text x="12" y="64" font-family="{FONT}" font-size="11" fill="{t["muted"]}">{escape(clip(r["Description"], 44))}</text>'
            f'<text x="12" y="82" font-family="{FONT}" font-size="10" fill="{t["muted"]}">added {escape(r["Date Added"])}</text>'
        )
    return _marquee(cards, w, h + 46, theme, "Recently added", "Nothing added yet.")


def ticker(repos: list[dict], theme: str) -> str:
    t = THEMES[theme]
    w, h = 250, 64
    cards = []
    for r in repos:
        cards.append(
            f'<rect width="{w - 12}" height="{h}" rx="8" fill="{t["card"]}" stroke="{t["border"]}"/>'
            f'<text x="12" y="22" font-family="{FONT}" font-size="13" font-weight="600" fill="{t["fg"]}">{escape(clip(r["full_name"], 28))}</text>'
            f'<text x="12" y="40" font-family="{FONT}" font-size="11" fill="{t["accent"]}">★ {escape(str(r["stars"]))}</text>'
            f'<text x="12" y="56" font-family="{FONT}" font-size="11" fill="{t["muted"]}">{escape(clip(r["description"], 38))}</text>'
        )
    return _marquee(cards, w, h + 46, theme, "On GitHub", "No ticker data yet — run `make ticker`.")
