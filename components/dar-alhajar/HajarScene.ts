import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { finishFragment, finishVertex } from '../showcase/shaders';
import type { Tier } from '../showcase/LumenScene';
import { moteFragment, moteVertex, skyFragment, skyVertex } from './hajarShaders';
import { buildFacade, buildMasonry, FLOOR_H } from './facade';

// Everything the scroll timeline animates. The render loop eases toward it.
export interface HajarState {
  camX: number;
  camY: number;
  camZ: number;
  tgtX: number; // the point of interest
  tgtY: number;
  tgtZ: number;
  side: number; // slides the frame sideways so the palace sits opposite the copy (+ = palace on the left)
  build: number; // 0 = bare rock, 1 = palace complete
  ruins: number; // remains of the ancient fortress of Dhu Saydan
  sun: number; // 0 morning, 0.5 golden hour, 0.75 dusk, 1 night
  glow: number; // lit rooms and qamariya glass
  xray: number; // see-through rock revealing what is carved inside
  bloom: number;
  intro: number;
}

const TIER_SETTINGS: Record<Tier, { maxDpr: number; msaa: number; shadows: number; trees: number; motes: number; ppm: number; bloom: boolean }> = {
  high: { maxDpr: 2, msaa: 4, shadows: 2048, trees: 900, motes: 1800, ppm: 64, bloom: true },
  mid: { maxDpr: 1.5, msaa: 0, shadows: 1024, trees: 500, motes: 1000, ppm: 48, bloom: true },
  low: { maxDpr: 1, msaa: 0, shadows: 0, trees: 220, motes: 500, ppm: 32, bloom: false },
};

const ROCK_H = 30;

// ---------- deterministic noise for terrain ----------
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x: number, y: number, z: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

const fade = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function valueNoise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

function fbm(x: number, y: number, z: number, octaves = 4) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, z * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Wadi Dhahr: a green valley floor walled by tall cliffs.
function groundHeight(x: number, z: number) {
  const axis = Math.abs(x + 14 * Math.sin(z * 0.012));
  const edge = axis + (fbm(x * 0.02, 3.1, z * 0.02) - 0.5) * 50;
  const wall = smooth(62, 128, edge) * (58 + fbm(x * 0.03, 7.7, z * 0.03) * 30);
  const bumps = (fbm(x * 0.05, 1.7, z * 0.05) - 0.5) * 2.4;
  const r = Math.hypot(x, z);
  return wall + bumps * smooth(10, 26, r);
}

// ---------- time-of-day keys ----------
interface SkyKey {
  zenith: string; horizon: string; ground: string; fog: string;
  sun: string; sunI: number; elev: number;
  hemiSky: string; hemiGround: string; hemiI: number;
}
const SKY_KEYS: Array<[number, SkyKey]> = [
  [0, { zenith: '#4d7aa6', horizon: '#dccaa6', ground: '#8a7556', fog: '#cdbd9c', sun: '#fff0d4', sunI: 3.0, elev: 0.9, hemiSky: '#c4d6ea', hemiGround: '#6b5a44', hemiI: 1.1 }],
  [0.5, { zenith: '#3a4d78', horizon: '#f1a05a', ground: '#6a4a33', fog: '#d9a06a', sun: '#ffb266', sunI: 3.4, elev: 0.2, hemiSky: '#f0b98c', hemiGround: '#4a382a', hemiI: 0.75 }],
  [0.75, { zenith: '#272745', horizon: '#c4604a', ground: '#3a2a2a', fog: '#6e4a55', sun: '#ff7040', sunI: 1.3, elev: 0.03, hemiSky: '#6d5a7d', hemiGround: '#2a2230', hemiI: 0.5 }],
  [1, { zenith: '#02030b', horizon: '#131d3c', ground: '#07080f', fog: '#0c1226', sun: '#9fb4e6', sunI: 1.25, elev: 0.75, hemiSky: '#3a5088', hemiGround: '#0e0e1a', hemiI: 0.75 }],
];

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
function mixColor(out: THREE.Color, a: string, b: string, t: number) {
  return out.copy(tmpA.set(a)).lerp(tmpB.set(b), t);
}

