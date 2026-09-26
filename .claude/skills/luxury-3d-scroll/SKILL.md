---
name: luxury-3d-scroll
description: Build premium, award-level scroll-driven 3D (WebGL / Three.js) websites and hero sections — luxury product reveals, cinematic scrollytelling, particle morphs, glass/gem/metal materials, post-processing, kinetic typography. Use when asked for a "3D scroll" site, an Awwwards-style hero, a WebGL landing page, a product reveal, or anything described as premium/luxury/cinematic motion. Reference implementation lives in components/showcase/ (route /showcase).
---

# Luxury scroll-driven 3D

Build work that can be sold at studio rates ($5k–$60k+). The difference between a
$300 template and a $15k site is rarely the library. It is art direction, how the
motion feels, how well it performs on phones, and finish. Follow every rule below.

Reference implementation (read it before starting):
- `components/showcase/LumenScene.ts`: the Three.js engine (scene, materials, particles, post, device tiers, adaptive quality).
- `components/showcase/shaders.ts`: particle morph, backdrop and lens-finish GLSL.
- `components/showcase/LuxuryScrollExperience.tsx`: orchestration (Lenis, ScrollTrigger timeline, SplitText, preloader, cursor, sound, fallbacks).
- `components/showcase/AmbientDrone.ts`: generative Web Audio pad.

Stack: `three` + `gsap` (ScrollTrigger, SplitText, all free since 2025) + `lenis`. Use React Three Fiber only if the project already uses it.

## 1. Story before code
- Write the page as 4–6 **chapters**. Each chapter has one idea, one camera move, one change in the scene (formation, material, assembly or light), and one headline.
- Put the hero object **opposite the copy**: text on the left means the object sits on the right. Shift the camera's look-at target to do this, never the object.
- Bookend the page: the hero and the finale mirror each other (same framing, and the scene at rest).
- Give every chapter its own colour story (backdrop palette), interpolated between chapters.

## 2. Motion architecture (non-negotiable)
- **Scroll drives state, never the camera.** GSAP tweens a plain `state` object (camera position and target, morph, assembly, palette, exposure, bloom). The render loop chases that state with frame-rate-independent damping: `k = 1 - exp(-dt * λ)`, with λ ≈ 3.
- One `gsap.timeline` scrubbed over the whole page. Each keyframe lands exactly when its chapter's top reaches the viewport top (use section `offsetTop` as tween positions and durations).
- Lenis for smooth scroll, driven by `gsap.ticker` (a single RAF for everything), `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.lagSmoothing(0)`.
- Feed scroll velocity into the scene to drive chromatic aberration, particle turbulence and object spin, so the page reacts to how the visitor scrolls.
- Add pointer parallax on the camera and a small tilt on the object, both damped.

## 3. Look
- **Jewellery or product lighting**: bake a "black tent" studio into the env map (a dark box plus narrow HDR softbox strips, then `PMREMGenerator.fromScene`). Facets read crisp black and white. A bright room environment reads milky and grey.
- Glass or gems: `MeshPhysicalMaterial` with `transmission: 1`, `ior` (2.4 for diamond), `dispersion`, `thickness`, `iridescence`, `clearcoat`, and `flatShading` for facets. Transmission only refracts **opaque** geometry, so give it an opaque backdrop to bend.
- Metals: `metalness: 1` with `roughness` between 0.15 and 0.3. The env map does the work.
- Particles: a GPU `Points` with extra position attributes per formation. Mix between them in the vertex shader with a **per-particle stagger** (`aRand`), and add simplex or curl noise whose amplitude peaks mid-transition (`sin(π·fract(m))`). Use additive blending, `depthWrite: false`, and fade near the lens and at far distance.
- Post chain: RenderPass, UnrealBloom (HalfFloat target, threshold ≈ 0.85), OutputPass (ACES), then a lens pass (chromatic aberration × velocity, slight barrel distortion, vignette, animated grain).
- Typography: a high-contrast serif display face (Cormorant, Canela-style) plus a tracked uppercase sans for eyebrows. Reveal lines from behind masks with `SplitText.create(el, { type: 'lines', mask: 'lines' })` and `expo.out`. Put a soft radial scrim behind copy that sits over bright 3D.

## 4. Finish (this is where the price is)
- The preloader must do real work: `renderer.compileAsync(scene, camera)`, one warm-up render, and `document.fonts.ready` (split text only after fonts load). Then lift the curtain with `clip-path` and scale the object in with a back-ease.
- Offer opt-in sound (a generative Web Audio pad, no audio files) and a custom cursor (hidden on touch devices).
- Add a chapter rail or progress indicator, and a "begin again" ride back to the top.

## 5. Performance (clients fear slow sites; prove yours is fast)
- **Device tiers** (cores, `deviceMemory`, pointer type) set particle count, DPR cap (2 / 1.5 / 1), MSAA, transmission and bloom.
- **Adaptive governor**: if the frame-time EMA stays above 25ms for ~45 frames, step down in order: DPR, then bloom, then the transmissive material.
- Budgets: fewer than 100 draw calls on desktop and fewer than 50 on mobile. Use instancing and merged geometry. Compress models with Draco or Meshopt and textures with KTX2 (UASTC for normal/ORM maps, ETC1S for colour). Set a byte budget per scene before modelling.
- On mobile, ignore height-only resizes (URL bar) and size the canvas to `100lvh`.
- Dispose everything on unmount. Never call `forceContextLoss` on a canvas you will reuse (React StrictMode remounts).

## 6. Accessibility and robustness
- `prefers-reduced-motion`: no Lenis, no SplitText animation, no auto-spin or parallax, and faster damping. Scroll still tells the story.
- No WebGL2: set `data-webgl="off"` to show a CSS gradient poster. All copy stays in real DOM for SEO and screen readers.
- Real `<button>`s, `aria-pressed` on toggles, visible `:focus-visible` rings.

## 7. Verify before calling it done
Run the dev server and capture every chapter with Playwright. In this container, launch Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader`. Check desktop (1440×900) and mobile (390×844, `isMobile`, `hasTouch`). Also check reduced motion and no WebGL. Look for: copy overlapping the object, blown-out bloom, the object cropped on portrait screens, nav wrapping, and console errors.

## Selling it
Productise it into three tiers: Signature Hero, Scroll Story and Flagship. Show a Lighthouse or FPS report and a device-tier matrix in every proposal. The full Arabic playbook, with offer ideas and price ranges, is in `docs/3d-scroll-luxury-playbook.md`.
