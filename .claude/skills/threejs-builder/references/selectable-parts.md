# Selectable multi-part products — pick, isolate, explode, swap

For products whose parts the user points at: configurators, diagnostic/service tools, assembly guides, spare-part
catalogs. The part list is usually a business requirement (IDs, names, statuses) that must survive every visual
change, so treat it as data and keep the 3D replaceable around it.

## Contents
1. Data first, geometry second
2. The part contract
3. Picking that feels right
4. Selection styles
5. Exploded view and view modes
6. Accessories and optional parts
7. One source for drawings and geometry
8. Performance notes
9. Tests that protect the part list

## 1. Data first, geometry second
- Keep the part list in a plain module (`parts.ts`: id, name, group, internal?, attributes) and the output shape
  (what the host app stores) in a reducer with pure functions. Test these without WebGL.
- Configuration rules (which parts exist in which variant) are pure functions too: `isPresent(id, config)`,
  `configWith(id, config)` (the closest config that contains a part, used when the user selects an absent part from
  a list).
- Never let a visual refactor rename or renumber parts; the host app's data depends on them.

## 2. The part contract
Wrap every part's meshes in one component (`PartGroup`) that owns:
- `id` in `userData` (picking walks parents to find it);
- the exploded-view offset (`position = offset × explode`, animated per frame from a shared ref);
- highlight state applied to its own material clones (one material set per part, or per-instance uniforms);
- registration in a map `id → Object3D` for camera focus;
- an optional invisible hit proxy for tiny parts (gaskets, pins, stems).
Any part can later be swapped for a GLB inside the same wrapper without touching selection, lists or output.
Add a test that every ID in the part list has a 3D component.

## 3. Picking that feels right
- Resolve the part from all intersections, sorted by distance, with a pass-through set for transparent parts
  (glass, covers): pick the first non-pass-through hit, the glass only when it is the only hit.
- Ignore a click whose pointer moved more than ~4 px (that was an orbit drag).
- Internal parts' hit proxies must not catch the pointer while the product is assembled: move proxies to a layer the
  raycaster ignores until the exploded view is open.
- Mirror selection in a list (search + IDs): parts that are hidden or absent are always reachable from the list.

## 4. Selection styles
| Style | Look | Use when |
|---|---|---|
| Isolation + muted context | selected part keeps its material + crisp outline; others become pale, desaturated, matte, ~35% opacity | default for picking; reads like a technical illustration |
| Muted opaque context + focus | others darker/desaturated but opaque, selected part gets a rim light, slight depth of field | photographic product pages |
| Edge-only context | others drawn as thin edges | very clean, more "UI" than "photo" |
| Stage | scene dims, a spot lights the part | presentations |
Rules that avoid the common failures:
- Never tint the selected part's material (blue emissive reads as a bug). Use an outline (postprocessing `Outline`
  with `Selection/Select`) and keep the material true.
- When context becomes translucent, stop drawing internal parts in the assembled view, or they show through.
- Ghost = color lerped to a pale neutral, map removed, metalness 0, roughness ~0.6, opacity ~0.35, depthWrite off,
  renderOrder after opaque. Toggling `transparent`/`map` recompiles shaders: precompile (`renderer.compileAsync`)
  or drive it with uniforms in production.
- Parts with a status (defect, missing, selected for replacement) get an HTML pin (`<Html>`) with a count anchored to
  the part, not a material tint. Anchor rings and two-sided parts manually; box centers fall inside holes.

## 5. Exploded view and view modes
- Offsets along the product's main axis in real units; internal parts far enough to be readable from a 3/4 side view.
- View modes (front, back, exploded) are state, each with its own camera pose. Back views of a closed object (a
  watch on a closed bracelet) need the camera to look through an opening, not through the part in the way.
- Selecting an internal part from the list switches to the exploded view; focusing the camera waits for the explode
  animation to finish before measuring the part's bounds.

## 6. Accessories and optional parts
- Accessories that are not part of the product (a sensor strap, a charger) are not drawn with the product; show them
  alone, framed by the camera, only while selected.
- Variant parts (strap material, protective cover) come from configuration, and the output keeps their status even
  when the user switches to a variant where they are hidden.

## 7. One source for drawings and geometry
Put 2D construction data (top outlines, half-section profiles, link and hand outlines) in a module with no three.js
dependency. The 3D builds from it (`ExtrudeGeometry`, `LatheGeometry`) and a small Node script exports the same
numbers as 1:1 SVG drawings with dimensions. Drawings and model can never diverge, and a measurement change
regenerates both. Node ≥ 22.6 runs `.ts` scripts directly when imports use explicit `.ts` extensions.

## 8. Performance notes
- Instance repeated parts (links, pins, ridges, teeth on a separate mesh if needed).
- Only the post stack costs real GPU time (AO, outline); budget it with adaptive DPR.
- Lazy-load the 3D chunk in the host app and show a pre-rendered poster while loading.
- `frameloop="demand"` for mostly static product views.

## 9. Tests that protect the part list
- Data: exact count, unique IDs, texts as specified.
- Config: every part reachable in some configuration.
- Reducer: select/toggle/config switch keeps statuses; invalid initial data is cleaned.
- Picking: pass-through glass, distance order, ignored misses.
- Visibility: internals only exploded; accessories only when selected.
- Coverage: one 3D component per part ID.
