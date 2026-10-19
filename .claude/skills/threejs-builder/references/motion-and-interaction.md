# Motion, interaction, camera, UI

## Contents
1. Time and the loop (Timer, clamped dt, test hooks)
2. Motion feel (damping, springs, easing, phases)
3. Interaction (pointer, tap vs drag, inertia, picking, keyboard)
4. Camera direction (framing for every aspect, parallax, push-in, shake)
5. Game feel and HTML UI over the canvas
6. Loading and failure states

## 1. Time and the loop
```js
const timer = new THREE.Timer(); timer.connect(document);   // THREE.Clock is deprecated since r183; Timer handles tab visibility
function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 1 / 30);           // clamp: tab switches don't explode simulations
  tick(dt);
  composer.render();                                        // or renderer.render / pipeline.render
}
await renderer.compileAsync(scene, camera);                 // precompile → no first-frame hitch
renderer.setAnimationLoop(frame);
requestAnimationFrame(() => document.body.classList.add('ready'));
window.__app = { renderer, scene, camera, ready: true,
  sim: (s, h = 1 / 60) => { for (let t = 0; t < s; t += h) tick(h); },   // preview.py --sim
  state: name => { /* jump to a named state for screenshots */ } };      // preview.py --states
```
`tick(dt)` must not render, so tests can fast-forward. For WebGPU set `ready` after ~3 frames (pipelines compile lazily).

## 2. Motion feel
```js
const k = 1 - Math.exp(-dt * 7);  val += (target - val) * k;              // frame-rate independent smoothing
vel += (-260 * x - 7 * vel) * dt; x += vel * dt;                          // damped spring (jiggle, squash)
const pop = 1 - Math.exp(-t * 7) * Math.cos(t * 16);                      // overshoot-and-settle pop-in (0→1)
const easeInOutCubic = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
```
- Phase timelines per object `{ arrive: .2, contract: .29, done: .8 }`; fire events on threshold crossing (`!fired && t >= T`), never equality.
- Anticipation before a big event (freeze, micro-jitter ±0.018, camera push-in), then release.
- Hide state changes inside motion (configurator: swap the material at the fastest point of a spin).
- Idle life: slow drift (0.06–0.15 rad/s), float bob (±2–4% of size, ~0.8–1.3 Hz), foliage sway with per-instance phase.
- Respect `prefers-reduced-motion`: no idle drift/bob/sway/shake, instant transitions, no particles.

## 3. Interaction
```js
let yaw = 0, yawVel = 0, down = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, last: e.clientX, t: performance.now(), moved: 0 }; yawVel = 0; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!down) return;
  const dx = e.clientX - down.last; down.moved = Math.max(down.moved, Math.hypot(e.clientX - down.x, e.clientY - down.y));
  if (down.moved > 8) { yaw += dx * 0.008; const now = performance.now(); yawVel = dx * 0.008 / Math.max(1, now - down.t) * 1000; down.t = now; }
  down.last = e.clientX; });
canvas.addEventListener('pointerup', e => { if (down?.moved < 8) tap(e.clientX, e.clientY); if (performance.now() - down?.t > 80) yawVel = 0; down = null; });
// tick: if (!down) { yaw += yawVel * dt; yawVel *= Math.exp(-dt * 2.6); }  object.rotation.y = yaw;
```
- Pointer events only (mouse/touch/pen). `touch-action: none` on the canvas; `user-select: none` on game UIs.
- Tap vs drag: < 8 px movement = tap. Released after a pause > 80 ms = no fling.
- Picking: `Raycaster.setFromCamera(ndc, camera)`; raycast a cheap invisible proxy, not a 50k-tri mesh; `intersectObject(x, false)`; check `hit.face.normal` to accept only top faces. For many objects: `three-mesh-bvh` (`acceleratedRaycast`).
- Hover cursor/tilt only for `pointerType === 'mouse'`.
- Keyboard: canvas `tabindex="0"` + `aria-label` describing the scene and controls; Enter/Space = main action; arrows = rotate; visible `:focus-visible`.
- `OrbitControls` when free inspection is the point: `enableDamping`, clamp `minPolarAngle/maxPolarAngle`, `minDistance/maxDistance`, `enablePan: false`; call `controls.update(dt)` in tick. `camera-controls` (yomotsu) for scripted camera moves.

## 4. Camera direction
```js
// Fit a bounding sphere for any aspect, then shift the subject with a view offset
const s = new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere());
const v = THREE.MathUtils.degToRad(camera.fov) / 2;
const dist = Math.max(s.radius / Math.tan(v), s.radius / (Math.tan(v) * camera.aspect)) / fill;   // fill 0.5–0.9
camera.position.copy(dir.normalize().multiplyScalar(dist)).add(s.center); camera.lookAt(s.center);
camera.setViewOffset(w, h, -w * 0.15, 0, w, h);   // negative x = subject moves right (copy column on the left)
camera.updateProjectionMatrix();
```
- Design for every container the scene lives in — typically wide desktop, a near-square box (a grid cell, a sidebar, the claude.ai artifact panel ~900×860) and phone portrait. Use the container's aspect (not the window's) and interpolate `fill`/offset by it.
- Portrait: move the subject up (positive y offset), copy below; or pull back and enlarge the ground so edges stay out of frame.
- Parallax: smoothed pointer offsets on a spherical rig (θ ±0.12, φ ±0.05).
- Push-in before a climax (`dist *= 1 - 0.07·push`), shake `amp = shake²·0.12` decaying `exp(-dt·5.5)`.

## 5. Game feel and UI
- Every action gets feedback within 100 ms: motion (pop/spring), particles (instanced puff), sound (synth), UI (counter bump).
- Counter bump: `el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump')`.
- Floaters (quips that rise and fade), flash overlay on impact, staged end screens guarded by a `round` counter.
- `aria-live="polite"` for status text; mute toggle with `aria-pressed`, persisted in try/catch localStorage.
- HTML over canvas for text (crisp, accessible); CSS2DRenderer for labels that follow 3D points.
- Reset must dispose geometries/materials/textures, clear pools, reset uniforms.

## 6. Loading and failure states
- Boot overlay with a progress bar from `LoadingManager` (`makeManager` in asset-loader.js); fade the canvas in after `compileAsync`.
- **Boot guard** (classic `<script>` before the importmap, see boilerplates): catches `error` (capture phase) and `unhandledrejection`, shows the message in the boot overlay, plus a 20 s watchdog. An infinite spinner gives the user nothing to report.
- WebGL creation in try/catch → readable message. WebGPURenderer falls back to WebGL 2 on its own; show which backend in a debug corner if useful.
