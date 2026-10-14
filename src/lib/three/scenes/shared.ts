// Flame primitives shared by the campfire and flame scenes, extracted verbatim from the
// DC file (there stashed on window.__DC_* to bridge a build-order dependency).

import type * as THREE from 'three';

const NOISE_GLSL = `
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

const FLAME_VERT =
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

const FLAME_FRAG = `
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

/** One flame layer: a noise-displaced additive cone. Returns the mesh so the caller can drive `mat.uniforms.uTime`. */
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

/** 2D canvas factory for CanvasTextures. */
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

// --- night-world primitives shared by the campfire and the axelog hilltop vignette ---

export type TimeOfDay = 'night' | 'dawn' | 'dusk';

/** Time-of-day palette (DC L1415 hour buckets) — fog, sky, light levels, ambient. */
export function todPalette(hr: number) {
	const tod: TimeOfDay = hr >= 20 || hr < 6 ? 'night' : hr < 12 ? 'dawn' : 'dusk';
	const p = {
		night: { bg: 0x05060a, fog: 0x0b0a0e, fd: 0.115, sky: 0x1c2a44, hemi: 0.26, moon: 0.42, fire: 1.0, ff: 1.0, amb: [0.15, 0.19, 0.27], hor: 0x232a3c, zen: 0x05070d },
		dawn: { bg: 0x2a2233, fog: 0x2e2436, fd: 0.095, sky: 0x8a6a72, hemi: 0.65, moon: 0.2, fire: 0.6, ff: 0.25, amb: [0.34, 0.28, 0.33], hor: 0x7a5e6a, zen: 0x231c2e },
		dusk: { bg: 0x33222a, fog: 0x3a262c, fd: 0.095, sky: 0xc8784a, hemi: 0.6, moon: 0.15, fire: 0.8, ff: 0.55, amb: [0.4, 0.29, 0.27], hor: 0x80463a, zen: 0x22161f }
	}[tod];
	return { tod, p };
}

/**
 * One wind field: steady breeze + travelling gust fronts along DIR. GLSL and JS evaluate the
 * same math. The gust schedule is a pure function of the accumulated clock, seeded by `rand`
 * (it draws 144 values), so two scenes seeded alike gust in step.
 */
export function mkWind(T: typeof THREE, rand: () => number) {
	const DIR = [0.97, 0.243];
	const uni = {
		uWindDir: { value: new T.Vector2(DIR[0], DIR[1]) },
		uWindBase: { value: 1 },
		uGustPos: { value: -50 },
		uGustAmp: { value: 0 }
	};
	const GLSL = `
              uniform vec2 uWindDir;
              uniform float uWindBase;
              uniform float uGustPos;
              uniform float uGustAmp;
              // signed distance past the front: short leading edge, long trailing tail
              float gustAt(vec2 xz, float lag) {
                float x = dot(xz, uWindDir) - (uGustPos - lag);
                return uGustAmp * (x > 0.0 ? exp(-x * x * 1.2) : exp(-x * x * 0.12));
              }
              float breezeAt(vec2 xz, float t) {
                return uWindBase * (0.65 + 0.35 * sin(t * 0.37 + dot(xz, uWindDir) * 0.45));
              }`;
	const gustAt = function (x: number, z: number, lag: number) {
		const d = x * DIR[0] + z * DIR[1] - (uni.uGustPos.value - lag);
		return uni.uGustAmp.value * (d > 0 ? Math.exp(-d * d * 1.2) : Math.exp(-d * d * 0.12));
	};
	const breezeAt = function (x: number, z: number, t: number) {
		return uni.uWindBase.value * (0.65 + 0.35 * Math.sin(t * 0.37 + (x * DIR[0] + z * DIR[1]) * 0.45));
	};
	// gust schedule: seeded gaps of 8-20s, cycled
	const GUSTS: { t0: number; amp: number; v: number }[] = [];
	let gustPeriod = 0;
	for (let i = 0; i < 48; i++) {
		gustPeriod += 8 + rand() * 12;
		GUSTS.push({ t0: gustPeriod, amp: 0.6 + rand() * 0.4, v: 3 + rand() * 1.2 });
	}
	gustPeriod += 10;
	const GUST_SPAN = 22; // the front runs from s=-11 to s=+11 along DIR
	const update = function (t: number) {
		const c = t % gustPeriod;
		let g = null;
		for (let i = GUSTS.length - 1; i >= 0; i--)
			if (GUSTS[i].t0 <= c) {
				g = GUSTS[i];
				break;
			}
		const el = g ? c - g.t0 : 1e9;
		const dur = g ? GUST_SPAN / g.v : 0;
		if (g && el < dur) {
			uni.uGustPos.value = -GUST_SPAN / 2 + g.v * el;
			uni.uGustAmp.value = g.amp * Math.pow(Math.sin((Math.PI * el) / dur), 0.5);
		} else {
			uni.uGustAmp.value = 0;
			uni.uGustPos.value = -50;
		}
	};
	return { DIR, uni, GLSL, gustAt, breezeAt, update };
}

const h1 = function (i: number) {
	const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
	return v - Math.floor(v);
};
const vn1 = function (x: number) {
	const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
	return h1(i) * (1 - u) + h1(i + 1) * u;
};
/** The campfire's one flicker signal (value noise of the clock); a pure function of `t`. */
export function flickAt(t: number, gustFire: number) {
	return 0.82 + (vn1(t * 6.1) - 0.5) * 0.22 + (vn1(t * 11.3 + 17) - 0.5) * 0.14 + Math.sin(t * 5.3) * 0.03 + gustFire * 0.1;
}

// --- shader + texture pieces shared by the campfire and the hilltop vignette ---

/** Value noise (h21 hash, vn smooth 2D noise) for the ground, rock and trail shaders. */
export const NOISE2_GLSL = `
              float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
              float vn(vec2 p) {
                vec2 i = floor(p), f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
              }`;

/** The grass's squared-exponential fog curve; needs `uniform vec3 uFogC` declared before it. */
export const FOG_GLSL = `
              vec3 fogMix(vec3 c, vec3 w, float k) {
                float camD = distance(w, cameraPosition);
                return mix(c, uFogC, clamp(1.0 - exp(-pow(camD * k, 2.0)), 0.0, 1.0));
              }`;

/** Alpha card of nine grass blades (draws 36 values from `rand`, in a fixed order). */
export function mkBladeAlpha(T: typeof THREE, rand: () => number): THREE.CanvasTexture {
	return new T.CanvasTexture(
		mkCanvas(128, 128, function (g, w, h) {
			g.clearRect(0, 0, w, h);
			g.fillStyle = '#ffffff';
			for (let i = 0; i < 9; i++) {
				const x0 = 10 + rand() * (w - 20);
				const tipX = x0 + (rand() - 0.5) * 36;
				const wb = 5 + rand() * 4;
				g.beginPath();
				g.moveTo(x0 - wb / 2, h);
				g.quadraticCurveTo(x0 - wb / 2, h * 0.45, tipX, 6 + rand() * 26);
				g.quadraticCurveTo(x0 + wb / 2, h * 0.45, x0 + wb / 2, h);
				g.closePath();
				g.fill();
			}
		})
	);
}
