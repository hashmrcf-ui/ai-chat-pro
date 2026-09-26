// GLSL for the Maison Lumen showcase.
// Every shape the viewer sees is procedural: no textures or models to download.

// 3D simplex noise — Ian McEwan / Ashima Arts (MIT).
export const simplexNoise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

// Particles morph between four formations (A → B → C → D) as uMorph goes 0 → 3.
// Each particle starts its move at a slightly different moment (aRand), so the
// swarm flows like a school of fish instead of snapping in lockstep.
export const particleVertex = /* glsl */ `
uniform float uTime;
uniform float uMorph;
uniform float uPixelRatio;
uniform float uSize;
uniform float uTurbulence;
uniform float uIntro;

attribute vec3 aPosB;
attribute vec3 aPosC;
attribute vec3 aPosD;
attribute float aRand;

varying float vRand;
varying float vAlpha;

${simplexNoise}

vec3 rotateY(vec3 p, float a) {
  float c = cos(a), s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

float staggered(float t) {
  return smoothstep(0.0, 1.0, clamp((t - aRand * 0.4) / 0.6, 0.0, 1.0));
}

void main() {
  float m = clamp(uMorph, 0.0, 3.0);
  vec3 p = mix(position, aPosB, staggered(clamp(m, 0.0, 1.0)));
  p = mix(p, aPosC, staggered(clamp(m - 1.0, 0.0, 1.0)));
  p = mix(p, aPosD, staggered(clamp(m - 2.0, 0.0, 1.0)));

  // Turbulence peaks mid-transition and when the visitor scrolls fast.
  float energy = sin(3.14159265 * fract(m));
  float amp = 0.07 + energy * 0.65 + uTurbulence;
  vec3 q = p * 0.35;
  float t = uTime * 0.08;
  p += vec3(
    snoise(q + vec3(t, 0.0, aRand * 10.0)),
    snoise(q + vec3(13.1, t, 0.0)),
    snoise(q + vec3(0.0, 7.7, t))
  ) * amp;

  p = rotateY(p, uTime * (0.025 + aRand * 0.035));
  p *= mix(2.4, 1.0, uIntro);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float twinkle = 0.6 + 0.4 * sin(uTime * (0.8 + aRand * 2.6) + aRand * 40.0);
  gl_PointSize = uSize * uPixelRatio * (0.3 + aRand * 0.9) * twinkle / -mv.z;

  vRand = aRand;
  // Fade out right in front of the lens and far away, so nothing pops.
  vAlpha = uIntro * smoothstep(0.6, 2.4, -mv.z) * smoothstep(38.0, 12.0, -mv.z);
}
`;

export const particleFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;

varying float vRand;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = pow(smoothstep(0.5, 0.0, d), 2.2);
  if (a < 0.01) discard;
  vec3 col = mix(uColorA, uColorB, vRand);
  gl_FragColor = vec4(col * (0.55 + 0.9 * a), a * vAlpha * uOpacity);
}
`;

// A slow, dark "studio sky". It is opaque on purpose: the transmissive gem only
// refracts opaque geometry, so this is what gives the stone its inner fire.
export const backdropVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const backdropFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uBase;
uniform vec3 uGlowA;
uniform vec3 uGlowB;

varying vec3 vDir;

${simplexNoise}

void main() {
  vec3 d = normalize(vDir);
  float n1 = snoise(d * 1.4 + vec3(0.0, uTime * 0.03, 0.0)) * 0.5 + 0.5;
  float n2 = snoise(d * 2.3 + vec3(uTime * 0.02, 0.0, 4.0)) * 0.5 + 0.5;
  float horizon = 1.0 - abs(d.y);
  vec3 col = uBase;
  col += uGlowA * pow(n1, 3.0) * 0.6 * horizon;
  col += uGlowB * pow(n2, 4.0) * 0.4;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Final "lens" pass: chromatic aberration that grows with scroll speed,
// a faint barrel distortion, vignette and animated film grain.
export const finishVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const finishFragment = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uVelocity;
uniform float uGrain;
uniform vec2 uResolution;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 c = vUv - 0.5;
  float r2 = dot(c, c);
  vec2 uv = 0.5 + c * (1.0 - 0.035 * r2);

  vec2 shift = c * (0.0012 + uVelocity * 0.011);
  vec3 col;
  col.r = texture2D(tDiffuse, uv + shift).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - shift).b;

  float vignette = smoothstep(0.95, 0.2, length(c * vec2(1.0, 1.15)));
  col *= mix(0.55, 1.0, vignette);

  float g = hash(floor(vUv * uResolution) + fract(uTime) * 91.7);
  col += (g - 0.5) * uGrain;

  gl_FragColor = vec4(col, 1.0);
}
`;
