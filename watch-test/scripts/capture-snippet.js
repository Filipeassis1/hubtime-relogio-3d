/*
 * Render capture — paste in the browser console of `npm run dev` (development mode only, needs window.__app).
 * 1. In a terminal: python3 scripts/png-receiver.py renders/out
 * 2. Optional: set the browser window to the output size (e.g. 1600 × 1100).
 * 3. Paste this file, then call one of the helpers at the bottom.
 */
const app = window.__app;
let clock = performance.now();
const frames = (n) => { for (let i = 0; i < n; i++) { clock += 16.7; app.advance(clock); } }; // works even in a hidden tab
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Hide the test UI so the canvas fills the window.
const style = document.createElement('style');
style.textContent = '.ws{grid-template-columns:1fr!important}.ws-side,.json,.tooltip{display:none!important}';
document.head.appendChild(style);
window.dispatchEvent(new Event('resize'));

async function shot(name, background = ['#f4f6f9', '#dfe4ec']) {
  frames(3);
  const src = app.renderer.domElement, c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(c.width / 2, c.height * 0.4, 0, c.width / 2, c.height * 0.4, c.width * 0.75);
  grad.addColorStop(0, background[0]); grad.addColorStop(1, background[1]);
  g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, 0, 0);
  const res = await fetch('http://127.0.0.1:5199/', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, data: c.toDataURL('image/png') }),
  });
  return `${name}: ${res.status}`;
}

/** view: 'frente' | 'traseira' | 'explodido'; id: part ID to isolate or null; camera: [position, target] or null for the view's default. */
async function take(name, view, id = null, camera = null) {
  app.dispatch({ type: 'select', id: null });
  app.dispatch({ type: 'setView', view });
  await sleep(80); frames(90);
  if (id) { app.dispatch({ type: 'select', id }); await sleep(1200); frames(60); }
  if (camera) { app.controls.setLookAt(...camera[0], ...camera[1], false); frames(5); }
  return shot(name);
}

// Examples (the same framings used for renders/):
//   await take('relogio-frente.png', 'frente', null, [[62, 34, 200], [0, -2, 2]]);
//   await take('relogio-traseira.png', 'traseira', null, [[-165, 18, -95], [0, -2, -4]]);
//   await take('relogio-explodido.png', 'explodido', null, [[330, 80, 175], [0, 0, 6]]);
//   await take('relogio-zoom-coroa.png', 'frente', null, [[64, 16, 58], [23.5, 0, 5.1]]);
//   await take('02.png', 'frente', '02');   // one thumbnail per part for the detail panel
