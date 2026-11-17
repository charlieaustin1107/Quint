"""Merge a TradingView candle download (mcp-tv-get-ohlcv output, rows or columns) into a CSV.

    python3 backtest/fetch_to_csv.py <download.json> backtest/data/mnq_15m.csv

New candles are added, and candles already in the CSV are kept, so the history grows over time.
If the same candle time appears twice, the newer download wins.
"""
import csv
import json
import re
import sys
from pathlib import Path


def bars_from(obj):
    """Find the candles in whatever shape the download came in."""
    if isinstance(obj, dict):
        if all(k in obj for k in ("t", "o", "h", "l", "c")) and isinstance(obj["t"], list):
            v = obj.get("v") or [0] * len(obj["t"])
            return [dict(t=obj["t"][i], o=obj["o"][i], h=obj["h"][i], l=obj["l"][i], c=obj["c"][i], v=v[i]) for i in range(len(obj["t"]))]
        for key in ("bars", "data", "result", "columns"):
            if key in obj:
                got = bars_from(obj[key])
                if got:
                    return got
        for val in obj.values():
            got = bars_from(val)
            if got:
                return got
    if isinstance(obj, list):
        if obj and isinstance(obj[0], dict) and "t" in obj[0] and "c" in obj[0]:
            return obj
        for val in obj:
            got = bars_from(val)
            if got:
                return got
    if isinstance(obj, str):
        try:
            return bars_from(json.loads(obj))
        except ValueError:
            return []
    return []


def main(src, dst):
    text = Path(src).read_text(encoding="utf-8")
    try:
        data = json.loads(text)
    except ValueError:
        data = json.loads(text[text.index("{"): text.rindex("}") + 1])
    new = bars_from(data)
    if not new:
        sys.exit(f"no candles found in {src}")
    dst = Path(dst)
    merged = {}
    if dst.exists():
        for r in csv.DictReader(open(dst)):
            merged[int(r["t"])] = r
    for b in new:
        t = int(b["t"])
        if t > 1e11:  # milliseconds
            t //= 1000
        merged[t] = dict(t=t, o=b["o"], h=b["h"], l=b["l"], c=b["c"], v=b.get("v", 0) or 0)
    dst.parent.mkdir(parents=True, exist_ok=True)
    with open(dst, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["t", "o", "h", "l", "c", "v"])
        w.writeheader()
        for t in sorted(merged):
            w.writerow(merged[t])
    print(f"{dst}: {len(new)} candles in download, {len(merged)} total")


if __name__ == "__main__":
    main(*sys.argv[1:3])
