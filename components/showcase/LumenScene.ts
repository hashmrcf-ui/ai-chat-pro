import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {
  backdropFragment,
  backdropVertex,
  finishFragment,
  finishVertex,
  particleFragment,
  particleVertex,
} from './shaders';

export type Tier = 'high' | 'mid' | 'low';

// Everything the scroll timeline animates. GSAP tweens these numbers; the render
// loop eases the real camera/objects toward them, so motion never feels mechanical.
export interface SceneState {
  camX: number;
  camY: number;
  camZ: number;
  tgtX: number;
  tgtY: number;
  tgtZ: number;
  morph: number; // particle formation, 0 → 3
  rings: number; // armillary assembly, 0 → 1
  palette: number; // backdrop colour story, 0 → 4
  exposure: number;
  bloom: number;
  intro: number; // 0 before the curtain lifts, 1 after
}

const TIER_SETTINGS: Record<Tier, { particles: number; maxDpr: number; msaa: number; transmission: boolean; bloom: boolean }> = {
  high: { particles: 42000, maxDpr: 2, msaa: 4, transmission: true, bloom: true },
  mid: { particles: 22000, maxDpr: 1.5, msaa: 0, transmission: true, bloom: true },
  low: { particles: 9000, maxDpr: 1, msaa: 0, transmission: false, bloom: false },
};

// Backdrop colour stories, one per chapter: [base, glowA, glowB].
const PALETTES = [
  ['#060608', '#6b4a1f', '#162433'], // onyx & amber
  ['#07070a', '#8a6a3a', '#2a1f3a'], // champagne & plum
  ['#03060a', '#0f3a44', '#3a2410'], // abyss teal
  ['#05050c', '#1c2350', '#6b4a1f'], // midnight
  ['#080605', '#a0742e', '#3a1f2a'], // aurum
].map((p) => p.map((hex) => new THREE.Color(hex)));

export function detectTier(): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory || 4;
  const touch = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
  if (touch) return cores >= 8 && memory >= 6 ? 'mid' : 'low';
  return cores >= 8 && memory >= 8 ? 'high' : 'mid';
}

// Deterministic randomness so the composition is identical on every visit.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildFormations(count: number) {
  const rand = mulberry32(7);
  const gauss = () => {
    const u = Math.max(rand(), 1e-6);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };
  const a = new Float32Array(count * 3);
  const b = new Float32Array(count * 3);
  const c = new Float32Array(count * 3);
  const d = new Float32Array(count * 3);
  const r = new Float32Array(count);
  const tilt = 0.38;
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    // A — nebula: a flattened cloud surrounding the stone.
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const rad = 3.4 + Math.pow(rand(), 0.6) * 7.5;
    a[i3] = s * Math.cos(th) * rad;
    a[i3 + 1] = u * rad * 0.55;
    a[i3 + 2] = s * Math.sin(th) * rad;

    // B — orbital disc: denser toward the inner edge, slightly tilted.
    const ang = rand() * Math.PI * 2;
    const dr = 2.3 + Math.pow(rand(), 1.6) * 2.9;
    const y = gauss() * 0.05 * (1 + (dr - 2.3));
    const bx = Math.cos(ang) * dr;
    const bz = Math.sin(ang) * dr;
    b[i3] = bx;
    b[i3 + 1] = y * Math.cos(tilt) - bz * Math.sin(tilt);
    b[i3 + 2] = y * Math.sin(tilt) + bz * Math.cos(tilt);

    // C — double helix rising from the depths, with 18% loose dust.
    if (rand() < 0.82) {
      const t = rand();
      const strand = i % 2;
      const hy = (t - 0.5) * 11;
      const ha = t * Math.PI * 6 + strand * Math.PI;
      const hr = 1.8 + Math.sin(t * Math.PI) * 0.9 + gauss() * 0.16;
      c[i3] = Math.cos(ha) * hr;
      c[i3 + 1] = hy;
      c[i3 + 2] = Math.sin(ha) * hr;
    } else {
      const da = rand() * Math.PI * 2;
      const drad = 1 + rand() * 4.5;
      c[i3] = Math.cos(da) * drad;
      c[i3 + 1] = (rand() - 0.5) * 12;
      c[i3 + 2] = Math.sin(da) * drad;
    }

    // D — halo: a Fibonacci sphere plus a thin outer crown.
    if (rand() < 0.7) {
      const fy = 1 - (i / (count - 1)) * 2;
      const fr = Math.sqrt(1 - fy * fy);
      const fa = golden * i;
      const R = 3.25 + gauss() * 0.04;
      d[i3] = Math.cos(fa) * fr * R;
      d[i3 + 1] = fy * R;
      d[i3 + 2] = Math.sin(fa) * fr * R;
    } else {
      const ca = rand() * Math.PI * 2;
      const cr = 4.6 + gauss() * 0.08;
      d[i3] = Math.cos(ca) * cr;
      d[i3 + 1] = gauss() * 0.03;
      d[i3 + 2] = Math.sin(ca) * cr;
    }

    r[i] = rand();
  }
  return { a, b, c, d, r };
}

