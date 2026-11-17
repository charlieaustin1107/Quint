import os, sys, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))  # paths below are relative to this folder
prod = "--prod" in sys.argv
head = open("head.html").read()
js = "\n".join(open(f).read() for f in ["core.js", "chart.js", "game.js", "pillars.js", "pb_main.js", "pb_drills.js", "pb_timers.js", "pb_rest.js", "bt_data.js", "strategies.js", "coach.js", "replay.js", "learn2.js", "sheets.js", "live.js", "news.js", "share.js", "trades.js", "quint.js", "qlab.js", "dock.js", "start.js"])
if prod:
    js = re.sub(r"^window\.__T = .*$", "", js, flags=re.M)
data = open("data3.json").read()
out = head + "<script>\nconst DATA = " + data + ";\n(function () {\n" + js + "\n})();\n</script>\n</body>\n</html>\n"
fn = "../index.html" if prod else "test.html"  # --prod writes the copy that gets published; test.html keeps window.__T for the tests
open(fn, "w").write(out)
print(fn, len(out))
