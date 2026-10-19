# Scroll-driven 3D (GSAP + ScrollTrigger + Lenis)

For landing pages where the 3D scene tells a story as the page scrolls. GSAP 3.15 (ScrollTrigger included, free) and
Lenis 1.3 load from cdn.jsdelivr.net/npm (verified importable under the artifact CSP).

## Setup (artifact-safe)
```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js"></script>
<!-- globals: gsap, ScrollTrigger, Lenis. ESM alternative: import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/+esm' -->
```
Layout: canvas `position: fixed; inset: 0; z-index: 0`; sections in normal flow above it (`position: relative; z-index: 1`), each ~100–150 vh.

```js
gsap.registerPlugin(ScrollTrigger);
const lenis = new Lenis({ lerp: 0.1 });                     // smooth scroll; skip when prefers-reduced-motion
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);

// One master timeline scrubbed by the whole page: camera + object states per section
const state = { camAz: 0.6, camEl: 0.2, dist: 6, explode: 0, hue: 0 };
const tl = gsap.timeline({ scrollTrigger: { trigger: '#story', start: 'top top', end: 'bottom bottom', scrub: 1 } });
tl.to(state, { camAz: -0.4, dist: 4.2, ease: 'none' })            // section 2: push in, orbit
  .to(state, { explode: 1, ease: 'none' })                       // section 3: exploded view
  .to(state, { camEl: 0.9, dist: 7, explode: 0, ease: 'none' }); // section 4: top-down overview
// tick(): place the camera from `state` (spherical), drive uniforms from it, then render
```
- **Scrub the state, render in your own loop.** Don't let GSAP touch three objects directly in hot paths; animate a plain object and read it in `tick`.
- `scrub: 1` (1 s catch-up) feels better than `true`; keep `ease: 'none'` on scrubbed tweens and put easing in the mapping.
- Pin a section for a sticky 3D moment: `ScrollTrigger.create({ trigger: '#s3', pin: true, end: '+=150%' })`.
- Text reveals: separate small tweens with `toggleActions: 'play none none reverse'`.
- `ScrollTrigger.refresh()` after fonts/assets load (layout shifts change trigger positions).
- Without GSAP: `p = scrollY / (document.documentElement.scrollHeight - innerHeight)` smoothed with the damping formula.

## Patterns
- Exploded view: per-part offset vectors (from model center to part center) × `state.explode`.
- Product color story: one section per variant; swap at section boundaries via `onEnter`/`onEnterBack`.
- Camera path: `CatmullRomCurve3` of key positions; `curve.getPointAt(p)` + look-at a second curve.
- Gallery: one plane per image (MeshBasicMaterial), scroll moves the camera, not the images; low-res placeholder then swap.
- Mobile: shorter sections, fewer pins, disable Lenis on touch (`'ontouchstart' in window`) if it fights native momentum.

## Screenshots of scroll states
Expose `__app.state('s2')` that sets `window.scrollTo(0, y)` + `ScrollTrigger.update()` + `tl.progress(p)` immediately,
then `preview.py --states s1,s2,s3`.