interface Piece {
  mesh: THREE.Object3D;
  order: number;
}

interface Volume {
  x: number; z: number; w: number; d: number;
  base: number; floors: number; stoneFloors: number;
  grand?: boolean; plinth?: number;
}

// An interpretive massing of the palace: a keep on the rock's crown, an upper
// tower and rooftop mafraj, and two wings stepping down the rock's flanks.
const VOLUMES: Volume[] = [
  { x: 0, z: 0, w: 10, d: 9, base: 0, floors: 4, stoneFloors: 1 },
  { x: 1.2, z: -0.6, w: 7, d: 6.4, base: 12, floors: 2, stoneFloors: 0 },
  { x: 2.2, z: -0.2, w: 4.6, d: 4.4, base: 18, floors: 1, stoneFloors: 0, grand: true },
  { x: -8.4, z: 1.6, w: 6.6, d: 7, base: -5, floors: 3, stoneFloors: 1, plinth: 7 },
  { x: 8, z: -2.2, w: 5.6, d: 6, base: -8, floors: 3, stoneFloors: 1, plinth: 7 },
];

export class HajarScene {
  readonly state: HajarState = {
    camX: -62, camY: 30, camZ: 92, tgtX: 0, tgtY: 26, tgtZ: 0, side: 0,
    build: 1, ruins: 0, sun: 0.5, glow: 0.15, xray: 0, bloom: 0.5, intro: 0,
  };

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass | null = null;
  private finishPass: ShaderPass;

  private sunLight: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private fog: THREE.FogExp2;
  private skyUniforms: Record<string, THREE.IUniform>;
  private moteUniforms: Record<string, THREE.IUniform>;
  private villageUniforms: Record<string, THREE.IUniform>;

  private pieces: Piece[] = [];
  private palaceMaterials: THREE.MeshStandardMaterial[] = [];
  private ruins = new THREE.Group();
  private rockMaterial: THREE.MeshStandardMaterial;
  private carved: THREE.LineSegments;

  private settings: (typeof TIER_SETTINGS)[Tier];
  private reduced: boolean;
  private pixelRatio: number;
  private pointer = new THREE.Vector2();
  private pointerSmooth = new THREE.Vector2();
  private velocity = 0;
  private velocityTarget = 0;
  private lookAt = new THREE.Vector3(0, 30, 0);
  private camGoal = new THREE.Vector3();
  private tgtGoal = new THREE.Vector3();
  private layout = { offset: 1, distance: 1, lift: 0 };
  private width = 1;
  private height = 1;
  private frameEma = 1 / 60;
  private slowFrames = 0;
  private cooldown = 90;

  constructor(canvas: HTMLCanvasElement, opts: { tier: Tier; reducedMotion: boolean }) {
    this.settings = { ...TIER_SETTINGS[opts.tier] };
    this.reduced = opts.reducedMotion;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.settings.maxDpr);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    if (this.settings.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 1600);
    this.camera.position.set(this.state.camX, this.state.camY, this.state.camZ);

    this.fog = new THREE.FogExp2('#d9a06a', 0.0029);
    this.scene.fog = this.fog;

