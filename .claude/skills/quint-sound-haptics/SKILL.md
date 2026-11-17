---
name: quint-sound-haptics
description: How to add sound effects, haptics and spoken voice to Chart Wizard and Quint on an iPhone web page — ZzFX synthesized SFX, the iOS switch haptic, speech synthesis and recognition, and the rules that keep them pleasant. Use for any audio, SFX, vibration, haptic or voice work in this repo.
---

# Sound, haptics and voice

## Sound effects: synthesize, don't ship files
Use **ZzFX** (Frank Force, MIT, https://github.com/KilledByAPixel/ZzFX): a ~1 KB generator that turns a short parameter array into a sound with the Web Audio API. No audio files, so the single-file apps stay small. Design sounds in the ZzFX designer (https://killedbyapixel.github.io/ZzFX/), paste the array, keep the MIT notice next to the vendored code.

Rules:
- One `AudioContext`, created or resumed **inside a tap** (iOS keeps audio locked until a user gesture). Unlock on the first tap anywhere.
- Short (≤ 400 ms) and quiet; master volume about 0.3; a setting to turn sounds off, remembered on the phone.
- Sound means something: a buy call rises, a sell call falls, right/wrong in practice, target hit vs stop hit, alerts, voice mode on/off. **No sound on every tap**.
- iPhone's silent switch mutes Web Audio in Safari: never rely on a sound alone; pair it with something visible.

## Haptics on iPhone
iOS Safari doesn't support `navigator.vibrate`. Since Safari 17.4, toggling a hidden `<input type="checkbox" switch>` inside a real user tap fires a light Taptic tick. web-haptics (Lochie Axon, MIT, https://github.com/lochie/web-haptics, see the web-haptics skill) builds patterns from it; this repo uses a small own module with the same idea. Facts to respect:
- It only fires during a **user-initiated** event, so haptics can confirm taps (placing a line, choosing an answer) but can't buzz when a background alert arrives.
- Light and heavy feel the same on iPhone; patterns are made from several ticks.
- Android supports `navigator.vibrate(pattern)`; desktop silently no-ops.
- It depends on undocumented Safari behaviour and one source says Apple changed it in iOS 26.5: treat it as a bonus, never the only feedback.

## Voice
- Speaking: Claude's own voices via the artifact `tts` capability where offered (not in Safari or the mobile apps); otherwise `speechSynthesis` with the best English voice (Premium > Enhanced; never the novelty voices). Turn screen text into spoken words first (`sayScript` in `chart-wizard/src/quint.js`): the call first, trader words, prices as "and a quarter", one sentence per utterance.
- Listening: `SpeechRecognition`/`webkitSpeechRecognition` where the page may use it, started **inside the tap**; otherwise tell the owner to use the keyboard's 🎤 dictation. Voice mode is `VM`/`vmToggle` in `quint.js`.
- Ducking: lower or skip SFX while Quint is speaking.

## Testing
Mock `AudioContext` and `speechSynthesis` in Playwright, record what would play, and assert the right sound for each event and that nothing plays when sounds are off.
