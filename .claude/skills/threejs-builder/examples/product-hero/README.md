# Product hero (reference scene)

Sneaker landing hero: real glTF (KHR_materials_variants colorways), studio HDRI reflections, bevelled pedestal,
two-level grounding (contact shadow under the shoe + soft occlusion blob under the pedestal), view-offset framing
that keeps the product clear of the copy column, drag-to-turn with inertia, colorway spin-swap.

Genre preset: `art-direction.md` → Product hero. Tone mapping: Neutral (product colors must stay true).

## Assets (run from this folder)
```bash
python3 ../../scripts/fetch_asset.py khronos MaterialsVariantsShoe --optimize --tex-size 2048   # 7.6 MB -> 1.8 MB GLB -> .glb.b64.txt
python3 ../../scripts/fetch_asset.py polyhaven studio_small_09                                   # HDRI as .hdr.b64.txt
mkdir -p lib && cp ../../assets/{asset-loader,contact-shadows,procedural}.js lib/
python3 ../../scripts/preview.py . --artifact-csp --states beach,street
```
Publish `index.html` with `files` = everything under `assets/` and `lib/`.
Model © 2021 Shopify, CC BY 4.0 — the credit line in the page is required.

Copy, names and colors in this scene are placeholders — in a real project take them from its content and design tokens.
