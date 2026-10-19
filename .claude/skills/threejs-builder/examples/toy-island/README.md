# Floating island — stylized toy (reference scene)

Townscaper-style floating diorama: noisy outline extruded WITH bevel (soft rim), underside lofted from the same
outline (strata in vertex colors, flat-shaded facets), lathe-canopy trees, rounded-box cottage, drifting clouds.
Game feel: tap = raycast the lawn and plant a tree with a damped-spring pop + instanced dust puff + synthesized
pop sound; drag = turn with inertia; Enter plants at a random free spot; mute persisted (try/catch localStorage).
Long lens (fov 22) = miniature feel. Neutral tone mapping keeps the pastel palette. No assets.

Genre preset: `art-direction.md` → Toy / casual game.
```bash
mkdir -p lib && cp ../../assets/procedural.js lib/
python3 ../../scripts/preview.py . --artifact-csp --states planted
```

Copy, names and colors in this scene are placeholders — in a real project take them from its content and design tokens.
