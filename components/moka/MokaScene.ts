import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { finishFragment, finishVertex } from '../showcase/shaders';
import type { Tier } from '../showcase/LumenScene';
import { coffeeFragment, coffeeVertex, floorFragment, floorVertex, steamFragment, steamVertex } from './mokaShaders';

// Everything the loader and the scroll timeline animate. The render loop eases toward it.
export interface MokaState {
  camX: number;
  camY: number;
  camZ: number;
  tgtX: number;
  tgtY: number;
  tgtZ: number;
  side: number; // slides the frame so the cup sits opposite the copy (+ = cup on the left)
  fill: number; // coffee level 0 → 1
  crema: number;
  lid: number; // 0 = lifted out of frame, 1 = pressed on
  steam: number;
  spin: number; // idle turntable speed (rad/s)
  bloom: number;
  exposure: number;
}

const TIERS: Record<Tier, { maxDpr: number; msaa: number; segments: number; bloom: boolean }> = {
  high: { maxDpr: 2, msaa: 4, segments: 352, bloom: true },
  mid: { maxDpr: 1.5, msaa: 0, segments: 264, bloom: true },
  low: { maxDpr: 1, msaa: 0, segments: 264, bloom: false },
};

// Placeholder 12 oz ripple cup (1 unit ≈ 10 cm). Swapped for the Blender model later.
const CUP = { height: 1.1, top: 0.45, bottom: 0.3, flutes: 44, flute: 0.013 };

function studioEnvironment() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: '#050505', side: THREE.BackSide })));
  const box = (w: number, h: number, intensity: number, pos: [number, number, number], color = '#ffffff') => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0.6, 0);
    env.add(m);
  };
  box(10, 3, 3.2, [0, 9, 1]); // overhead softbox
  box(1.2, 10, 6, [-7, 1, 2]); // left strip: draws a crisp highlight down every flute
  box(1.2, 10, 4.5, [7, 1, 1], '#fff4e6'); // right strip, warm
  box(8, 2, 1.4, [0, 2, -9], '#cfd6ff'); // cool rim from behind
  box(10, 4, 0.35, [0, 1, 10]); // faint fill from the viewer
  return env;
}

export interface PrintFonts { arabic: string; latin: string }
const DEFAULT_FONTS: PrintFonts = { arabic: "'Reem Kufi', sans-serif", latin: "'Inter', sans-serif" };

function drawPrint(c: HTMLCanvasElement, fonts: PrintFonts = DEFAULT_FONTS) {
  const W = 2048;
  const H = 900;
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0e0e0e';
  g.fillRect(0, 0, W, H);
  // Paper fibre.
  for (let i = 0; i < 26000; i++) {
    g.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.25)';
    g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 3, 1);
  }
  const vertical = (text: string, x: number, font: string) => {
    g.save();
    g.translate(x, H / 2);
    g.rotate(-Math.PI / 2);
    g.font = font;
    g.fillStyle = '#f4f4f2';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 0, 0);
    g.restore();
  };
  // Front (u = 0.5 faces the viewer): the Arabic wordmark, as on the real cups.
  g.direction = 'rtl';
  vertical('موكا', W / 2, `700 215px ${fonts.arabic}`);
  // Back, across the seam: the Latin wordmark.
  g.direction = 'ltr';
  vertical('MOKA', 0, `800 190px ${fonts.latin}`);
  vertical('MOKA', W, `800 190px ${fonts.latin}`);
}

function lidGeometry() {
  const pts = [
    [0.455, -0.04], [0.468, -0.005], [0.474, 0.022], [0.466, 0.046], [0.44, 0.056],
    [0.418, 0.036], [0.4, 0.032], [0.386, 0.085], [0.33, 0.118], [0.18, 0.126], [0.0001, 0.127],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 128);
}

export class MokaScene {
  readonly state: MokaState = {
    camX: 0, camY: 3.3, camZ: 0.75, tgtX: 0, tgtY: 0.35, tgtZ: 0, side: 0,
    fill: 0, crema: 0, lid: 0, steam: 0, spin: 0.15, bloom: 0.25, exposure: 1,
  };

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass | null = null;
  private finishPass: ShaderPass;
  private envTexture: THREE.Texture;

