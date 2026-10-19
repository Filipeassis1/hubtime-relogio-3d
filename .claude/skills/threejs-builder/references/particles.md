# Particles, debris, decals, crowds

| Count | Technique |
|---|---|
| ≤ 500 meshes (debris, puffs, confetti) | `InstancedMesh` pool, CPU update |
| 1k–50k sprites (dust, sparks, stars) | `THREE.Points` + custom shader (or `PointsNodeMaterial`), CPU or vertex-shader motion |
| 50k–1M+ | WebGPU compute (TSL `Fn().compute(count)`, `instancedArray`) — `webgpu_compute_particles*`, `webgpu_tsl_compute_attractors_particles` |
| Grass/trees/crowds | `InstancedMesh` + per-instance color + wind in the vertex stage; `@three.ez/instanced-mesh` for per-instance culling/LOD |

## InstancedMesh pool
```js
const MAX = 80, pool = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mat, MAX);
pool.count = 0; pool.frustumCulled = false; scene.add(pool);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();   // module-scope temps: zero allocations per frame
// tick
let i = 0;
for (const p of live) { p.v.y -= g * dt; p.v.multiplyScalar(Math.exp(-dt * 3)); p.p.addScaledVector(p.v, dt);
  const s = p.r * Math.sin(Math.PI * p.life / p.max);               // grow then shrink: no popping
  _m.compose(p.p, _q, _s.setScalar(s)); pool.setMatrixAt(i++, _m); }
pool.count = i; pool.instanceMatrix.needsUpdate = true;
```
- Per-instance color: `pool.setColorAt(i, color)`; `instanceColor.needsUpdate = true`.
- Liquid drops: orient UP → v, volume-preserving stretch `(r/√st, r·st, r/√st)`, `st = 1 + min(1.6, |v|·0.12)`.
- Decals/splats: ring buffer `i = n % MAX`, flat `CircleGeometry`, `depthWrite: false`, tiny y offset per index (no z-fight), random yaw + non-uniform scale. Projected decals: `DecalGeometry`.
- Shockwave: `RingGeometry(0.9, 1, 64)` on the floor, scale ×(1 + 5·dt), fade opacity.
- Puff on every interaction (toy-island): 8–12 particles, upward + radial velocity, gravity, ground clamp, 0.45–0.7 s life.

## Points with soft round sprites
```js
const mat = new THREE.PointsMaterial({ size: 0.05, map: radialTexture(THREE, [[0,'rgba(255,255,255,1)'],[1,'rgba(255,255,255,0)']]),
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
```
Fire/smoke/magic: additive blending + lifetime color ramp; soft particles (fade near geometry) via `SoftParticles` TSL util or depth texture.

## Wind for instanced foliage
Displace only the top of each blade/canopy by local Y; noise in world XZ + time gives coherent gusts; two octaves read
better than one. Density comes from instance count, not blade complexity.
