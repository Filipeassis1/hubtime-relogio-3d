# Physics

| Need | Use | Artifact status |
|---|---|---|
| Debris/fragments bouncing on a floor, a few bodies | the mini impulse solver below (no library) | ✅ |
| Stacking, joints, many bodies, character/vehicle controllers | **Rapier** `@dimforge/rapier3d-compat@0.21.0/dist/rapier.mjs` (wasm embedded) | ✅ init + step verified under the artifact CSP |
| Simple rigid bodies, pure JS | `cannon-es@0.20.0/dist/cannon-es.js` | ✅ verified |
| Heavy/AAA | Jolt (JoltPhysics.js) | local projects |
| R3F | `@react-three/rapier` 2.2 | local projects |

## Rapier
```js
const RAPIER = (await import('https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.21.0/dist/rapier.mjs')).default;
await RAPIER.init();                                    // compat build decodes its embedded wasm without fetch(data:)
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.1, 10));                       // static floor
const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 3, 0));
world.createCollider(RAPIER.ColliderDesc.ball(0.3).setRestitution(0.4).setFriction(0.8), body);
// tick: world.timestep = Math.min(dt, 1/30); world.step(); mesh.position.copy(body.translation()); mesh.quaternion.copy(body.rotation());
```
- Instanced bodies: one InstancedMesh, write `setMatrixAt(i, m.compose(t, r, s))` from each body (`physics_rapier_instancing`).
- Character controller: `world.createCharacterController(0.01)` (`physics_rapier_character_controller`); vehicles: `physics_rapier_vehicle_controller`.
- Convex hulls from meshes: `ColliderDesc.convexHull(positions)`; trimesh only for static.
- Scale gravity to the scene: a 2-unit toy looks floaty at −9.81; −15…−25 reads right.

## Mini impulse solver (from "The Watermelon Test")
- Body = mesh + contact points (farthest vertices along ~14 Fibonacci-sphere directions), `invM`, `invI = 1/(0.4 m r²)`, restitution `e`, friction `mu`.
- Step: gravity → integrate position → integrate rotation (`quat.premultiply(new Quaternion().setFromAxisAngle(w/|w|, |w|·dt))`).
- Each contact point below y=0: point velocity `v + w × r`; if moving down apply normal impulse `j = −(1+e)·v_y / (invM + invI·|r × n|²)` (e = 0 at low speed → no jitter), Coulomb friction clamped to `mu·j`; positional correction `pos.y −= deepest·0.85`.
- Damping on contact; sleep after 0.5 s under velocity thresholds; body–body as sphere push-apart; substep ×2.
- `tick(dt)` deterministic so `__app.sim(seconds)` can fast-forward for screenshots.

## Feel
- Clamp dt (≤ 1/30) and substep; physics with variable dt explodes after tab switches.
- Impact → sound volume ∝ impact speed, throttled (one per 45 ms); small camera shake on big impacts.
- Bake the mesh pose into the geometry before creating a body for a fragment (`applyMatrix4`, recenter on centroid).