  private cup = new THREE.Group();
  private printCanvas = document.createElement('canvas');
  private print: THREE.CanvasTexture;
  private reflection: THREE.Group;
  private lid: THREE.Group;
  private reflectionLid: THREE.Object3D;
  private coffee: THREE.Mesh;
  private reflectionCoffee: THREE.Object3D;
  private coffeeUniforms: Record<string, THREE.IUniform>;
  private steams: Array<{ mesh: THREE.Mesh; uniforms: Record<string, THREE.IUniform> }> = [];

  private settings: (typeof TIERS)[Tier];
  private reduced: boolean;
  private pixelRatio: number;
  private yaw = 0;
  private yawVelocity = 0;
  private pointer = new THREE.Vector2();
  private pointerSmooth = new THREE.Vector2();
  private velocity = 0;
  private velocityTarget = 0;
  private lookAt = new THREE.Vector3(0, 0.35, 0);
  private camGoal = new THREE.Vector3();
  private tgtGoal = new THREE.Vector3();
  private layout = { offset: 1, distance: 1, lift: 0 };
  private width = 1;
  private height = 1;
  private frameEma = 1 / 60;
  private slowFrames = 0;
  private cooldown = 90;

  constructor(canvas: HTMLCanvasElement, opts: { tier: Tier; reducedMotion: boolean }) {
    this.settings = { ...TIERS[opts.tier] };
    this.reduced = opts.reducedMotion;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.settings.maxDpr);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor('#080808', 1);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
    this.camera.position.set(this.state.camX, this.state.camY, this.state.camZ);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const studio = studioEnvironment();
    this.envTexture = pmrem.fromScene(studio, 0.03).texture;
    studio.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    });
    pmrem.dispose();
    this.scene.environment = this.envTexture;
    // Set after PMREM, which leaves its own clear colour behind.
    this.renderer.setClearColor('#080808', 1);
    this.scene.background = new THREE.Color('#080808');

    const key = new THREE.DirectionalLight('#ffffff', 2.6);
    key.position.set(-3, 5, 3);
    const rim = new THREE.DirectionalLight('#dfe4ff', 2.0);
    rim.position.set(2, 3, -4);
    this.scene.add(key, rim);

    // ---------- the cup ----------
    const wallGeo = new THREE.CylinderGeometry(CUP.top, CUP.bottom, CUP.height, this.settings.segments, 1, true, Math.PI);
    wallGeo.translate(0, CUP.height / 2, 0);
    const pos = wallGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      const theta = Math.atan2(x, z);
      // Flutes fade out under the rolled rim and at the base, like the real wrap.
      const y = pos.getY(i);
      const band = THREE.MathUtils.smoothstep(y, 0, 0.05) * (1 - THREE.MathUtils.smoothstep(y, CUP.height - 0.07, CUP.height - 0.01));
      const flute = CUP.flute * band * (r / CUP.top) * (0.5 + 0.5 * Math.cos(theta * CUP.flutes));
      const k = (r + flute) / r;
      pos.setX(i, x * k);
      pos.setZ(i, z * k);
    }
    wallGeo.computeVertexNormals();
    drawPrint(this.printCanvas);
    this.print = new THREE.CanvasTexture(this.printCanvas);
    this.print.colorSpace = THREE.SRGBColorSpace;
    this.print.anisotropy = 8;
    const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ map: this.print, roughness: 0.72, metalness: 0, envMapIntensity: 1.1 }));

    const paper = new THREE.MeshStandardMaterial({ color: '#ece7de', roughness: 0.85 });
    const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(CUP.top + 0.004, 0.013, 14, 160), paper);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = CUP.height;
    const innerGeo = new THREE.CylinderGeometry(CUP.top - 0.012, CUP.bottom - 0.012, CUP.height - 0.02, 96, 1, true);
    innerGeo.translate(0, CUP.height / 2 + 0.01, 0);
    const inner = new THREE.Mesh(innerGeo, new THREE.MeshStandardMaterial({ color: '#e7e1d6', roughness: 0.9, side: THREE.BackSide }));
    const base = new THREE.Mesh(new THREE.CircleGeometry(CUP.bottom - 0.012, 64), paper);
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.02;

    this.coffeeUniforms = { uTime: { value: 0 }, uCrema: { value: 0 } };
    this.coffee = new THREE.Mesh(
      new THREE.CircleGeometry(1, 96),
      new THREE.ShaderMaterial({ vertexShader: coffeeVertex, fragmentShader: coffeeFragment, uniforms: this.coffeeUniforms }),
    );
    this.coffee.rotation.x = -Math.PI / 2;

    this.lid = new THREE.Group();
    const lidMat = new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.32, metalness: 0, envMapIntensity: 1.4, side: THREE.DoubleSide });
    this.lid.add(new THREE.Mesh(lidGeometry(), lidMat));
    const sip = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: '#000000' }));
    sip.scale.set(0.07, 0.026, 1);
    sip.rotation.x = -Math.PI / 2 + 0.35;
    sip.position.set(0, 0.114, 0.335);
    this.lid.add(sip);

    this.cup.add(wall, rimMesh, inner, base, this.coffee, this.lid);
    this.scene.add(this.cup);

    // Mirrored twin under a semi-transparent floor = a soft floor reflection.
    this.reflection = this.cup.clone(true);
    this.reflection.scale.y = -1;
    this.reflectionLid = this.reflection.children[5];
    this.reflectionCoffee = this.reflection.children[4];
    this.scene.add(this.reflection);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.ShaderMaterial({
        vertexShader: floorVertex,
        fragmentShader: floorFragment,
        uniforms: { uColor: { value: new THREE.Color('#080808') }, uGlow: { value: new THREE.Color('#2b2d3a') }, uReflect: { value: 0.3 } },
        transparent: true,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Steam from the sip hole.
    for (let i = 0; i < 2; i++) {
      const uniforms = { uTime: { value: 0 }, uOpacity: { value: 0 }, uSeed: { value: i * 7.3 } };
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 1.3),
        new THREE.ShaderMaterial({ vertexShader: steamVertex, fragmentShader: steamFragment, uniforms, transparent: true, depthWrite: false }),
      );
      mesh.geometry.translate(0, 0.65, 0);
      this.scene.add(mesh);
      this.steams.push({ mesh, uniforms });
    }

    // ---------- post ----------
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: this.settings.msaa });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (this.settings.bloom) {
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.25, 0.5, 0.92);
      this.composer.addPass(this.bloomPass);
    }
    this.composer.addPass(new OutputPass());
    this.finishPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null }, uTime: { value: 0 }, uVelocity: { value: 0 },
        uGrain: { value: this.reduced ? 0.02 : 0.035 }, uResolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: finishVertex,
      fragmentShader: finishFragment,
    });
    this.composer.addPass(this.finishPass);
  }

  /** Repaint the wordmarks once the web fonts have arrived. */
  refreshPrint(fonts?: PrintFonts) {
    drawPrint(this.printCanvas, fonts);
    this.print.needsUpdate = true;
  }

  async warmUp() {
    await this.renderer.compileAsync(this.scene, this.camera);
    this.composer.render(0);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.layout.offset = aspect < 1 ? 0 : aspect < 1.3 ? 0.55 : 1;
    this.layout.distance = aspect < 1 ? 1.7 : aspect < 1.3 ? 1.2 : 1;
    this.layout.lift = aspect < 1 ? -0.35 : 0;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.finishPass.uniforms.uResolution.value.set(width * this.pixelRatio, height * this.pixelRatio);
  }

  setPointer(x: number, y: number) {
    this.pointer.set(x, y);
  }

  /** Horizontal drag in pixels; feeds the cup's angular momentum. */
  drag(dx: number) {
    this.yawVelocity += dx * 0.012;
    this.yawVelocity = THREE.MathUtils.clamp(this.yawVelocity, -14, 14);
  }

  setScrollVelocity(v: number) {
    this.velocityTarget = Math.min(1, Math.abs(v) / 45);
  }

  tick(time: number, dt: number) {
    const s = this.state;
    dt = Math.min(dt, 0.1);
    const ease = 1 - Math.exp(-dt * (this.reduced ? 6 : 3));
    const parallax = this.reduced ? 0 : 1;

    this.velocityTarget *= Math.exp(-dt * 4);
    this.velocity += (this.velocityTarget - this.velocity) * (1 - Math.exp(-dt * 6));
    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-dt * 3));

    // Camera.
    this.camGoal.set(
      s.camX * this.layout.distance + this.pointerSmooth.x * 0.12 * parallax,
      s.camY + this.pointerSmooth.y * 0.08 * parallax,
      s.camZ * this.layout.distance,
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

    // Cup: idle turntable + momentum from dragging, with friction.
    this.yawVelocity *= Math.exp(-dt * 2.2);
    this.yaw += (s.spin * (this.reduced ? 0 : 1) + this.yawVelocity) * dt;
    this.cup.rotation.y = this.yaw;
    this.cup.rotation.z = -this.pointerSmooth.x * 0.04 * parallax;
    this.cup.rotation.x = this.pointerSmooth.y * 0.03 * parallax;

    // Coffee level and crema.
    const level = 0.03 + THREE.MathUtils.clamp(s.fill, 0, 1) * 0.93;
    const y = level * CUP.height;
    const r = THREE.MathUtils.lerp(CUP.bottom, CUP.top, y / CUP.height) - 0.014;
    this.coffee.visible = s.fill > 0.002;
    this.coffee.position.y = y;
    this.coffee.scale.setScalar(r);
    this.coffeeUniforms.uTime.value = time;
    this.coffeeUniforms.uCrema.value = s.crema;

    // Lid drops in from above and seats with a small settle.
    const lid = THREE.MathUtils.clamp(s.lid, 0, 1);
    this.lid.position.y = CUP.height + (1 - lid) * 1.8;
    this.lid.rotation.x = (1 - lid) * 0.35;
    this.lid.visible = lid > 0.001;

    // Keep the reflection in sync.
    this.reflection.rotation.copy(this.cup.rotation);
    this.reflection.rotation.x *= -1;
    this.reflectionLid.position.copy(this.lid.position);
    this.reflectionLid.rotation.copy(this.lid.rotation);
    this.reflectionLid.visible = this.lid.visible;
    this.reflectionCoffee.position.copy(this.coffee.position);
    this.reflectionCoffee.scale.copy(this.coffee.scale);
    this.reflectionCoffee.visible = false;

    // Steam rises from the sip hole, which turns with the cup.
    const sx = Math.sin(this.yaw) * 0.335;
    const sz = Math.cos(this.yaw) * 0.335;
    this.steams.forEach(({ mesh, uniforms }, i) => {
      mesh.position.set(sx, CUP.height + 0.12, sz);
      mesh.rotation.y = Math.atan2(this.camera.position.x - sx, this.camera.position.z - sz) + i * 0.9;
      uniforms.uTime.value = time;
      uniforms.uOpacity.value = s.steam * lid;
    });

    this.renderer.toneMappingExposure = s.exposure;
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
      this.resize(this.width, this.height);
    } else if (this.bloomPass?.enabled) {
      this.bloomPass.enabled = false;
    }
  }

  dispose() {
    const seen = new Set<unknown>();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry && !seen.has(mesh.geometry)) {
        seen.add(mesh.geometry);
        mesh.geometry.dispose();
      }
      const mats = mesh.material as THREE.Material | THREE.Material[] | undefined;
      for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
        if (seen.has(m)) continue;
        seen.add(m);
        (m as THREE.MeshStandardMaterial).map?.dispose();
        m.dispose();
      }
    });
    this.envTexture.dispose();
    this.composer.passes.forEach((p) => p.dispose());
    this.composer.dispose();
    this.renderer.dispose();
  }
}