// A brilliant cut built from a lathe profile: table, two crown bands, girdle,
// two pavilion bands and the culet. Flat shading turns each band into facets.
function buildGemGeometry() {
  const profile = [
    new THREE.Vector2(0.0001, 0.42),
    new THREE.Vector2(0.55, 0.42),
    new THREE.Vector2(0.8, 0.27),
    new THREE.Vector2(1.0, 0.08),
    new THREE.Vector2(1.0, 0.02),
    new THREE.Vector2(0.58, -0.44),
    new THREE.Vector2(0.0001, -0.98),
  ];
  const geo = new THREE.LatheGeometry(profile, 16).toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

// Jewellery is photographed in a black tent lit by a few narrow softboxes: the
// stone then reads as crisp black/white facets instead of a grey, milky blob.
// This builds that studio as an HDR scene and bakes it into an environment map.
function buildStudioEnvironment() {
  const env = new THREE.Scene();
  env.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(24, 24, 24),
      new THREE.MeshBasicMaterial({ color: '#040404', side: THREE.BackSide }),
    ),
  );
  const softbox = (w: number, h: number, color: string, intensity: number, pos: [number, number, number]) => {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    panel.position.set(...pos);
    panel.lookAt(0, 0, 0);
    env.add(panel);
  };
  softbox(1.1, 12, '#ffffff', 7, [-7, 0, 3]); // tall strip, left
  softbox(1.1, 12, '#fff1dc', 6, [7, 1, 2]); // tall strip, right (warm)
  softbox(9, 0.9, '#ffffff', 9, [0, 8, 1]); // overhead bar
  softbox(3, 3, '#ffcf8a', 2.5, [0, -3, -8]); // warm bounce behind
  softbox(0.6, 7, '#bcd4ff', 5, [4, -1, -7]); // cool kicker
  // A ring of small cards around the stone multiplies the number of bright facets.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const y = i % 2 ? 3.5 : -2;
    softbox(0.9, 1.6, i % 3 ? '#ffffff' : '#ffe2b8', 4 + (i % 4), [Math.cos(a) * 9, y, Math.sin(a) * 9]);
  }
  softbox(12, 5, '#ffffff', 0.6, [0, 1, 10]); // faint fill from the viewer's side
  return env;
}

