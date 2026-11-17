/* ----- timers (later stages) ----- */
let TMR = null;
function startTimer(secs, onExpire) { stopTimer(); if (ST.timers === false || reduceMotion && window.__noTimers) return; TMR = { end: performance.now() + secs * 1000, total: secs, onExpire, paused: false, iv: setInterval(tickTimer, 100) }; }
function tickTimer() { if (!TMR || TMR.paused) return; const left = Math.max(0, (TMR.end - performance.now()) / 1000), el = $("#tmr"); if (el) { el.querySelector("b").textContent = left.toFixed(1) + "s"; el.querySelector("i").style.transform = `scaleX(${left / TMR.total})`; el.classList.toggle("hot", left < 4); } if (left <= 0) { const f = TMR.onExpire; stopTimer(); f(); } }
function stopTimer() { if (TMR) { clearInterval(TMR.iv); TMR = null; } }
function pauseTimer() { if (TMR && !TMR.paused) { TMR.paused = true; TMR.remain = TMR.end - performance.now(); } }
function resumeTimer() { if (TMR && TMR.paused) { TMR.paused = false; TMR.end = performance.now() + TMR.remain; } }
const tmrHTML = () => TMR ? `<span class="tmr" id="tmr">⏱ <b>${Math.max(0, (TMR.end - performance.now()) / 1000).toFixed(1)}s</b><i style="transform:scaleX(${Math.max(0, (TMR.end - performance.now()) / 1000) / TMR.total})"></i></span>` : "";

