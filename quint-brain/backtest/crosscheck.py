"""Independent re-write of the two simple strategies, to check engine.js.

engine.js is copied from the app. This file re-implements the 20-candle breakout
and the New York open breakout from their written rules, from scratch, in Python.
If both give the same trades, the backtest numbers can be trusted.

    python3 quint-brain/backtest/crosscheck.py
"""
import csv
import sys
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

DIR = Path(__file__).resolve().parent
NY = ZoneInfo("America/New_York")
COST_USD, PT_USD = 2.5, 2


def load(name):
    rows = list(csv.DictReader(open(DIR / "data" / name)))
    seen, out = set(), []
    for r in sorted(rows, key=lambda r: int(r["t"])):
        if r["t"] in seen:
            continue
        seen.add(r["t"])
        out.append({k: float(r[k]) for k in "ohlcv"} | {"t": int(r["t"])})
    return out


def atr14(B):
    a, out = 0.0, [0.0] * len(B)
    s = 0.0
    for i in range(1, len(B)):
        tr = max(B[i]["h"] - B[i]["l"], abs(B[i]["h"] - B[i - 1]["c"]), abs(B[i]["l"] - B[i - 1]["c"]))
        if i <= 14:
            s += tr
            out[i] = s / i
        else:
            out[i] = (out[i - 1] * 13 + tr) / 14
    return out


def breakout(B, n=20, stop=2, tgt=3, hold=40):
    """Close above the prior 20-candle high = buy, below the low = sell. In at next open.
    Stop 2 ATR, target 3x the stop, out after 40 candles. Stop is checked before target."""
    A, trades, i = atr14(B), [], max(n, 15) + 1
    while i < len(B) - 1:
        hh = max(b["h"] for b in B[i - n:i])
        ll = min(b["l"] for b in B[i - n:i])
        c = B[i]["c"]
        d = 1 if c > hh else -1 if c < ll else 0
        if not d or not A[i] > 0:
            i += 1
            continue
        e = B[i + 1]["o"]
        sd = stop * A[i]
        st, tg = e - d * sd, e + d * sd * tgt
        x, j = None, i + 1
        while j < len(B):
            b = B[j]
            if d > 0:
                if b["l"] <= st: x = min(b["o"], st); break
                if b["h"] >= tg: x = tg; break
            else:
                if b["h"] >= st: x = max(b["o"], st); break
                if b["l"] <= tg: x = tg; break
            if j - i >= hold: x = b["c"]; break
            j += 1
        if x is None:
            break
        trades.append((B[i + 1]["t"], d, e, x))
        i = j
    return trades


def ny(t):
    z = datetime.fromtimestamp(t, timezone.utc).astimezone(NY)
    return z.date(), z.hour * 60 + z.minute


def ny_open(B, rng=15, cut=120, tgt=2):
    """High/low of the first 15 minutes from 9:30 NY. First 15m close outside it (before 11:30)
    = trade at the next open, stop on the other side, target 2R, flat by 15:55. One a day."""
    tf = round((B[-1]["t"] - B[-2]["t"]) / 60)
    trades, i, N = [], 0, len(B)
    while i < N:
        day, m = ny(B[i]["t"])
        if m != 570:
            i += 1
            continue
        hi, lo, k, cnt = float("-inf"), float("inf"), i, 0
        while k < N and ny(B[k]["t"])[0] == day and ny(B[k]["t"])[1] < 570 + rng:
            hi, lo, k, cnt = max(hi, B[k]["h"]), min(lo, B[k]["l"]), k + 1, cnt + 1
        if cnt == rng // tf and hi > lo:
            while k < N - 1 and ny(B[k]["t"])[0] == day and ny(B[k]["t"])[1] < 570 + cut:
                c = B[k]["c"]
                d = 1 if c > hi else -1 if c < lo else 0
                if not d:
                    k += 1
                    continue
                if ny(B[k + 1]["t"])[0] != day:
                    break
                e = B[k + 1]["o"]
                st = lo if d > 0 else hi
                sd = (e - st) * d
                if not sd > 0:
                    break
                tg = e + d * sd * tgt
                x, j = None, k + 1
                while j < N and ny(B[j]["t"])[0] == day:
                    b = B[j]
                    if d > 0:
                        if b["l"] <= st: x = min(b["o"], st); break
                        if b["h"] >= tg: x = tg; break
                    else:
                        if b["h"] >= st: x = max(b["o"], st); break
                        if b["l"] <= tg: x = tg; break
                    if ny(b["t"])[1] + tf >= 955: x = b["c"]; break
                    j += 1
                if x is None:
                    x = B[min(j, N) - 1]["c"]
                trades.append((B[k + 1]["t"], d, e, x))
                break
        while i < N and ny(B[i]["t"])[0] == day:
            i += 1
    return trades


def engine_trades(file):
    rows = list(csv.DictReader(open(DIR / "results" / file)))
    return [(int(datetime.fromisoformat(r["tIn"].replace("Z", "+00:00")).timestamp()), 1 if r["side"] == "long" else -1, float(r["entry"]), float(r["exit"])) for r in rows]


def compare(name, mine, theirs):
    usd = lambda tr: sum((x - e) * d * PT_USD - COST_USD for _, d, e, x in tr)
    same = len(mine) == len(theirs) and all(a[0] == b[0] and a[1] == b[1] and abs(a[2] - b[2]) < 1e-6 and abs(a[3] - b[3]) < 1e-6 for a, b in zip(mine, theirs))
    print(f"{name}: python {len(mine)} trades ${usd(mine):,.0f} | engine {len(theirs)} trades ${usd(theirs):,.0f} | {'MATCH' if same else 'DIFFERENT'}")
    return same


B = load("mnq_15m.csv")
ok = compare("20-candle breakout", breakout(B), engine_trades("trades_breakout_15m.csv"))
ok &= compare("New York open breakout", ny_open(B), engine_trades("trades_ny_open_15m.csv"))
sys.exit(0 if ok else 1)
