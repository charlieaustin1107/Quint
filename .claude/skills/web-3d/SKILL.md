---
name: web-3d
description: How to build 3D models, scenes and animated visuals for phone web pages in this repo — when a hand-rolled canvas projection is enough, when to use three.js, and the performance rules for an iPhone. Use for 3D, WebGL, particles, Quint's brain or core visuals, or any animated graphic.
---

# 3D and animated visuals on a phone

## Pick the lightest tool that does the job
1. **Canvas 2D with your own projection** for small models (a wireframe core, a neural graph, a few hundred points): rotate points with a 3×3 matrix, divide by depth for perspective, draw lines and dots back to front. No library, works everywhere. Quint Brain's 3D brain (`quint-brain/src/qa_brainviz.js`) and the 3D Quint core are built this way.
2. **three.js** (MIT, https://threejs.org) for real meshes, lighting, materials, GLTF models or many thousands of particles. Load an exact version from cdnjs or jsdelivr (e.g. `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js`); never an unpinned URL. One renderer per page; dispose geometries and materials when a view closes.
3. **CSS 3D transforms** for flat cards that tilt or flip.

## Modelling
- Build geometry from maths where you can (icosahedron, torus knot, Fibonacci sphere for even points). Low-poly with glowing edges suits the Neon HUD look.
- For a modelled object, export GLTF/GLB from Blender, keep it under ~1 MB, and load it with three.js's `GLTFLoader` from the same pinned version.
- Colours come from the design tokens (cyan `#29d8ff`, violet `#9b6bff`, mint, rose) so 3D matches the pages.

## Phone performance rules
- Cap device pixel ratio at 2; size the canvas to its box with a `ResizeObserver`.
- Animate with `requestAnimationFrame`, and **stop** when the element is off screen (`IntersectionObserver`) or the page is hidden (`document.hidden`).
- Aim for under ~4 ms of drawing per frame; reuse arrays; no allocation in the loop.
- Respect `prefers-reduced-motion`: draw one still frame.
- Make visuals *mean* something: speed up while Quint thinks, pulse with his voice, colour by buy/sell.

## Testing
Screenshot the visual at 390×844 in Playwright, check `errs` is empty, and measure that the loop stops when hidden.