    // Light.
    this.sunLight = new THREE.DirectionalLight('#ffb266', 3);
    this.sunLight.target.position.set(0, 28, 0);
    if (this.settings.shadows) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(this.settings.shadows, this.settings.shadows);
      const cam = this.sunLight.shadow.camera;
      cam.left = -60; cam.right = 60; cam.top = 60; cam.bottom = -60; cam.near = 1; cam.far = 300;
      this.sunLight.shadow.bias = -0.0004;
      this.sunLight.shadow.normalBias = 0.04;
    }
    this.hemi = new THREE.HemisphereLight('#f0b98c', '#4a382a', 0.75);
    this.scene.add(this.sunLight, this.sunLight.target, this.hemi);

    // Sky.
    this.skyUniforms = {
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uGround: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color() },
      uMoonDir: { value: new THREE.Vector3(0.5, 0.55, -0.7).normalize() },
      uNight: { value: 0 },
      uTime: { value: 0 },
    };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(900, 48, 24),
      new THREE.ShaderMaterial({ vertexShader: skyVertex, fragmentShader: skyFragment, uniforms: this.skyUniforms, side: THREE.BackSide, depthWrite: false }),
    );
    sky.renderOrder = -1;
    this.scene.add(sky);

    this.buildValley();
    this.rockMaterial = this.buildRock();
    this.buildRuins();
    this.buildPalace();
    this.carved = this.buildCarvedInterior();

    // Dust motes drifting in the light.
    const motes = this.settings.motes;
    const mPos = new Float32Array(motes * 3);
    const mRand = new Float32Array(motes);
    const rand = mulberry32(11);
    for (let i = 0; i < motes; i++) {
      mPos[i * 3] = (rand() - 0.5) * 90;
      mPos[i * 3 + 1] = 4 + rand() * 55;
      mPos[i * 3 + 2] = (rand() - 0.5) * 90;
      mRand[i] = rand();
    }
    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
    mGeo.setAttribute('aRand', new THREE.BufferAttribute(mRand, 1));
    this.moteUniforms = {
      uTime: { value: 0 }, uPixelRatio: { value: this.pixelRatio }, uSize: { value: 70 }, uDrift: { value: 1 },
      uColor: { value: new THREE.Color('#ffd49a') }, uOpacity: { value: 0.6 },
    };
    const moteMesh = new THREE.Points(mGeo, new THREE.ShaderMaterial({
      vertexShader: moteVertex, fragmentShader: moteFragment, uniforms: this.moteUniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    moteMesh.frustumCulled = false;
    this.scene.add(moteMesh);

    // Post-processing.
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: this.settings.msaa });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (this.settings.bloom) {
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.55, 0.86);
      this.composer.addPass(this.bloomPass);
    }
    this.composer.addPass(new OutputPass());
    this.finishPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null }, uTime: { value: 0 }, uVelocity: { value: 0 },
        uGrain: { value: this.reduced ? 0.02 : 0.04 }, uResolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: finishVertex,
      fragmentShader: finishFragment,
    });
    this.composer.addPass(this.finishPass);

    // Village lights for the night chapters (declared last; uniforms used in tick).
    this.villageUniforms = this.buildVillage();
  }

  // ---------- world building ----------
  private buildValley() {
    const size = 520;
    const seg = this.settings.trees > 500 ? 200 : 140;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const floorA = new THREE.Color('#4d5a2e');
    const floorB = new THREE.Color('#7a6546');
    const cliffA = new THREE.Color('#9a7654');
    const cliffB = new THREE.Color('#c7a57c');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = groundHeight(x, z);
      pos.setY(i, y);
      const patch = fbm(x * 0.06, 0.5, z * 0.06);
      c.copy(floorA).lerp(floorB, smooth(0.35, 0.7, patch));
      const cliff = smooth(3, 30, y);
      c.lerp(tmpA.copy(cliffA).lerp(cliffB, smooth(20, 80, y) * 0.8 + fbm(x * 0.2, y * 0.3, z * 0.2) * 0.2), cliff);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Orchards along the valley floor.
    const count = this.settings.trees;
    const trees = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.3, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), count);
    const rand = mulberry32(5);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const green = new THREE.Color();
    let placed = 0;
    for (let tries = 0; placed < count && tries < count * 8; tries++) {
      const x = (rand() - 0.5) * 240;
      const z = (rand() - 0.5) * 320;
      const y = groundHeight(x, z);
      if (Math.hypot(x, z) < 26 || y > 3) continue;
      const k = 0.7 + rand() * 0.8;
      p.set(x, y + 1.1 * k, z);
      s.set(k, k * (0.75 + rand() * 0.3), k);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI);
      trees.setMatrixAt(placed, m.compose(p, q, s));
      trees.setColorAt(placed, green.setHSL(0.22 + rand() * 0.06, 0.4, 0.11 + rand() * 0.06));
      placed++;
    }
    trees.count = placed;
    trees.castShadow = true;
    trees.receiveShadow = true;
    this.scene.add(trees);
  }

  private buildRock() {
    const geo = new THREE.CylinderGeometry(9.2, 17.5, ROCK_H + 4, 96, 56, false);
    geo.translate(0, (ROCK_H + 4) / 2 - 4, 0);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    const c = new THREE.Color();
    const base = new THREE.Color('#8b6b4f');
    const dark = new THREE.Color('#4c3a2d');
    const light = new THREE.Color('#bf9c74');
    const soil = new THREE.Color('#3f3b29');
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const r = Math.hypot(v.x, v.z);
      // The same function of (angle, height) moves the side wall and the cap's rim,
      // so the seam never opens. Cap centres (r = 0) stay put.
      if (r > 0.01) {
        const ang = Math.atan2(v.z, v.x);
        const n = fbm(Math.cos(ang) * 2.4 + 5, v.y * 0.09, Math.sin(ang) * 2.4 + 5);
        const streak = fbm(ang * 5 + 9, v.y * 0.02, 1.3);
        const rimOnly = r > 9.1 || v.y < ROCK_H - 0.01;
        if (rimOnly) {
          const bulge = (n - 0.5) * 7 + (streak - 0.5) * 3;
          const k = Math.max(0.4, (r + bulge) / r);
          v.x *= k;
          v.z *= k;
          // Break the flat top edge into a ragged crest.
          v.y -= smooth(ROCK_H - 3, ROCK_H, v.y) * fbm(ang * 3 + 2, 4.4, 8.1) * 2.6;
        }
      }
      pos.setXYZ(i, v.x, v.y, v.z);
      const t = fbm(v.x * 0.2, v.y * 0.28, v.z * 0.2);
      c.copy(base).lerp(t > 0.5 ? light : dark, Math.min(1, Math.abs(t - 0.5) * 2.2));
      c.lerp(soil, smooth(3, -2, v.y) * 0.7);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, transparent: true, opacity: 1 });
    const rock = new THREE.Mesh(geo, mat);
    rock.castShadow = true;
    rock.receiveShadow = true;
    this.scene.add(rock);
    return mat;
  }

  private buildRuins() {
    const mat = new THREE.MeshStandardMaterial({ color: '#7a624c', roughness: 1, flatShading: true });
    const rand = mulberry32(21);
    const outline: Array<[number, number, number, number]> = [
      [-6, -5, 6, -5], [6, -5, 6, 4.5], [6, 4.5, -1, 4.5], [-6, 4.5, -6, -5],
    ];
    for (const [x0, z0, x1, z1] of outline) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const blocks = Math.floor(len / 1.1);
      for (let b = 0; b < blocks; b++) {
        if (rand() < 0.22) continue; // breaches in the old walls
        const t = (b + 0.5) / blocks;
        const h = 0.3 + rand() * 1.7;
        const block = new THREE.Mesh(new THREE.BoxGeometry(1.05, h, 1.1), mat);
        block.geometry.translate(0, h / 2, 0);
        block.position.set(lerp(x0, x1, t), ROCK_H - 0.2, lerp(z0, z1, t));
        block.rotation.y = (rand() - 0.5) * 0.2;
        block.castShadow = true;
        block.receiveShadow = true;
        this.ruins.add(block);
      }
    }
    this.ruins.scale.y = 0.001;
    this.scene.add(this.ruins);
  }

  private buildPalace() {
    const palace = new THREE.Group();
    palace.position.y = ROCK_H;
    this.scene.add(palace);
    const ppm = this.settings.ppm;
    const roofMat = new THREE.MeshStandardMaterial({ color: '#8f7e68', roughness: 1 });
    const plaster = new THREE.MeshStandardMaterial({ color: '#efe7d6', roughness: 0.85 });
    const merlonGeo = new THREE.ConeGeometry(0.22, 0.55, 4);
    merlonGeo.rotateY(Math.PI / 4);
    merlonGeo.translate(0, 0.27, 0);

    const pieces: Array<{ mesh: THREE.Object3D; y: number }> = [];

    VOLUMES.forEach((vol, vi) => {
      const front = buildFacade({ widthM: vol.w, floors: vol.floors, stoneFloors: vol.stoneFloors, grand: vol.grand, seed: 100 + vi, ppm });
      const side = buildFacade({ widthM: vol.d, floors: vol.floors, stoneFloors: vol.stoneFloors, grand: vol.grand, seed: 200 + vi, ppm });
      const mk = (f: { map: THREE.Texture; emissiveMap: THREE.Texture }) => {
        const m = new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emissiveMap, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.92 });
        this.palaceMaterials.push(m);
        return m;
      };
      const frontMat = mk(front);
      const sideMat = mk(side);
      const mats = [sideMat, sideMat, roofMat, roofMat, frontMat, frontMat];

      if (vol.plinth) {
        const plinthGeo = new THREE.BoxGeometry(vol.w * 0.94, vol.plinth, vol.d * 0.94);
        plinthGeo.translate(0, -vol.plinth / 2, 0);
        const plinth = new THREE.Mesh(plinthGeo, new THREE.MeshStandardMaterial({ map: buildMasonry(vol.w, vol.plinth, 300 + vi, ppm / 2), roughness: 1 }));
        plinth.position.set(vol.x, vol.base, vol.z);
        plinth.castShadow = plinth.receiveShadow = true;
        palace.add(plinth);
        pieces.push({ mesh: plinth, y: vol.base - vol.plinth });
      }

      for (let f = 0; f < vol.floors; f++) {
        const geo = new THREE.BoxGeometry(vol.w, FLOOR_H, vol.d);
        geo.translate(0, FLOOR_H / 2, 0);
        // Point each side face at this storey's slice of the facade canvas.
        const uv = geo.attributes.uv;
        for (const face of [0, 1, 4, 5]) {
          for (let k = 0; k < 4; k++) {
            const idx = face * 4 + k;
            uv.setY(idx, (f + uv.getY(idx)) / vol.floors);
          }
        }
        const floor = new THREE.Mesh(geo, mats);
        floor.position.set(vol.x, vol.base + f * FLOOR_H, vol.z);
        floor.castShadow = floor.receiveShadow = true;
        palace.add(floor);
        pieces.push({ mesh: floor, y: vol.base + f * FLOOR_H });
      }

      // Crown: gypsum parapet band and white stepped merlons.
      const top = vol.base + vol.floors * FLOOR_H;
      const crown = new THREE.Group();
      crown.position.set(vol.x, top, vol.z);
      const band = new THREE.Mesh(new THREE.BoxGeometry(vol.w + 0.2, 0.35, vol.d + 0.2), plaster);
      band.position.y = 0.17;
      crown.add(band);
      const spots: THREE.Vector3[] = [];
      const step = 0.85;
      for (let x = -vol.w / 2 + 0.3; x <= vol.w / 2 - 0.3; x += step) {
        spots.push(new THREE.Vector3(x, 0.35, -vol.d / 2), new THREE.Vector3(x, 0.35, vol.d / 2));
      }
      for (let z = -vol.d / 2 + 0.3 + step; z <= vol.d / 2 - 0.3 - step; z += step) {
        spots.push(new THREE.Vector3(-vol.w / 2, 0.35, z), new THREE.Vector3(vol.w / 2, 0.35, z));
      }
      const merlons = new THREE.InstancedMesh(merlonGeo, plaster, spots.length);
      const m = new THREE.Matrix4();
      spots.forEach((p, i) => merlons.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
      merlons.castShadow = true;
      crown.add(merlons);
      palace.add(crown);
      pieces.push({ mesh: crown, y: top - 0.01 });
    });

    pieces.sort((a, b) => a.y - b.y);
    this.pieces = pieces.map((p, i) => ({ mesh: p.mesh, order: i }));
  }

  // Gold "blueprint" lines inside the rock: carved rooms, the stair, the double well.
  private buildCarvedInterior() {
    const positions: number[] = [];
    const push = (a: THREE.Vector3, b: THREE.Vector3) => positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    const edges = (geo: THREE.BufferGeometry, offset: THREE.Vector3) => {
      const e = new THREE.EdgesGeometry(geo, 1);
      const p = e.attributes.position;
      for (let i = 0; i < p.count; i++) positions.push(p.getX(i) + offset.x, p.getY(i) + offset.y, p.getZ(i) + offset.z);
      e.dispose();
      geo.dispose();
    };
    // Two well shafts.
    edges(new THREE.CylinderGeometry(0.7, 0.7, 17, 12, 1, true), new THREE.Vector3(-1.4, ROCK_H - 8.5, 0.6));
    edges(new THREE.CylinderGeometry(0.7, 0.7, 17, 12, 1, true), new THREE.Vector3(1.6, ROCK_H - 8.5, -0.4));
    // Rock-cut rooms.
    edges(new THREE.BoxGeometry(6.5, 3, 4.5), new THREE.Vector3(-2, ROCK_H - 2.2, -1));
    edges(new THREE.BoxGeometry(4.5, 2.8, 4), new THREE.Vector3(2.5, ROCK_H - 6, 1.2));
    // Stair spiralling up from the granite.
    const turns = 2.2;
    const steps = 70;
    let prev = new THREE.Vector3();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = t * turns * Math.PI * 2;
      const r = 5.2 - t * 1.4;
      const p = new THREE.Vector3(Math.cos(a) * r, 1 + t * (ROCK_H - 2), Math.sin(a) * r);
      if (i > 0) push(prev, p);
      const inner = p.clone().setLength(r - 1.1);
      inner.y = p.y;
      if (i % 2 === 0) push(p, inner);
      prev = p;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const lines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: new THREE.Color('#ffcf7a').multiplyScalar(2.2), transparent: true, opacity: 0, depthTest: false, blending: THREE.AdditiveBlending }),
    );
    lines.renderOrder = 10;
    this.scene.add(lines);
    return lines;
  }

  private buildVillage() {
    const rand = mulberry32(33);
    const houses = 70;
    // Village houses share one small two-storey facade (and its night glow).
    const facade = buildFacade({ widthM: 6, floors: 2, stoneFloors: 0, seed: 400, ppm: 20 });
    const wall = new THREE.MeshStandardMaterial({ map: facade.map, emissiveMap: facade.emissiveMap, emissive: '#ffffff', emissiveIntensity: 0, roughness: 1 });
    this.palaceMaterials.push(wall);
    const roof = new THREE.MeshStandardMaterial({ color: '#8a7760', roughness: 1 });
    const box = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), [wall, wall, roof, roof, wall, wall], houses);
    const lights: number[] = [];
    const lightRand: number[] = [];
    const m = new THREE.Matrix4();
    let placed = 0;
    for (let tries = 0; placed < houses && tries < 2000; tries++) {
      const x = (rand() - 0.5) * 200;
      const z = (rand() - 0.5) * 300;
      const y = groundHeight(x, z);
      if (Math.hypot(x, z) < 48 || y > 6) continue;
      const w = 4 + rand() * 4, h = 3 + rand() * 3.5, d = 4 + rand() * 4;
      m.compose(new THREE.Vector3(x, y + h / 2, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI), new THREE.Vector3(w, h, d));
      box.setMatrixAt(placed, m);
      for (let l = 0; l < 3; l++) {
        lights.push(x + (rand() - 0.5) * w, y + 1.5 + rand() * (h - 2), z + (rand() - 0.5) * d);
        lightRand.push(rand());
      }
      placed++;
    }
    box.count = placed;
    box.castShadow = true;
    box.receiveShadow = true;
    this.scene.add(box);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(lights, 3));
    geo.setAttribute('aRand', new THREE.Float32BufferAttribute(lightRand, 1));
    const uniforms = {
      uTime: { value: 0 }, uPixelRatio: { value: this.pixelRatio }, uSize: { value: 700 }, uDrift: { value: 0 },
      uColor: { value: new THREE.Color('#ffb04a').multiplyScalar(2) }, uOpacity: { value: 0 },
    };
    const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
      vertexShader: moteVertex, fragmentShader: moteFragment, uniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    pts.frustumCulled = false;
    this.scene.add(pts);
    return uniforms;
  }

  // ---------- runtime ----------
  async warmUp() {
    await this.renderer.compileAsync(this.scene, this.camera);
    this.composer.render(0);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.layout.offset = aspect < 1 ? 0.15 : aspect < 1.3 ? 0.6 : 1;
    this.layout.distance = aspect < 1 ? 1.6 : aspect < 1.3 ? 1.15 : 1;
    this.layout.lift = aspect < 1 ? -12 : 0;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.finishPass.uniforms.uResolution.value.set(width * this.pixelRatio, height * this.pixelRatio);
  }

  setPointer(x: number, y: number) {
    this.pointer.set(x, y);
  }

  setScrollVelocity(v: number) {
    this.velocityTarget = Math.min(1, Math.abs(v) / 45);
  }

  private applySky(sun: number) {
    let i = 0;
    while (i < SKY_KEYS.length - 2 && sun > SKY_KEYS[i + 1][0]) i++;
    const [t0, a] = SKY_KEYS[i];
    const [t1, b] = SKY_KEYS[i + 1];
    const t = Math.min(1, Math.max(0, (sun - t0) / (t1 - t0)));
    const su = this.skyUniforms;
    mixColor(su.uZenith.value, a.zenith, b.zenith, t);
    mixColor(su.uHorizon.value, a.horizon, b.horizon, t);
    mixColor(su.uGround.value, a.ground, b.ground, t);
    mixColor(this.fog.color, a.fog, b.fog, t);
    mixColor(su.uSunColor.value, a.sun, b.sun, t);
    mixColor(this.sunLight.color, a.sun, b.sun, t);
    this.sunLight.intensity = lerp(a.sunI, b.sunI, t);
    mixColor(this.hemi.color, a.hemiSky, b.hemiSky, t);
    mixColor(this.hemi.groundColor, a.hemiGround, b.hemiGround, t);
    this.hemi.intensity = lerp(a.hemiI, b.hemiI, t);

    // The sun sets in the west (behind-left of the hero shot); the moon rises opposite.
    const night = smooth(0.78, 1, sun);
    su.uNight.value = night;
    const elev = lerp(a.elev, b.elev, t);
    const sunDir = new THREE.Vector3(-0.75, Math.sin(elev) + 0.02, 0.62).normalize();
    su.uSunDir.value.copy(sunDir);
    const lightDir = night > 0.5 ? (su.uMoonDir.value as THREE.Vector3) : sunDir;
    this.sunLight.position.copy(this.sunLight.target.position).addScaledVector(lightDir, 120);
  }

  tick(time: number, dt: number) {
    const s = this.state;
    dt = Math.min(dt, 0.1);
    const ease = 1 - Math.exp(-dt * (this.reduced ? 6 : 2.8));
    const parallax = this.reduced ? 0 : 1;

    this.velocityTarget *= Math.exp(-dt * 4);
    this.velocity += (this.velocityTarget - this.velocity) * (1 - Math.exp(-dt * 6));
    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-dt * 3));

    const intro = Math.min(1, Math.max(0, s.intro));
    const dolly = 1 - intro;
    this.camGoal.set(
      s.camX * this.layout.distance + this.pointerSmooth.x * 2.2 * parallax,
      s.camY + this.pointerSmooth.y * 1.4 * parallax + dolly * 10,
      s.camZ * this.layout.distance + dolly * 40,
    );
    this.tgtGoal.set(s.tgtX, s.tgtY + this.layout.lift, s.tgtZ);
    const fx = this.tgtGoal.x - this.camGoal.x;
    const fz = this.tgtGoal.z - this.camGoal.z;
    const fl = Math.hypot(fx, fz) || 1;
    const shift = s.side * this.layout.offset;
    this.tgtGoal.x += (-fz / fl) * shift;
    this.tgtGoal.z += (fx / fl) * shift;
    this.camera.position.lerp(this.camGoal, ease);
    this.lookAt.lerp(this.tgtGoal, ease);
    this.camera.lookAt(this.lookAt);

    // Palace: storeys rise from the rock in order, and fall back into it on rewind.
    const n = this.pieces.length;
    const stagger = 0.55;
    const span = (n - 1) * stagger + 1;
    for (const piece of this.pieces) {
      const local = Math.min(1, Math.max(0, s.build * span - piece.order * stagger));
      const e = 1 - Math.pow(1 - local, 3);
      piece.mesh.scale.y = Math.max(0.001, e);
      piece.mesh.visible = e > 0.002;
    }
    this.ruins.scale.y = Math.max(0.001, s.ruins);
    this.ruins.visible = s.ruins > 0.01;

    const glow = s.glow * (0.92 + 0.08 * Math.sin(time * 3.1));
    for (const m of this.palaceMaterials) m.emissiveIntensity = glow * 2.4;

    this.rockMaterial.opacity = 1 - s.xray * 0.55;
    this.rockMaterial.depthWrite = s.xray < 0.05;
    (this.carved.material as THREE.LineBasicMaterial).opacity = s.xray;
    this.carved.visible = s.xray > 0.01;

    this.applySky(s.sun);
    this.skyUniforms.uTime.value = time;

    const golden = 1 - Math.min(1, Math.abs(s.sun - 0.5) * 2.2);
    this.moteUniforms.uTime.value = time;
    this.moteUniforms.uOpacity.value = 0.15 + golden * 0.6;
    this.villageUniforms.uTime.value = time;
    this.villageUniforms.uOpacity.value = s.glow;

    this.renderer.toneMappingExposure = 0.25 + 0.75 * intro;
    if (this.bloomPass) this.bloomPass.strength = s.bloom;
    this.finishPass.uniforms.uTime.value = time;
    this.finishPass.uniforms.uVelocity.value = this.reduced ? 0 : this.velocity;

    this.composer.render(dt);
    this.govern(dt);
  }

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
      this.moteUniforms.uPixelRatio.value = this.pixelRatio;
      this.villageUniforms.uPixelRatio.value = this.pixelRatio;
      this.resize(this.width, this.height);
    } else if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.enabled = false;
      this.scene.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((m) => (m.needsUpdate = true));
      });
    } else if (this.bloomPass?.enabled) {
      this.bloomPass.enabled = false;
    }
  }

  dispose() {
    const seen = new Set<unknown>();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = mesh.material as THREE.Material | THREE.Material[] | undefined;
      for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
        if (seen.has(m)) continue;
        seen.add(m);
        const std = m as THREE.MeshStandardMaterial;
        std.map?.dispose();
        std.emissiveMap?.dispose();
        m.dispose();
      }
    });
    this.composer.passes.forEach((pass) => pass.dispose());
    this.composer.dispose();
    this.renderer.dispose();
  }
}
