# React Three Fiber (local / Vite projects)

Use R3F when the 3D lives inside a React app (match the app's React/R3F versions; Next.js, StrictMode, multiple
canvases and theming: `project-integration.md`). For a standalone claude.ai artifact prefer plain three: drei helpers
fetch assets from GitHub/CDNs at runtime (`<Environment preset>` → githack HDRIs, `useGLTF` draco decoders, fonts),
which the sandbox blocks, and `+esm` bundles from jsdelivr pin their own copy of three.

## Versions (npm, Oct 2026 — the project's lockfile wins)
`@react-three/fiber` 9.8.1 (React 19) · `@react-three/drei` 10.7.9 · `@react-three/postprocessing` 3.1.3 ·
`@react-three/rapier` 2.2.0 · `three` 0.186.1 · `leva` (GUI) · `maath` 0.10.8 · `gltfjsx` 6.5.3.

```bash
npm create vite@latest my-scene -- --template react-ts
npm i three @react-three/fiber @react-three/drei @react-three/postprocessing && npm i -D @types/three
npx gltfjsx public/model.glb --transform --types   # typed component + optimized GLB (draco/webp, resized)
```

## Skeleton with the skill's look defaults
```tsx
<Canvas shadows dpr={[1, 2]} camera={{ fov: 28, position: [3.2, 1.2, 3.8] }}
        gl={{ toneMapping: THREE.NeutralToneMapping, antialias: false }}>
  <Environment files="/hdri/studio_small_09_1k.hdr" environmentIntensity={1} environmentRotation={[0, 1.9, 0]} />
  <directionalLight position={[-2.4, 4, 1.6]} intensity={2} castShadow shadow-mapSize={2048} shadow-radius={10} shadow-intensity={0.55} />
  <directionalLight position={[2.2, 1.8, -2.8]} intensity={2.4} color="#e6eeff" />
  <Float speed={1.3} floatIntensity={0.3}><Model /></Float>
  <ContactShadows position={[0, 0.001, 0]} opacity={0.75} blur={2.6} far={0.8} resolution={512} color="#1d2433" />
  <EffectComposer multisampling={4}><N8AO aoRadius={0.5} intensity={2} /><Bloom luminanceThreshold={0.9} intensity={0.25} /></EffectComposer>
  <OrbitControls enablePan={false} minPolarAngle={0.35} maxPolarAngle={1.45} enableDamping />
</Canvas>
```
Useful drei pieces: `Environment` (files/preset/ground), `Lightformer` (custom softboxes inside an environment),
`AccumulativeShadows` + `RandomizedLight` (baked soft shadows), `ContactShadows`, `MeshTransmissionMaterial`,
`MeshReflectorMaterial`, `Float`, `PresentationControls`, `Bounds`/`Center`, `Text`/`Text3D`, `useGLTF`, `useTexture`,
`Instances`, `ScrollControls` + `useScroll`, `Html`, `PerformanceMonitor` (adaptive quality), `Preload`, `Loader`.

## Rules
- Animate in `useFrame((state, dt) => …)` with refs; never `setState` per frame.
- `frameloop="demand"` + `invalidate()` for static scenes (battery).
- Suspense + `useGLTF.preload('/model.glb')`; a designed `<Loader />` or custom progress via `useProgress`.
- The same art-direction, lighting and critique rules apply — R3F makes it faster to assemble, not better by default.
