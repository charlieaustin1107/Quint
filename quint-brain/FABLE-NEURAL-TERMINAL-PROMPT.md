# Fable implementation prompt — Quint Neural Terminal

Read `CLAUDE.md`, `.claude/skills/quint-design/SKILL.md`, and `docs/QUINT-NEURAL-TERMINAL-DESIGN.md` first.

Implement the Quint Neural Terminal visual upgrade in `quint-brain/src/` only. Do not hand-edit generated `quint-brain/index.html`. Preserve all current market-data, TradingView call-budget, five-pillar, strategy, records, alerts, chat, voice and risk behaviour.

Start by inspecting `qa_brainviz.js`, `head.html`, the current app layout and the existing tests. Then:
1. Implement a premium true-black interface with restrained turquoise accents and clear buy/sell/warning semantics.
2. Upgrade the brain visual into a recognisable 3D computer/chassis containing an animated neural processor. It must be state-driven from real Quint states and must not imply fake live data or signals.
3. Keep the existing self-contained build architecture. Prototype CSS 3D / Canvas / WebGL first; add Three.js only if a measured mobile prototype justifies the dependency. Do not add React or a bundler.
4. Improve the mobile command bar, market strip, main work area and navigation. Test 390×844 first, then desktop.
5. Add purposeful transitions, reduced-motion handling, WebGL fallback, pause-when-hidden and performance safeguards.
6. Add a command palette and integrated Market Pulse / Strategy Dock / Risk Guardian / Performance Vault / Activity Stream only where the underlying data and actions already exist. Never fabricate values or expose execution controls that bypass Quint Control safeguards.
7. Add/update Playwright tests, run the existing Quint Brain tests from CLAUDE.md, inspect screenshots and report exact pass/fail results.

Work in small commits. Do not publish the artifact or merge to main. Open a pull request for review. If an existing design rule conflicts with the owner's new turquoise direction, the new design brief wins only for Quint Brain; keep Chart Wizard unchanged.