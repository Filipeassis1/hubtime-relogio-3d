# Sound — synthesized with WebAudio (nothing to download)

Audio starts only after a user gesture: call `Sound.init()` inside the first `pointerdown`/`keydown`.

```js
const Sound = { ctx: null, on: true, master: null, noise: null,
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new AudioContext(); } catch { this.on = false; return; }
    const c = this.ctx, comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5;
    this.master = c.createGain(); this.master.gain.value = 0.8; this.master.connect(comp); comp.connect(c.destination);
    const buf = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = buf; },
  env(g, t, a, peak, dec) { g.gain.setValueAtTime(1e-4, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(1e-4, t + a + dec); },
  tone(type, f0, f1, dur, vol = 0.3) { if (!this.on || !this.ctx) return; const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); this.env(g, t, 0.005, vol, dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.05); },
  hiss(type, freq, q, dur, vol = 0.2) { if (!this.on || !this.ctx) return; const c = this.ctx, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q; this.env(g, t, 0.002, vol, dur);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05); },
};
```
Recipes:
| Sound | Recipe |
|---|---|
| Pop / plant / bubble | `tone('sine', 620, 170, 0.12)` + `hiss('bandpass', 2400, 1, 0.04, 0.12)` |
| Click / UI tick | `hiss('highpass', 4000, 0.7, 0.02)` + `tone('triangle', 1800, 1200, 0.03, 0.1)` |
| Whoosh / stretch | bandpass noise sweeping 420→1900 Hz (automate `f.frequency`) + `tone('triangle', 170, 390, 0.3)` |
| Thud / land | `tone('sine', 120, 45, 0.18)`, volume ∝ impact speed, throttle to one per 45 ms |
| Crack | 5 staggered `hiss('highpass', 3000, 1, 0.015)` |
| Boom | lowpass noise 3200→180 Hz + `tone('sine', 95, 32, 0.6)` |
| Creak | sawtooth 55–80 Hz → bandpass Q 9, LFO 14–26 Hz on the filter frequency |
| Chime / success | two `tone('sine')` a fifth apart (e.g. 660 and 990 Hz), 0.4 s, slight delay on the second |

- Mute button with `aria-pressed`, preference in try/catch localStorage; default on only for toys/games, off for landing pages.
- Recorded audio: `.mp3/.ogg` supporting files play via `new Audio('assets/x.mp3')` or `AudioLoader` + `PositionalAudio` (spatial; `webaudio_*` examples).