function easeOutBack(t: number) {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface Ring {
  pivot: THREE.Group;
  spinner: THREE.Group;
  scatter: THREE.Quaternion;
  assembled: THREE.Quaternion;
  scatterScale: number;
  speed: number;
}

export class LumenScene {
  readonly state: SceneState = {
    camX: 0, camY: 0.35, camZ: 7.6,
    tgtX: 0, tgtY: -0.55, tgtZ: 0,
    morph: 0, rings: 0, palette: 0,
    exposure: 1, bloom: 0.55, intro: 0,
  };

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass | null = null;
  private finishPass: ShaderPass;
  private envTexture: THREE.Texture;

  private gem: THREE.Mesh;
  private gemGroup = new THREE.Group();
  private armillary = new THREE.Group();
  private rings: Ring[] = [];
  private particles: THREE.Points;
  private particleUniforms: Record<string, THREE.IUniform>;
  private backdropUniforms: Record<string, THREE.IUniform>;

  private settings: (typeof TIER_SETTINGS)[Tier];
  private reduced: boolean;
  private pixelRatio: number;
  private pointer = new THREE.Vector2();
  private pointerSmooth = new THREE.Vector2();
  private velocity = 0;
  private velocityTarget = 0;
  private lookAt = new THREE.Vector3();
  private camGoal = new THREE.Vector3();
  private tgtGoal = new THREE.Vector3();
  private layout = { offset: 1, distance: 1, lift: 0 };
  private width = 1;
  private height = 1;

  // Adaptive quality governor.
  private frameEma = 1 / 60;
  private slowFrames = 0;
  private cooldown = 90;

  constructor(canvas: HTMLCanvasElement, opts: { tier: Tier; reducedMotion: boolean }) {
    this.settings = { ...TIER_SETTINGS[opts.tier] };
    this.reduced = opts.reducedMotion;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.settings.maxDpr);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
    this.renderer.setClearColor('#050506', 1);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);
    this.camera.position.set(this.state.camX, this.state.camY, this.state.camZ);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const studio = buildStudioEnvironment();
    this.envTexture = pmrem.fromScene(studio, 0.02).texture;
    studio.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material | undefined)?.dispose();
    });
    pmrem.dispose();
    this.scene.environment = this.envTexture;

    const key = new THREE.DirectionalLight('#ffe2b0', 2.4);
    key.position.set(4, 6, 3);
    const rim = new THREE.DirectionalLight('#9fb8ff', 0.9);
    rim.position.set(-5, -2, -4);
    this.scene.add(key, rim);

    // Backdrop sphere.
    this.backdropUniforms = {
      uTime: { value: 0 },
      uBase: { value: PALETTES[0][0].clone() },
      uGlowA: { value: PALETTES[0][1].clone() },
      uGlowB: { value: PALETTES[0][2].clone() },
    };
    const backdrop = new THREE.Mesh(
      new THREE.SphereGeometry(45, 48, 24),
      new THREE.ShaderMaterial({
        vertexShader: backdropVertex,
        fragmentShader: backdropFragment,
        uniforms: this.backdropUniforms,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    backdrop.renderOrder = -1;
    this.scene.add(backdrop);

    // The stone.
    const gemMaterial = this.settings.transmission
      ? new THREE.MeshPhysicalMaterial({
          color: '#ffffff',
          metalness: 0,
          roughness: 0.02,
          transmission: 1,
          thickness: 1.6,
          ior: 2.4,
          dispersion: 4,
          iridescence: 0.35,
          iridescenceIOR: 1.3,
          clearcoat: 1,
          clearcoatRoughness: 0.02,
          specularIntensity: 1,
          envMapIntensity: 1.6,
          flatShading: true,
        })
      : this.blackDiamondMaterial();
    this.gem = new THREE.Mesh(buildGemGeometry(), gemMaterial);
    this.gem.scale.setScalar(0.0001);
    this.gemGroup.rotation.x = 0.28;
    this.gemGroup.add(this.gem);
    this.scene.add(this.gemGroup);

    // Armillary rings: equator, meridian and a 23.4° ecliptic — scattered as
    // huge sweeping arcs in the hero, assembled around the stone in chapter 03.
    const gold = new THREE.MeshStandardMaterial({ color: '#d9b36c', metalness: 1, roughness: 0.2, envMapIntensity: 1.6 });
    const ringDefs = [
      { radius: 2.2, assembled: new THREE.Euler(Math.PI / 2, 0, 0), scatter: new THREE.Euler(1.1, 0.4, 0.3), scatterScale: 2.4, speed: 0.35 },
      { radius: 2.55, assembled: new THREE.Euler(0, 0, 0), scatter: new THREE.Euler(0.3, 1.2, -0.6), scatterScale: 2.9, speed: -0.25 },
      { radius: 2.9, assembled: new THREE.Euler(Math.PI / 2 - 0.41, 0, 0.41), scatter: new THREE.Euler(-0.8, -0.5, 1.0), scatterScale: 3.3, speed: 0.18 },
    ];
    const beadGeo = new THREE.SphereGeometry(0.055, 24, 16);
    for (const def of ringDefs) {
      const pivot = new THREE.Group();
      const spinner = new THREE.Group();
      const torus = new THREE.Mesh(new THREE.TorusGeometry(def.radius, 0.014, 12, 220), gold);
      spinner.add(torus);
      for (const phase of [0, Math.PI * 0.9]) {
        const bead = new THREE.Mesh(beadGeo, gold);
        bead.position.set(Math.cos(phase) * def.radius, Math.sin(phase) * def.radius, 0);
        spinner.add(bead);
      }
      pivot.add(spinner);
      this.armillary.add(pivot);
      this.rings.push({
        pivot,
        spinner,
        scatter: new THREE.Quaternion().setFromEuler(def.scatter),
        assembled: new THREE.Quaternion().setFromEuler(def.assembled),
        scatterScale: def.scatterScale,
        speed: def.speed,
      });
    }
    this.scene.add(this.armillary);

    // Particles.
    const f = buildFormations(this.settings.particles);
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(f.a, 3));
    pGeo.setAttribute('aPosB', new THREE.BufferAttribute(f.b, 3));
    pGeo.setAttribute('aPosC', new THREE.BufferAttribute(f.c, 3));
    pGeo.setAttribute('aPosD', new THREE.BufferAttribute(f.d, 3));
    pGeo.setAttribute('aRand', new THREE.BufferAttribute(f.r, 1));
    this.particleUniforms = {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uPixelRatio: { value: this.pixelRatio },
      uSize: { value: 34 },
      uTurbulence: { value: 0 },
      uIntro: { value: 0 },
      uOpacity: { value: opts.tier === 'low' ? 1.2 : 0.9 },
      uColorA: { value: new THREE.Color('#e8c27a') },
      uColorB: { value: new THREE.Color('#fff1dc') },
    };
    this.particles = new THREE.Points(
      pGeo,
      new THREE.ShaderMaterial({
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        uniforms: this.particleUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);

    // Post-processing chain: render → bloom → tone map → lens finish.
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: this.settings.msaa });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (this.settings.bloom) {
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.6, 0.88);
      this.composer.addPass(this.bloomPass);
    }
    this.composer.addPass(new OutputPass());
    this.finishPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uVelocity: { value: 0 },
        uGrain: { value: this.reduced ? 0.025 : 0.045 },
        uResolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: finishVertex,
      fragmentShader: finishFragment,
    });
    this.composer.addPass(this.finishPass);
  }

  private blackDiamondMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: '#1a1a1f',
      metalness: 0.9,
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 3.5,
      flatShading: true,
    });
  }

  /** Compile every shader before the curtain lifts, so the first scroll never stutters. */
  async warmUp() {
    await this.renderer.compileAsync(this.scene, this.camera);
    this.composer.render(0);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const aspect = width / height;
    this.camera.aspect = aspect;
    // Portrait screens: centre the stone, step back, and lift it above the copy.
    this.layout.offset = aspect < 1 ? 0.15 : aspect < 1.3 ? 0.6 : 1;
    this.layout.distance = aspect < 1 ? 1.75 : aspect < 1.3 ? 1.15 : 1;
    this.layout.lift = aspect < 1 ? -1.1 : 0;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.finishPass.uniforms.uResolution.value.set(width * this.pixelRatio, height * this.pixelRatio);
  }

  setPointer(x: number, y: number) {
    this.pointer.set(x, y);
  }

  /** Scroll velocity in px/frame as reported by Lenis. */
  setScrollVelocity(v: number) {
    this.velocityTarget = Math.min(1, Math.abs(v) / 45);
  }

  tick(time: number, dt: number) {
    const s = this.state;
    dt = Math.min(dt, 0.1);
    const ease = 1 - Math.exp(-dt * (this.reduced ? 6 : 3.2));
    const parallax = this.reduced ? 0 : 1;

    this.velocityTarget *= Math.exp(-dt * 4);
    this.velocity += (this.velocityTarget - this.velocity) * (1 - Math.exp(-dt * 6));
    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-dt * 3));

    // Camera: chase the scroll-driven goal with frame-rate-independent damping.
    this.camGoal.set(
      s.camX * this.layout.distance + this.pointerSmooth.x * 0.35 * parallax,
      s.camY + this.pointerSmooth.y * 0.22 * parallax,
      s.camZ * this.layout.distance,
    );
    this.tgtGoal.set(s.tgtX * this.layout.offset, s.tgtY + this.layout.lift, s.tgtZ);
    this.camera.position.lerp(this.camGoal, ease);
    this.lookAt.lerp(this.tgtGoal, ease);
    this.camera.lookAt(this.lookAt);

    // Stone.
    const intro = clamp01(s.intro);
    this.gem.scale.setScalar(Math.max(0.0001, easeOutBack(intro) * 1.15));
    if (!this.reduced) this.gem.rotation.y += dt * (0.22 + this.velocity * 1.8);
    this.gemGroup.rotation.x = 0.28 - this.pointerSmooth.y * 0.12 * parallax;
    this.gemGroup.rotation.z = this.pointerSmooth.x * 0.08 * parallax;
    this.gemGroup.position.y = this.reduced ? 0 : Math.sin(time * 0.9) * 0.07;

    // Armillary: each ring assembles on its own beat.
    const q = new THREE.Quaternion();
    this.rings.forEach((ring, i) => {
      const t = clamp01((s.rings - i * 0.12) / 0.76);
      const e = t * t * (3 - 2 * t);
      q.slerpQuaternions(ring.scatter, ring.assembled, e);
      ring.pivot.quaternion.copy(q);
      ring.pivot.scale.setScalar(THREE.MathUtils.lerp(ring.scatterScale, 1, e) * (0.6 + 0.4 * easeOutBack(intro)));
      if (!this.reduced) ring.spinner.rotation.z += dt * ring.speed;
    });
    if (!this.reduced) this.armillary.rotation.y += dt * 0.06;

    // Particles.
    const pu = this.particleUniforms;
    pu.uTime.value = time;
    pu.uMorph.value = s.morph;
    pu.uTurbulence.value = this.reduced ? 0 : this.velocity * 0.9;
    pu.uIntro.value = intro;

    // Backdrop palette, interpolated between the two nearest chapters.
    const p = THREE.MathUtils.clamp(s.palette, 0, PALETTES.length - 1);
    const i0 = Math.floor(p);
    const i1 = Math.min(i0 + 1, PALETTES.length - 1);
    const pt = p - i0;
    const bu = this.backdropUniforms;
    bu.uTime.value = time;
    (bu.uBase.value as THREE.Color).lerpColors(PALETTES[i0][0], PALETTES[i1][0], pt);
    (bu.uGlowA.value as THREE.Color).lerpColors(PALETTES[i0][1], PALETTES[i1][1], pt);
    (bu.uGlowB.value as THREE.Color).lerpColors(PALETTES[i0][2], PALETTES[i1][2], pt);

    this.renderer.toneMappingExposure = s.exposure * (0.35 + 0.65 * intro);
    if (this.bloomPass) this.bloomPass.strength = s.bloom;
    this.finishPass.uniforms.uTime.value = time;
    this.finishPass.uniforms.uVelocity.value = this.reduced ? 0 : this.velocity;

    this.composer.render(dt);
    this.govern(dt);
  }

  // If the device can't hold ~40fps, step quality down one notch at a time:
  // pixel ratio first, then bloom, then the transmissive glass.
  private govern(dt: number) {
    this.frameEma += (dt - this.frameEma) * 0.05;
    if (this.cooldown > 0) {
      this.cooldown--;
      return;
    }
    this.slowFrames = this.frameEma > 1 / 40 ? this.slowFrames + 1 : 0;
    if (this.slowFrames < 45) return;
    this.slowFrames = 0;
    this.cooldown = 120;

    if (this.pixelRatio > 1) {
      this.pixelRatio = Math.max(1, this.pixelRatio - 0.25);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.composer.setPixelRatio(this.pixelRatio);
      this.particleUniforms.uPixelRatio.value = this.pixelRatio;
      this.resize(this.width, this.height);
    } else if (this.bloomPass?.enabled) {
      this.bloomPass.enabled = false;
    } else if (this.settings.transmission) {
      this.settings.transmission = false;
      const old = this.gem.material as THREE.Material;
      this.gem.material = this.blackDiamondMaterial();
      old.dispose();
    }
  }

  dispose() {
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.envTexture.dispose();
    this.composer.passes.forEach((pass) => pass.dispose());
    this.composer.dispose();
    this.renderer.dispose();
  }
}
