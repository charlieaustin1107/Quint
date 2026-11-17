# Quint app: one self-contained page. --prod leaves out the test hooks.
import json, sys
import os
P = os.path.dirname(os.path.abspath(__file__)) + '/'
prod = '--prod' in sys.argv
head = open(P + 'head.html').read()
futs = open(P + 'futs.json').read()
js = "\n".join(["'use strict';", f"const FUTS = {futs};", open(P + 'brain.js').read(), open(P + 'qa_core.js').read(), open(P + 'qa_ui.js').read(), open(P + 'qa_brainviz.js').read(),
    "" if prod else "window.__Q = { VM, dkIsChat, ST, MK, DK, HC, QA, CO, QT, MKDEF, dkSend, dkCalls, dkBrief, dkTools, qaSpeak, voicePick, voiceScore, setView, openSet, qaScan, qaAsk, sessLevels, mxRow, BR, brData, machineRead, dkRec, qaSize, qaModel, hcSetTf, TVQ, tvCooling, qaTick, qaRefresh, dkNow, dkCached, FD, dkFeed, fdTf, pxLine, pxNow, pxBacktest, tvUsed, tvLeft, tvPlan, tvBgEvery };",
    "if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', qaStart); else qaStart();"])
out = head.replace("<!--SCRIPT-->", "<script>\n(() => {\n" + js + "\n})();\n</script>")
fn = P + ('../index.html' if prod else 'quint_test.html')  # --prod writes the copy that gets published
open(fn, 'w').write(out); print(fn, len(out))
