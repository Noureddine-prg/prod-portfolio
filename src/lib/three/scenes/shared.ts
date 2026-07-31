// Shared scene primitives — extracted VERBATIM from the DC file so the campfire and flame
// scene teammates are fully independent (the DC stashed these on window.__DC_* to bridge a
// build-order dependency; here they are plain exports, no window globals).
//
// Contents (and nothing else — mkTree/mkTier/mkTree2 etc. are per-scene, not shared):
//   NOISE_GLSL  — simplex noise (DC L1731-1774)
//   FLAME_VERT  — noise-displaced flame vertex shader (DC L1776-1795)
//   FLAME_FRAG  — flame fragment shader (DC L1796-1806)
//   mkFlame     — flame layer factory (campfire L1808-1816 ≡ flame L2825-2833)
//   mkCanvas    — 2D canvas-texture helper (DC L1433)

import type * as THREE from 'three';

export const NOISE_GLSL = `
            vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
            vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
            vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
            vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314*r;}
            float snoise(vec3 v){
              const vec2 C = vec2(1.0/6.0, 1.0/3.0);
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
              vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
              float n_ = 0.142857142857;
              vec3 ns = n_ * D.wyz - D.xzx;
              vec4 j = p - 49.0*floor(p*ns.z*ns.z);
              vec4 x_ = floor(j*ns.z);
              vec4 y_ = floor(j - 7.0*x_);
              vec4 x = x_*ns.x + ns.yyyy;
              vec4 y = y_*ns.x + ns.yyyy;
              vec4 h = 1.0 - abs(x) - abs(y);
              vec4 b0 = vec4(x.xy, y.xy);
              vec4 b1 = vec4(x.zw, y.zw);
              vec4 s0 = floor(b0)*2.0 + 1.0;
              vec4 s1 = floor(b1)*2.0 + 1.0;
              vec4 sh = -step(h, vec4(0.0));
              vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
              vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
              vec3 p0 = vec3(a0.xy, h.x);
              vec3 p1 = vec3(a0.zw, h.y);
              vec3 p2 = vec3(a1.xy, h.z);
              vec3 p3 = vec3(a1.zw, h.w);
              vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
              p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
              vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
              m = m*m;
              return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }`;

export const FLAME_VERT =
	NOISE_GLSL +
	`
            uniform float uTime;
            uniform float uH;
            uniform float uSway;
            varying float vH;
            varying float vN;
            void main(){
              vec3 p = position;
              float h = (p.y + uH*0.5) / uH;
              float sway = pow(h, 1.35);
              float n1 = snoise(vec3(p.x*1.7, p.y*2.1 - uTime*2.8, p.z*1.7));
              float n2 = snoise(vec3(p.x*3.6 + 7.0, p.y*4.4 - uTime*4.6, p.z*3.6));
              float n3 = snoise(vec3(p.x*1.7 + 3.0, p.y*2.1 - uTime*2.4, p.z*1.7));
              p.x += (n1*0.3 + n2*0.08) * uSway * sway;
              p.z += (n3*0.3 + n2*0.05) * uSway * sway;
              p.xz *= 1.0 + n1*0.28*sway;
              p.y += n2*0.1*sway;
              vH = h; vN = n2;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            }`;

export const FLAME_FRAG = `
            uniform float uOpacity;
            varying float vH;
            varying float vN;
            void main(){
              float hn = clamp(vH + vN*0.18, 0.0, 1.2);
              vec3 col = mix(vec3(1.0, 0.97, 0.78), vec3(1.0, 0.58, 0.13), smoothstep(0.05, 0.5, hn));
              col = mix(col, vec3(0.82, 0.22, 0.03), smoothstep(0.5, 0.95, hn));
              float a = (1.0 - smoothstep(0.45, 1.0, hn)) * smoothstep(0.0, 0.1, vH) * uOpacity;
              gl_FragColor = vec4(col * a, a);
            }`;

/**
 * One flame layer: a noise-displaced additive cone. Verbatim from DC L1808-1816 (campfire)
 * / L2825-2833 (flame) — parameterized on `T` and `parent` instead of closing over `spin`.
 * Returns the mesh so the caller can drive `mat.uniforms.uTime`.
 */
export function mkFlame(
	T: typeof THREE,
	parent: THREE.Object3D,
	r: number,
	hgt: number,
	sway: number,
	y: number
): THREE.Mesh {
	const mat = new T.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
			uH: { value: hgt },
			uSway: { value: sway },
			uOpacity: { value: 0.9 }
		},
		vertexShader: FLAME_VERT,
		fragmentShader: FLAME_FRAG,
		transparent: true,
		depthWrite: false,
		blending: T.AdditiveBlending,
		side: T.DoubleSide
	});
	const m = new T.Mesh(new T.ConeGeometry(r, hgt, 26, 30, true), mat);
	m.position.y = y;
	parent.add(m);
	return m;
}

/** 2D canvas factory for CanvasTextures (DC L1433). */
export function mkCanvas(
	w: number,
	h: number,
	draw: (g: CanvasRenderingContext2D, w: number, h: number) => void
): HTMLCanvasElement {
	const cn = document.createElement('canvas');
	cn.width = w;
	cn.height = h;
	draw(cn.getContext('2d') as CanvasRenderingContext2D, w, h);
	return cn;
}
