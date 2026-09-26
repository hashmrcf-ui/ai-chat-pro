import { simplexNoise } from '../showcase/shaders';

// Coffee surface seen from above: dark body, a slowly swirling crema and a
// brighter meniscus where the liquid meets the paper wall.
export const coffeeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const coffeeFragment = /* glsl */ `
uniform float uTime;
uniform float uCrema;
varying vec2 vUv;
${simplexNoise}
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float a = atan(p.y, p.x);
  float swirl = snoise(vec3(cos(a + r * 2.2 + uTime * 0.12) * r * 2.4, sin(a + r * 2.2 + uTime * 0.12) * r * 2.4, uTime * 0.05));
  float fine = snoise(vec3(p * 38.0, uTime * 0.1));
  vec3 body = vec3(0.045, 0.022, 0.012);
  vec3 crema = mix(vec3(0.42, 0.24, 0.11), vec3(0.62, 0.40, 0.2), swirl * 0.5 + 0.5);
  crema *= 0.85 + fine * 0.15;
  float cremaMask = uCrema * smoothstep(1.02, 0.2, r);
  vec3 col = mix(body, crema, cremaMask);
  col += vec3(0.25, 0.16, 0.09) * smoothstep(0.86, 0.99, r) * 0.6;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Soft, rising steam: two crossed billboards of drifting noise.
export const steamVertex = coffeeVertex;
export const steamFragment = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uSeed;
varying vec2 vUv;
${simplexNoise}
void main() {
  vec2 uv = vUv;
  float sway = snoise(vec3(uv.y * 2.0 - uTime * 0.35, uSeed, 0.0)) * 0.12 * uv.y;
  uv.x += sway;
  float n = snoise(vec3(uv.x * 3.0, uv.y * 2.4 - uTime * 0.55, uSeed + uTime * 0.05)) * 0.5 + 0.5;
  float column = smoothstep(0.5, 0.0, abs(uv.x - 0.5)) ;
  float fade = smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.45, uv.y);
  float a = pow(n, 2.2) * column * fade * uOpacity;
  gl_FragColor = vec4(vec3(0.92), a * 0.35);
}
`;

// Floor: near-black, a pool of light under the cup, a soft contact shadow,
// and partial transparency so the mirrored cup reads as a faint reflection.
export const floorVertex = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const floorFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uGlow;
uniform float uReflect;
varying vec3 vWorld;
void main() {
  float d = length(vWorld.xz);
  vec3 col = uColor + uGlow * smoothstep(3.2, 0.0, d) * 0.55;
  float shadow = smoothstep(0.75, 0.2, d);
  col *= 1.0 - shadow * 0.65;
  float alpha = mix(1.0 - uReflect, 1.0, smoothstep(0.4, 2.4, d));
  gl_FragColor = vec4(col, alpha);
}
`;
