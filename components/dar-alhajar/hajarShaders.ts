// Sky dome: time-of-day gradient, sun disc and halo by day, stars and moon by night.
export const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const skyFragment = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uMoonDir;
uniform float uNight;
uniform float uTime;

varying vec3 vDir;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.5));
  col = mix(col, uGround, smoothstep(0.0, -0.2, h));

  float s = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * (pow(s, 1400.0) * 40.0 + pow(s, 22.0) * 0.5 + pow(s, 4.0) * 0.12) * (1.0 - uNight);

  float m = max(dot(d, normalize(uMoonDir)), 0.0);
  col += vec3(1.0, 0.96, 0.88) * (smoothstep(0.99955, 0.9997, m) * 4.0 + pow(m, 260.0) * 0.25) * uNight;

  vec3 cell = floor(d * 1100.0);
  float st = hash(cell);
  float star = step(0.9975, st) * smoothstep(0.03, 0.3, h);
  float twinkle = 0.55 + 0.45 * sin(uTime * 1.7 + st * 90.0);
  col += vec3(0.88, 0.92, 1.0) * star * twinkle * uNight * 2.2;

  gl_FragColor = vec4(col, 1.0);
}
`;

// Floating motes of dust in the light (and, re-coloured, the village lights).
export const moteVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform float uDrift;
attribute float aRand;
varying float vRand;
varying float vFade;
void main() {
  vec3 p = position;
  p += vec3(
    sin(uTime * 0.21 + aRand * 20.0) * 1.6,
    sin(uTime * 0.13 + aRand * 9.0) * 1.1,
    cos(uTime * 0.17 + aRand * 13.0) * 1.6
  ) * uDrift;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.7 + aRand * 2.0) + aRand * 50.0);
  gl_PointSize = uSize * uPixelRatio * (0.4 + aRand * 0.8) * twinkle / -mv.z;
  vRand = aRand;
  vFade = smoothstep(1.0, 6.0, -mv.z);
}
`;

export const moteFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vRand;
varying float vFade;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = pow(smoothstep(0.5, 0.0, d), 2.0);
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor * (0.7 + 0.6 * vRand), a * uOpacity * vFade);
}
`;
