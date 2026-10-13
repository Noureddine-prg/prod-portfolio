// Campfire hero scene — DC `kind === 'campfire'` ported onto the SceneCtx contract; trees, ground and
// rocks reworked (owner-approved) into the grass's language: alpha cards / shader-lit, fogged alike.
// mkFlame/mkCanvas come from ./shared; randomness goes through ctx.rand (seeded), never Math.random.
//
// Build ORDER is load-bearing: everything added to `spin` before the freeze traverse gets
// matrixAutoUpdate=false (flameA/B re-exempted); sky, mists and leaves are added AFTER and stay auto.
// The sky dome hangs off `scene`, not `spin`, so it never enters the freeze traverse.

import type * as THREE from 'three';
import type { SceneCtx, UpdateFn } from '../types';
import { mkFlame, mkCanvas } from './shared';
import { mulberry32, hashSeed } from '$lib/util/rand';

export function buildCampfire(ctx: SceneCtx): UpdateFn | null {
	const { T, scene, cam, spin, renderer } = ctx;
	const rand = ctx.rand;

	renderer.toneMapping = T.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.1;
	renderer.outputEncoding = T.sRGBEncoding;
	const lite = ctx.variants.lite;
	const hr = ctx.variants.hour; // DC L1415 data-hour / ?hour= / local hour, resolved upstream
	const TOD = hr >= 20 || hr < 6 ? 'night' : hr < 12 ? 'dawn' : 'dusk';
	const todP = {
		night: { bg: 0x05060a, fog: 0x0b0a0e, fd: 0.115, sky: 0x1c2a44, hemi: 0.26, moon: 0.42, fire: 1.0, ff: 1.0, amb: [0.15, 0.19, 0.27], hor: 0x232a3c, zen: 0x05070d },
		dawn: { bg: 0x2a2233, fog: 0x2e2436, fd: 0.095, sky: 0x8a6a72, hemi: 0.65, moon: 0.2, fire: 0.6, ff: 0.25, amb: [0.34, 0.28, 0.33], hor: 0x7a5e6a, zen: 0x231c2e },
		dusk: { bg: 0x33222a, fog: 0x3a262c, fd: 0.095, sky: 0xc8784a, hemi: 0.6, moon: 0.15, fire: 0.8, ff: 0.55, amb: [0.4, 0.29, 0.27], hor: 0x80463a, zen: 0x22161f }
	}[TOD];
	scene.fog = new T.FogExp2(todP.fog, todP.fd);
	scene.background = new T.Color(todP.bg);
	cam.position.set(0, 1.5, 5.8);
	cam.lookAt(lite ? 0.55 : 0, 0.72, 0);
	if (lite) {
		// tighter mobile framing — the fire fills more of the tall hero crop
		cam.zoom = 1.28;
		cam.updateProjectionMatrix();
	}
	// camera is fixed: cull scatter that can never enter the widest crop (+parallax margin)
	const inView = function (x: number, z: number, extra?: number) {
		const dz = z - 5.8;
		if (dz > -0.3) return false;
		return Math.atan2(Math.abs(x), -dz) < 0.84 + (extra || 0);
	};
	// shared shader-lighting inputs (grass, ground, tree cards all read the same ones)
	const FIRE_POS = new T.Vector3(0, 0.7, 0);
	const fogUni = { value: new T.Color(todP.fog) };
	const flickUni = { value: 1 };
	const timeUni = { value: 0 };
	const ambUni = { value: new T.Vector3(todP.amb[0], todP.amb[1], todP.amb[2]) };
	// grass's fog curve, shared by every custom shader in the scene
	const FOG_GLSL = `
              vec3 fogMix(vec3 c, vec3 w, float k) {
                float camD = distance(w, cameraPosition);
                return mix(c, uFogC, clamp(1.0 - exp(-pow(camD * k, 2.0)), 0.0, 1.0));
              }`;
	// concatenate non-indexed copies of same-layout geometries into one (one draw call)
	const mergeGeos = function (list: THREE.BufferGeometry[], names: string[]) {
		const geos = list.map(function (g) {
			return g.index ? g.toNonIndexed() : g;
		});
		let n = 0;
		geos.forEach(function (g) {
			n += g.attributes.position.count;
		});
		const out = new T.BufferGeometry();
		names.forEach(function (nm) {
			const isz = geos[0].attributes[nm].itemSize;
			const arr = new Float32Array(n * isz);
			let o = 0;
			geos.forEach(function (g) {
				const a = g.attributes[nm] as THREE.BufferAttribute;
				arr.set(a.array as Float32Array, o);
				o += a.count * isz;
			});
			out.setAttribute(nm, new T.BufferAttribute(arr, isz));
		});
		return out;
	};
	// non-indexed geometry → averaged normals across coincident vertices (smooth, crack-free)
	const smoothNormals = function (g: THREE.BufferGeometry) {
		g.computeVertexNormals();
		const p = g.attributes.position as THREE.BufferAttribute;
		const nn = g.attributes.normal as THREE.BufferAttribute;
		const acc = new Map<string, number[]>();
		const key = function (i: number) {
			return p.getX(i).toFixed(4) + ',' + p.getY(i).toFixed(4) + ',' + p.getZ(i).toFixed(4);
		};
		for (let i = 0; i < p.count; i++) {
			const k = key(i);
			const a = acc.get(k) || [0, 0, 0];
			a[0] += nn.getX(i);
			a[1] += nn.getY(i);
			a[2] += nn.getZ(i);
			acc.set(k, a);
		}
		for (let i = 0; i < p.count; i++) {
			const a = acc.get(key(i)) as number[];
			const l = Math.hypot(a[0], a[1], a[2]) || 1;
			nn.setXYZ(i, a[0] / l, a[1] / l, a[2] / l);
		}
	};
	// ground contact shadows (x, z, radius) — tree bases, seat logs, boulders; read by the ground shader
	const aoPts: [number, number, number][] = [];

	// quality switches — a device tier can flip any of these off without touching the rest
	const Q = { gusts: true, shadows: true, landingEmbers: true, dither: true, rockDetail: true };
	// second seeded stream for pass-2 additions so ctx.rand (and the grass layout it seeds) is unchanged
	const rand2 = mulberry32(hashSeed('campfire-pass2'));

	// --- one wind field for grass, boughs, shrubs, flames, smoke, embers and leaves ---
	// steady breeze + travelling gust fronts along WIND_DIR; GLSL and JS evaluate the same math
	const WIND_DIR = [0.97, 0.243];
	const windUni = {
		uWindDir: { value: new T.Vector2(WIND_DIR[0], WIND_DIR[1]) },
		uWindBase: { value: 1 },
		uGustPos: { value: -50 },
		uGustAmp: { value: 0 }
	};
	const WIND_GLSL = `
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
		const d = x * WIND_DIR[0] + z * WIND_DIR[1] - (windUni.uGustPos.value - lag);
		return windUni.uGustAmp.value * (d > 0 ? Math.exp(-d * d * 1.2) : Math.exp(-d * d * 0.12));
	};
	const breezeAt = function (x: number, z: number, t: number) {
		return windUni.uWindBase.value * (0.65 + 0.35 * Math.sin(t * 0.37 + (x * WIND_DIR[0] + z * WIND_DIR[1]) * 0.45));
	};
	// gust schedule: seeded gaps of 8-20s, cycled — a pure function of the accumulated clock
	const GUSTS: { t0: number; amp: number; v: number }[] = [];
	let gustPeriod = 0;
	for (let i = 0; i < 48; i++) {
		gustPeriod += 8 + rand2() * 12;
		GUSTS.push({ t0: gustPeriod, amp: 0.6 + rand2() * 0.4, v: 3 + rand2() * 1.2 });
	}
	gustPeriod += 10;
	const GUST_SPAN = 22; // the front runs from s=-11 to s=+11 along WIND_DIR
	const updateWind = function (t: number) {
		if (!Q.gusts) return;
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
			windUni.uGustPos.value = -GUST_SPAN / 2 + g.v * el;
			windUni.uGustAmp.value = g.amp * Math.pow(Math.sin((Math.PI * el) / dur), 0.5);
		} else {
			windUni.uGustAmp.value = 0;
			windUni.uGustPos.value = -50;
		}
	};

	// --- one flicker signal (drives flames, lights, ground pool, grass/bough warm terms, coals) ---
	const h1 = function (i: number) {
		const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
		return v - Math.floor(v);
	};
	const vn1 = function (x: number) {
		const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
		return h1(i) * (1 - u) + h1(i + 1) * u;
	};
	const flickAt = function (t: number, gustFire: number) {
		return 0.82 + (vn1(t * 6.1) - 0.5) * 0.22 + (vn1(t * 11.3 + 17) - 0.5) * 0.14 + Math.sin(t * 5.3) * 0.03 + gustFire * 0.1;
	};

	// --- soft fire shadows: casters (x, z, radius, height) occlude the fire's light across the ground ---
	const casters: [number, number, number, number][] = [];
	const fireLUni = { value: new T.Vector3(0, 0, 0.7) }; // light centre xz (sways with the flames) + height
	const SHADOW_GLSL = (n: number) =>
		n > 0 && Q.shadows
			? `
              uniform vec4 uCast[${n}];
              uniform vec3 uFireL;
              float fireShadow(vec2 p) {
                vec2 q = p - uFireL.xy;
                float lp = length(q);
                if (lp > 5.6) return 0.0;
                vec2 dir = q / max(lp, 1e-3);
                float sh = 0.0;
                for (int i = 0; i < ${n}; i++) {
                  vec2 c = uCast[i].xy - uFireL.xy;
                  float s = dot(c, dir);
                  if (s <= 0.05 || s >= lp) continue;
                  float behind = lp - s;
                  float perp = abs(c.x * dir.y - c.y * dir.x);
                  // finite casters: the ray from the flame clears the top at lp = s / (1 - H/h)
                  float hk = uCast[i].w / uFireL.z;
                  float reach = hk >= 0.98 ? 1e3 : s / (1.0 - hk) - s;
                  // penumbra widens with distance behind the caster (fire is ~0.25 wide)
                  float pen = 0.03 + 0.18 * behind / s;
                  float a = 1.0 - smoothstep(uCast[i].z - pen, uCast[i].z + pen, perp);
                  a *= smoothstep(0.0, 0.06, behind) * exp(-behind * 0.2);
                  a *= 1.0 - smoothstep(reach * 0.55, reach, behind);
                  a /= 1.0 + pen * 1.2;
                  sh = max(sh, a);
                }
                return sh;
              }`
			: `
              float fireShadow(vec2 p) { return 0.0; }`;
	const DITHER = Q.dither
		? `gl_FragColor.rgb += (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;`
		: '';
	// value noise shared by the ground and rock shaders
	const NOISE2_GLSL = `
              float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
              float vn(vec2 p) {
                vec2 i = floor(p), f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
              }`;
	// seat logs (x, z, yaw) — shared by grass exclusion, AO, casters and ember landing
	const SEATS = [
		[0.72, 1.5, 0.35],
		[-1.35, 1.1, -0.6]
	];
	SEATS.forEach(function (pr) {
		for (let k = -1; k <= 1; k++) casters.push([pr[0] + Math.cos(pr[2]) * 0.45 * k, pr[1] - Math.sin(pr[2]) * 0.45 * k, 0.17, 0.32]);
	});

	// --- procedural textures ---
	const barkTex = new T.CanvasTexture(
		mkCanvas(256, 512, function (g, w, h) {
			g.fillStyle = '#170e06';
			g.fillRect(0, 0, w, h);
			// vertical bark ridges
			for (let i = 0; i < 280; i++) {
				const x = rand() * w;
				g.strokeStyle = 'hsl(' + (18 + rand() * 16) + ',38%,' + (6 + rand() * 17) + '%)';
				g.lineWidth = 1.5 + rand() * 3;
				g.beginPath();
				g.moveTo(x, 0);
				let px = x;
				for (let y = 0; y <= h; y += 32) {
					px += (rand() - 0.5) * 16;
					g.lineTo(px, y);
				}
				g.stroke();
			}
			// deep fissures
			for (let i = 0; i < 26; i++) {
				const x = rand() * w;
				g.strokeStyle = 'rgba(4,2,0,.85)';
				g.lineWidth = 2.5 + rand() * 3.5;
				g.beginPath();
				g.moveTo(x, rand() * h * 0.4);
				let px = x;
				const y0 = rand() * h * 0.3, y1 = y0 + h * (0.3 + rand() * 0.5);
				for (let y = y0; y <= y1; y += 20) {
					px += (rand() - 0.5) * 10;
					g.lineTo(px, y);
				}
				g.stroke();
			}
			// knots
			for (let i = 0; i < 7; i++) {
				const x = rand() * w, y = rand() * h, r = 7 + rand() * 12;
				for (let k = 3; k > 0; k--) {
					g.strokeStyle =
						k === 1 ? 'rgba(6,3,0,.9)' : 'hsla(' + (20 + rand() * 10) + ',34%,' + (9 + k * 4) + '%,.8)';
					g.lineWidth = 2;
					g.beginPath();
					g.ellipse(x, y, (r * k) / 3, ((r * k) / 3) * 1.5, 0, 0, Math.PI * 2);
					g.stroke();
				}
			}
			// lichen flecks
			for (let i = 0; i < 240; i++) {
				g.fillStyle =
					'hsla(' + (70 + rand() * 40) + ',22%,' + (16 + rand() * 14) + '%,' + (0.1 + rand() * 0.2) + ')';
				g.fillRect(rand() * w, rand() * h, 1 + rand() * 2.5, 1 + rand() * 2);
			}
		})
	);
	barkTex.wrapS = barkTex.wrapT = T.RepeatWrapping;
	barkTex.repeat.set(1.5, 2);
	barkTex.encoding = T.sRGBEncoding;
	// cut-wood end grain (growth rings) for log ends
	const ringTex = new T.CanvasTexture(
		mkCanvas(128, 128, function (g, w, h) {
			g.fillStyle = '#b08a5c';
			g.fillRect(0, 0, w, h);
			for (let r = 58; r > 2; r -= 3 + rand() * 4) {
				g.strokeStyle = 'hsla(' + (26 + rand() * 8) + ',40%,' + (22 + rand() * 16) + '%,.75)';
				g.lineWidth = 1 + rand() * 1.6;
				g.beginPath();
				for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.22) {
					const rr = r + Math.sin(a * 3 + r) * 1.6;
					const x = 64 + Math.cos(a) * rr, y = 64 + Math.sin(a) * rr;
					if (a === 0) g.moveTo(x, y);
					else g.lineTo(x, y);
				}
				g.closePath();
				g.stroke();
			}
			// radial cracks
			for (let i = 0; i < 5; i++) {
				const a = rand() * Math.PI * 2;
				g.strokeStyle = 'rgba(40,22,8,.6)';
				g.lineWidth = 1.4;
				g.beginPath();
				g.moveTo(64, 64);
				g.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60);
				g.stroke();
			}
		})
	);
	ringTex.encoding = T.sRGBEncoding;
	// rock texture: mottled grey-brown with speckle
	const rockTex = new T.CanvasTexture(
		mkCanvas(128, 128, function (g, w, h) {
			g.fillStyle = '#4d4038';
			g.fillRect(0, 0, w, h);
			for (let i = 0; i < 30; i++) {
				const x = rand() * w, y = rand() * h, r = 8 + rand() * 26;
				const gr = g.createRadialGradient(x, y, 0, x, y, r);
				gr.addColorStop(0, 'hsla(' + (22 + rand() * 18) + ',12%,' + (20 + rand() * 18) + '%,.5)');
				gr.addColorStop(1, 'rgba(0,0,0,0)');
				g.fillStyle = gr;
				g.beginPath();
				g.arc(x, y, r, 0, Math.PI * 2);
				g.fill();
			}
			for (let i = 0; i < 4200; i++) {
				const l = rand();
				g.fillStyle =
					l < 0.5
						? 'rgba(0,0,0,' + (0.1 + rand() * 0.22) + ')'
						: 'hsla(30,10%,' + (30 + rand() * 26) + '%,' + (0.1 + rand() * 0.2) + ')';
				g.fillRect(rand() * w, rand() * h, 1, 1);
			}
		})
	);
	rockTex.wrapS = rockTex.wrapT = T.RepeatWrapping;
	rockTex.encoding = T.sRGBEncoding;
	// organic rock geometry: icosahedron with a per-rock phase-shifted lobe field (no two alike),
	// displacement is a pure function of direction so the non-indexed faces stay sealed
	const mkRockGeo = function (r: number, detail: number) {
		const g = new T.IcosahedronGeometry(r, detail);
		const p = g.attributes.position as THREE.BufferAttribute;
		const ph = rand() * 40, sx = 0.8 + rand() * 0.45, sz = 0.8 + rand() * 0.45, flat = 0.15 + rand() * 0.25;
		const cav = new Float32Array(p.count);
		const cuts: number[][] = [];
		for (let c = 0, nc = 5 + Math.floor(rand2() * 4); c < nc; c++) {
			const a = rand2() * Math.PI * 2, el = (rand2() - 0.3) * 1.6;
			cuts.push([Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el), 0.6 + rand2() * 0.22]);
		}
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i) / r, y = p.getY(i) / r, z = p.getZ(i) / r;
			let n =
				1 +
				Math.sin(x * 2.6 + ph) * Math.sin(y * 2.2 + ph * 1.3) * Math.sin(z * 2.9 + ph * 0.7) * 0.32 +
				Math.sin(x * 6.3 + z * 4.1 + ph) * 0.05 +
				Math.sin(y * 7.7 - x * 5.2 + ph * 2.0) * 0.04;
			if (y > 1 - flat) n *= 1 - (y - (1 - flat)) * 0.5; // weathered flat-ish crown
			let vx = x * n * sx, vy = y * n, vz = z * n * sz;
			// chisel: shave flat facets with a few planes so the outline reads hand-cut, not a smooth lump
			if (Q.rockDetail)
				for (let c = 0; c < cuts.length; c++) {
					const k = vx * cuts[c][0] + vy * cuts[c][1] + vz * cuts[c][2] - cuts[c][3];
					if (k > 0) {
						vx -= cuts[c][0] * k * 0.9;
						vy -= cuts[c][1] * k * 0.9;
						vz -= cuts[c][2] * k * 0.9;
					}
				}
			p.setXYZ(i, vx * r, vy * r, vz * r);
			// cavity: lobes pushed inward read as crevices (1 = open face, 0 = deep crevice)
			cav[i] = Math.min(1, Math.max(0, (n - 0.8) / 0.32));
		}
		g.setAttribute('aCav', new T.BufferAttribute(cav, 1));
		smoothNormals(g);
		return g;
	};
	const glowTex = new T.CanvasTexture(
		mkCanvas(256, 256, function (g, w, h) {
			const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
			gr.addColorStop(0, 'rgba(255,190,110,1)');
			gr.addColorStop(0.25, 'rgba(255,140,50,0.55)');
			gr.addColorStop(0.6, 'rgba(200,80,20,0.16)');
			gr.addColorStop(1, 'rgba(0,0,0,0)');
			g.fillStyle = gr;
			g.fillRect(0, 0, w, h);
		})
	);
	glowTex.encoding = T.sRGBEncoding;
	const flameTex = new T.CanvasTexture(
		mkCanvas(128, 256, function (g, w, h) {
			g.globalCompositeOperation = 'lighter';
			const blob = function (x: number, y: number, r: number, c0: string, c1: string) {
				const gr = g.createRadialGradient(x, y, 0, x, y, r);
				gr.addColorStop(0, c0);
				gr.addColorStop(1, c1);
				g.fillStyle = gr;
				g.fillRect(0, 0, w, h);
			};
			blob(64, 128, 110, 'rgba(200,60,10,0.5)', 'rgba(0,0,0,0)');
			blob(64, 150, 80, 'rgba(255,120,20,0.75)', 'rgba(0,0,0,0)');
			blob(64, 175, 52, 'rgba(255,205,90,0.95)', 'rgba(0,0,0,0)');
			blob(64, 195, 30, 'rgba(255,246,200,1)', 'rgba(0,0,0,0)');
		})
	);
	flameTex.encoding = T.sRGBEncoding;

	// needle-spray branch card: stem runs base (u=0, at the trunk) → tip (u=1); grey level = needle shade
	const needleTex = new T.CanvasTexture(
		mkCanvas(256, 128, function (g, w, h) {
			g.clearRect(0, 0, w, h);
			g.lineCap = 'round';
			const env = function (t: number) {
				return t < 0.06 ? 0 : Math.pow(Math.sin(Math.PI * Math.min(1, (t - 0.06) / 0.97)), 0.55);
			};
			const needle = function (x: number, y: number, a: number, len: number, shade: number) {
				const v = Math.round(Math.min(255, shade));
				g.strokeStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
				g.lineWidth = 1.2 + rand() * 0.7;
				g.beginPath();
				g.moveTo(x, y);
				g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
				g.stroke();
			};
			const stem = function (x0: number, y0: number, a0: number, len: number, sub: boolean, t0: number) {
				let x = x0, y = y0, a = a0;
				const pts: number[][] = [];
				for (let s = 0; s <= len; s += 2) {
					pts.push([x, y, a, s / len]);
					a += (rand() - 0.5) * 0.03;
					x += Math.cos(a) * 2;
					y += Math.sin(a) * 2;
				}
				g.strokeStyle = 'rgb(60,60,60)';
				g.lineWidth = sub ? 1.4 : 3;
				g.beginPath();
				g.moveTo(x0, y0);
				pts.forEach(function (q) {
					g.lineTo(q[0], q[1]);
				});
				g.stroke();
				pts.forEach(function (q) {
					const t = q[3];
					const e = sub ? (1 - t * 0.55) * env(t0) : env(t);
					if (e <= 0.05) return;
					for (let side = -1; side <= 1; side += 2) {
						const na = q[2] + side * (0.55 + rand() * 0.55);
						needle(q[0], q[1], na, (10 + rand() * 11) * (0.55 + 0.45 * e), 110 + rand() * 110 + (sub ? t : t0) * 40);
					}
				});
				if (!sub) {
					let side = 1;
					for (let s = len * 0.12; s < len * 0.86; s += 15 + rand() * 9) {
						const q = pts[Math.min(pts.length - 1, Math.round(s / 2))];
						const t = s / len;
						stem(q[0], q[1], q[2] + side * (0.5 + rand() * 0.25), 58 * env(t) * (0.75 + rand() * 0.35), true, t);
						side = -side;
					}
				}
			};
			// faint underlay along the spray: invisible at full res (below the alpha cut), it keeps
			// the averaged mip coverage above the cut so distant cards stay solid instead of dissolving
			g.fillStyle = "rgba(90,90,90,0.3)";
			g.beginPath();
			g.moveTo(8, h / 2);
			g.quadraticCurveTo(w * 0.45, h * 0.06, w - 8, h / 2);
			g.quadraticCurveTo(w * 0.45, h * 0.94, 8, h / 2);
			g.fill();
			stem(3, h / 2, 0, w - 12, false, 0);
		})
	);
	// far-treeline silhouettes: a 3-variant atlas (ragged spruce, broken-top snag, lopsided pine) with
	// sawtooth tier hems — no smooth arches. Burns the old texture's 632 ctx.rand() calls so the seeded
	// stream (grass layout etc.) is unchanged; the new shapes draw from rand2.
	for (let i = 0; i < 632; i++) rand();
	const silTex = new T.CanvasTexture(
		mkCanvas(384, 256, function (g, w, h) {
			g.clearRect(0, 0, w, h);
			g.fillStyle = '#ffffff';
			const cw = w / 3;
			for (let v = 0; v < 3; v++) {
				const cx = cw * v + cw / 2 + (rand2() - 0.5) * 6;
				const tiers = v === 1 ? 7 : 10;
				const topF = v === 1 ? 0.62 : 1; // snag: foliage stops, a dead spike carries on
				const lop = v === 2 ? 0.35 : 0.12;
				g.fillRect(cx - 2, h * 0.86, 4, h * 0.14);
				for (let k = 0; k < tiers; k++) {
					const f = (k / (tiers - 1)) * topF;
					const yb = h * (0.99 - f * 0.86);
					const th = h * (0.17 - f * 0.08);
					const wdL = (cw / 2 - 3) * (1 - f * 0.85) * (0.7 + rand2() * 0.3) * (1 + (rand2() - 0.5) * lop);
					const wdR = (cw / 2 - 3) * (1 - f * 0.85) * (0.7 + rand2() * 0.3) * (1 + (rand2() - 0.5) * lop);
					const sx = cx + (rand2() - 0.5) * 4;
					g.beginPath();
					g.moveTo(sx, yb - th);
					// ragged flank down to the left tip
					for (let j = 1; j <= 5; j++) {
						const u = j / 5;
						g.lineTo(sx - wdL * u + (rand2() - 0.5) * 3, yb - th + th * 1.1 * Math.pow(u, 1.3) + (rand2() - 0.5) * th * 0.18);
					}
					// hem: irregular needle tufts hanging below the tier (random spacing and depth)
					let x = sx - wdL;
					while (x < sx + wdR - 3) {
						x += 2 + rand2() * Math.max(3, (wdL + wdR) * 0.12);
						g.lineTo(Math.min(x, sx + wdR), yb + (rand2() < 0.5 ? -th * (0.1 + rand2() * 0.35) : th * rand2() * 0.15));
					}
					for (let j = 4; j >= 0; j--) {
						const u = j / 5;
						g.lineTo(sx + wdR * u + (rand2() - 0.5) * 3, yb - th + th * 1.1 * Math.pow(u, 1.3) + (rand2() - 0.5) * th * 0.18);
					}
					g.closePath();
					g.fill();
				}
				if (v === 1) {
					g.beginPath();
					g.moveTo(cx - 2, h * 0.5);
					g.lineTo(cx + 1, h * 0.12);
					g.lineTo(cx + 2.5, h * 0.5);
					g.fill();
					g.fillRect(cx, h * 0.3, 10, 2); // one bare stub
				}
			}
		})
	);

	// --- lights: fire is the scene's sun ---
	scene.add(new T.HemisphereLight(todP.sky, 0x000000, todP.hemi));
	const moonRim = new T.DirectionalLight(0x5f7fb8, todP.moon);
	moonRim.position.set(-4, 6, -3);
	scene.add(moonRim);
	if (TOD === 'dawn') {
		const sun = new T.DirectionalLight(0xfff2dc, 0.45);
		sun.position.set(3, 7, 2);
		scene.add(sun);
	}
	const fireLight = new T.PointLight(0xff7d2e, 3.4, 14, 2);
	fireLight.position.set(0, 0.62, 0);
	scene.add(fireLight);
	const canopyLight = new T.PointLight(0xff8a3a, 0.8, 18, 2);
	canopyLight.position.set(0, 3.4, 0);
	scene.add(canopyLight);
	// ground-bounce fill: faint ember tint on camera-facing surfaces (seat logs, stones)
	const bounceLight = new T.PointLight(0xff8a40, 2.4 * todP.fire, 8, 1);
	bounceLight.position.set(0.1, 0.7, 2.9);
	scene.add(bounceLight);
	const bounceLight2 = new T.PointLight(0xff8a40, 1.1 * todP.fire, 4, 1);
	bounceLight2.position.set(-1.6, 0.55, 2.2);
	scene.add(bounceLight2);

	// --- sky dome: horizon a shade lighter than the fog so canopies read as dark masses ---
	const sky = new T.Mesh(
		new T.SphereGeometry(70, 24, 12),
		new T.ShaderMaterial({
			uniforms: { uHor: { value: new T.Color(todP.hor) }, uZen: { value: new T.Color(todP.zen) }, uFogC: fogUni },
			side: T.BackSide,
			depthWrite: false,
			vertexShader: `
              varying vec3 vDir;
              void main() {
                vDir = normalize(position);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }`,
			fragmentShader: `
              uniform vec3 uHor;
              uniform vec3 uZen;
              uniform vec3 uFogC;
              varying vec3 vDir;
              void main() {
                float k = smoothstep(0.04, 0.6, vDir.y);
                // below the horizon it meets the fogged ground edge seamlessly
                vec3 c = mix(uFogC, uHor, smoothstep(-0.1, 0.06, vDir.y));
                gl_FragColor = vec4(mix(c, uZen, sqrt(k)), 1.0);
                ${DITHER}
              }`
		})
	);
	sky.renderOrder = -10;
	scene.add(sky);

	// glow decal over the ground shader's firelight pool (flicker driven in the update)
	const gGlowMat = new T.MeshBasicMaterial({
		map: glowTex,
		transparent: true,
		opacity: 0.45,
		blending: T.AdditiveBlending,
		depthWrite: false
	});
	const gGlow = new T.Mesh(new T.CircleGeometry(2.7, 40), gGlowMat);
	gGlow.rotation.x = -Math.PI / 2;
	gGlow.position.y = 0.012;
	spin.add(gGlow);

	// --- pines: merged bark trunks + instanced needle-branch cards (grass-family shader) ---
	const trunkGeos: THREE.BufferGeometry[] = [];
	const coreGeos: THREE.BufferGeometry[] = [];
	const cardM: number[] = [];
	const cardInfo: number[] = [];
	const tmpM = new T.Matrix4(),
		tmpQ = new T.Quaternion(),
		tmpE = new T.Euler(),
		tmpP = new T.Vector3(),
		tmpS = new T.Vector3();
	// card = unit plane, stem along +x from its base; roll about the stem, then pitch (droop), then yaw
	const pushCard = function (
		base: THREE.Matrix4,
		px: number,
		py: number,
		pz: number,
		yaw: number,
		pitch: number,
		roll: number,
		L: number,
		W: number,
		info: number[]
	) {
		// rand2 jitter breaks up the regular lattice crossing boughs made against the sky
		tmpE.set(roll + (rand2() - 0.5) * 0.5, yaw + (rand2() - 0.5) * 0.3, pitch + (rand2() - 0.5) * 0.12, 'YZX');
		tmpQ.setFromEuler(tmpE);
		tmpM.compose(tmpP.set(px, py, pz), tmpQ, tmpS.set(L, W, 1)).premultiply(base);
		for (let i = 0; i < 16; i++) cardM.push(tmpM.elements[i]);
		cardInfo.push(info[0], info[1], info[2], info[3]);
	};
	const NEAR_BARK = new T.Color(0x56514c),
		DARK_BARK = new T.Color(0x2c2219);
	const mkTree = function (x: number, z: number, s: number, lean: number, dark?: boolean) {
		const base = new T.Matrix4().compose(
			new T.Vector3(x, 0, z),
			new T.Quaternion().setFromEuler(new T.Euler(0, 0, lean)),
			new T.Vector3(1, 1, 1)
		);
		const th = 5.5 * s * (0.78 + rand() * 0.5);
		const tg = new T.CylinderGeometry(0.11 * s, 0.22 * s, th, 9, 7);
		{
			const p = (tg.attributes.position as THREE.BufferAttribute).array as Float32Array;
			for (let i = 0; i < p.length; i += 3) {
				const k = p[i + 1] / th + 0.5;
				p[i] += Math.sin(k * 9 + x) * 0.035 * s;
				p[i + 2] += Math.cos(k * 7 + z) * 0.035 * s;
				// root flare: the bottom ring splays out (lobed) so the foot reads as gripping the soil
				if (k < 0.01) {
					const fl = 1.55 + Math.sin(Math.atan2(p[i + 2], p[i]) * 5 + x * 3) * 0.25;
					p[i] *= fl;
					p[i + 2] *= fl;
				}
			}
			tg.computeVertexNormals();
		}
		// base sunk 0.2 below y=0 (ground jitter ±0.07, lean tilts the flared foot ±0.03) so no trunk can float
		tg.translate(0, th / 2 - 0.2, 0);
		const tgn = tg.toNonIndexed();
		tgn.applyMatrix4(base);
		const bc = dark ? DARK_BARK : NEAR_BARK;
		const tpa = (tgn.attributes.position as THREE.BufferAttribute).array as Float32Array;
		const tc = new Float32Array(tpa.length);
		for (let i = 0; i < tc.length; i += 3) {
			// trunk foot sinks into shadow
			const k = 0.55 + 0.45 * Math.min(1, tpa[i + 1] / 0.9);
			tc[i] = bc.r * k;
			tc[i + 1] = bc.g * k;
			tc[i + 2] = bc.b * k;
		}
		tgn.setAttribute('color', new T.BufferAttribute(tc, 3));
		trunkGeos.push(tgn);
		// whorls of drooping branch cards: wide at the base, a few upright cards as the spire
		const info = [x, z, th, rand() + (dark ? 1 : 0)];
		const whorls = lite ? 8 : 10,
			per = lite ? 6 : 8;
		const y0 = th * 0.36,
			y1 = th * 0.95;
		for (let k = 0; k < whorls; k++) {
			const f = k / (whorls - 1);
			const y = y0 + (y1 - y0) * f + (rand() - 0.5) * 0.12 * s;
			const reach = s * (1.4 * Math.pow(1 - f, 0.85) + 0.24);
			const off = rand() * Math.PI * 2;
			const nb = per - Math.round(f * 2);
			for (let b = 0; b < nb; b++) {
				const yaw = off + (b / nb) * Math.PI * 2 + (rand() - 0.5) * 0.5;
				const L = reach * (0.8 + rand() * 0.35);
				pushCard(
					base,
					Math.cos(yaw) * 0.07 * s,
					y,
					-Math.sin(yaw) * 0.07 * s,
					yaw,
					-0.5 + f * 0.6 + (rand() - 0.5) * 0.22,
					Math.PI / 2 + (rand() - 0.5) * 1.4,
					L,
					Math.max(0.3 * s, L * 0.56),
					info
				);
			}
			// short inner boughs fill the shelf between the trunk and the outer sprays
			for (let b = 0; b < (lite ? 2 : 4); b++) {
				const yaw = off + ((b + 0.5) / (lite ? 2 : 4)) * Math.PI * 2 + (rand() - 0.5) * 0.6;
				const L = reach * (0.45 + rand() * 0.2);
				pushCard(base, 0, y + 0.06 * s, 0, yaw, -0.2 + (rand() - 0.5) * 0.3, Math.PI / 2 + (rand() - 0.5) * 0.8, L, L * 0.62, info);
			}
		}
		for (let b = 0; b < 3; b++) {
			const yaw = (b / 3) * Math.PI * 2 + rand();
			pushCard(base, 0, y1 - 0.1 * s, 0, yaw, 1.15 + rand() * 0.25, rand() * Math.PI, 0.8 * s, 0.32 * s, info);
		}
		// dark inner core so the canopy reads as a mass, not a lattice
		const ch = th * 0.97 - y0;
		const cg = new T.LatheGeometry(
			[
				new T.Vector2(0.05 * s, y0 + 0.15 * ch),
				new T.Vector2(0.36 * s, y0 + 0.3 * ch),
				new T.Vector2(0.22 * s, y0 + 0.7 * ch),
				new T.Vector2(0.001, y0 + ch)
			],
			7
		);
		const cgn = cg.toNonIndexed();
		cgn.applyMatrix4(base);
		coreGeos.push(cgn);
		aoPts.push([x, z, 0.55 * s]);
		casters.push([x, z, 0.19 * s, 50]);
		// fuller canopy: in-between boughs bridging each tier gap, and wider inner shelves
		const fillPer = lite ? 3 : 5;
		for (let k = 0; k < whorls - 1; k++) {
			const f = (k + 0.5) / (whorls - 1);
			const y = y0 + (y1 - y0) * f;
			const reach = s * (1.4 * Math.pow(1 - f, 0.85) + 0.24);
			const off = rand2() * Math.PI * 2;
			for (let b = 0; b < fillPer; b++) {
				const yaw = off + (b / fillPer) * Math.PI * 2 + (rand2() - 0.5) * 0.6;
				const L = reach * (0.55 + rand2() * 0.35);
				pushCard(base, Math.cos(yaw) * 0.05 * s, y, -Math.sin(yaw) * 0.05 * s, yaw, -0.42 + f * 0.5 + (rand2() - 0.5) * 0.3,
					Math.PI / 2 + (rand2() - 0.5) * 1.2, L, Math.max(0.32 * s, L * 0.7), info);
			}
		}
	};
	const treeDefs: [number, number, number, number, boolean?][] = [
		[-1.25, -1.6, 1.0, 0.05], [1.35, -1.9, 1.15, -0.04], [-1.95, -3.2, 1.3, 0.02], [2.1, -3.4, 1.2, -0.06], [0.7, -4.6, 1.1, 0.03], [-3.3, -0.6, 1.2, 0.04], [3.3, -0.2, 1.35, -0.02], [-2.6, 1.6, 1.1, -0.05, true], [2.8, 1.9, 1.25, 0.05, true],
		[-4.4, -6.2, 1.7, 0.03, true], [3.9, -5.8, 1.6, -0.04, true], [-1.3, -7.4, 1.85, 0.02, true], [1.7, -8.0, 1.8, -0.02, true], [-6.2, -8.5, 2.0, 0.04, true], [6.0, -8.2, 1.95, -0.03, true]
	];
	// the back rows (z <= -5.8) become fogged silhouette cards instead (below)
	const isFar = function (d: [number, number, number, number, boolean?]) {
		return d[1] <= -5.8;
	};
	(lite
		? treeDefs.filter(function (d, i) {
				return i % 2 === 0;
			})
		: treeDefs
	).forEach(function (d) {
		if (!isFar(d) && inView(d[0], d[1], 1.6 * d[2])) mkTree(d[0], d[1], d[2], d[3], d[4]);
	});
	// extra flanking trees for mobile — the halved treeDefs leave the frame edges sparse
	if (lite) {
		mkTree(-2.6, -2.3, 1.25, 0.03);
		mkTree(-3.1, -1.0, 1.3, -0.03);
		mkTree(3.0, -1.4, 1.3, 0.04);
		mkTree(-2.2, -4.6, 1.4, 0.02, true);
		mkTree(2.5, -4.2, 1.35, -0.05, true);
		mkTree(3.4, -2.8, 1.2, 0.03);
	}

	// --- far treeline: camera-facing silhouette cards in three fogged rows ---
	const silM: number[] = [];
	const silVar: number[] = [];
	const silAt = function (x: number, z: number, hgt: number) {
		tmpM.compose(
			tmpP.set(x, -0.15, z),
			tmpQ.setFromEuler(tmpE.set(0, Math.atan2(-x, 5.8 - z), 0)),
			tmpS.set(hgt * 0.5, hgt, 1)
		);
		for (let i = 0; i < 16; i++) silM.push(tmpM.elements[i]);
		silVar.push(Math.floor(rand2() * 3));
	};
	treeDefs.forEach(function (d) {
		if (isFar(d)) silAt(d[0], d[1], 4.6 * d[2] * (0.85 + rand() * 0.3));
	});
	[-7.0, -10.0, -13.5].forEach(function (zr, ri) {
		const n = (lite ? [7, 8, 9] : [10, 12, 14])[ri];
		const half = Math.tan(1.0) * (5.8 - zr);
		for (let i = 0; i < n; i++) {
			const x = -half + ((i + 0.2 + rand() * 0.6) / n) * half * 2;
			silAt(x, zr + (rand() - 0.5) * 1.6, (4.2 + rand() * 2.6) * (1 + ri * 0.22) * (0.65 + rand2() * 0.3));
		}
	});
	const silGeo = new T.PlaneGeometry(1, 1);
	silGeo.translate(0, 0.5, 0);
	const silMesh = new T.InstancedMesh(
		silGeo,
		new T.ShaderMaterial({
			uniforms: { uAlpha: { value: silTex }, uFogC: fogUni, uHor: { value: new T.Color(todP.hor) } },
			vertexShader: `
              attribute float aVar;
              varying vec2 vUv;
              varying vec2 vAt;
              varying vec3 vWorld;
              void main() {
                vUv = uv;
                vAt = vec2((uv.x + aVar) / 3.0, uv.y);
                vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
                vWorld = w.xyz;
                gl_Position = projectionMatrix * viewMatrix * w;
              }`,
			fragmentShader:
				`
              uniform sampler2D uAlpha;
              uniform vec3 uFogC;
              uniform vec3 uHor;
              varying vec2 vUv;
              varying vec2 vAt;
              varying vec3 vWorld;` +
				FOG_GLSL +
				`
              void main() {
                if (texture2D(uAlpha, vAt).a < 0.5) discard;
                vec3 c = mix(vec3(0.012, 0.018, 0.02), uHor * 0.5, vUv.y * 0.25);
                c = fogMix(c, vWorld, 0.072);
                // the foot dissolves into the ground mist instead of ending on a hard band
                gl_FragColor = vec4(mix(c, uFogC, (1.0 - smoothstep(0.0, 0.3, vUv.y)) * 0.55), 1.0);
                ${DITHER}
              }`
		}),
		silM.length / 16
	);
	(silMesh.instanceMatrix.array as Float32Array).set(silM);
	silGeo.setAttribute('aVar', new T.InstancedBufferAttribute(new Float32Array(silVar), 1));
	silMesh.instanceMatrix.needsUpdate = true;
	silMesh.frustumCulled = false;
	spin.add(silMesh);

	const fireKit = new T.Group();
	spin.add(fireKit);
	// --- fire ring + clearing boulders: one merged, vertex-tinted rock mesh (soot / moss baked) ---
	const rockGeos: THREE.BufferGeometry[] = [];
	const addRock = function (
		g: THREE.BufferGeometry,
		x: number,
		y: number,
		z: number,
		rx: number,
		ry: number,
		rz: number,
		sy: number,
		kind: 'ring' | 'boulder' | 'pebble'
	) {
		tmpM.compose(tmpP.set(x, y, z), tmpQ.setFromEuler(tmpE.set(rx, ry, rz, 'XYZ')), tmpS.set(1, sy, 1));
		g.applyMatrix4(tmpM);
		const p = g.attributes.position as THREE.BufferAttribute;
		const nn = g.attributes.normal as THREE.BufferAttribute;
		const cv = g.attributes.aCav as THREE.BufferAttribute;
		const c = new Float32Array(p.count * 3);
		for (let i = 0; i < p.count; i++) {
			const wx = p.getX(i), wy = p.getY(i), wz = p.getZ(i);
			const nx = nn.getX(i), ny = nn.getY(i), nz = nn.getZ(i);
			// contact darkening where the stone meets the soil, folded into the cavity term
			const contact = 0.5 + 0.5 * Math.min(1, Math.max(0, wy / (kind === 'boulder' ? 0.22 : 0.035)));
			let soot = 0, moss = 0;
			if (kind === 'ring') {
				// soot: faces turned toward the flames and the stone's crown blacken
				const tx = -wx, ty = FIRE_POS.y - wy, tz = -wz, tl = Math.hypot(tx, ty, tz);
				soot = Math.min(0.85, (Math.max(0, (nx * tx + ny * ty + nz * tz) / tl) * 0.8 + Math.max(0, ny) * 0.25) * 0.9);
			} else if (kind === 'boulder') {
				moss = Math.min(1, Math.max(0, (ny - 0.05 + Math.sin(wx * 9 + wz * 7) * 0.2) * 2.6));
			}
			c[i * 3] = soot;
			c[i * 3 + 1] = moss;
			c[i * 3 + 2] = (0.55 + 0.45 * cv.getX(i)) * contact;
		}
		g.setAttribute('color', new T.BufferAttribute(c, 3));
		rockGeos.push(g);
	};
	const RING_N = 12;
	for (let i = 0; i < RING_N; i++) {
		const a = (i / RING_N) * Math.PI * 2 + 0.3 + (rand() - 0.5) * 0.16;
		const big = i % 3 === 0;
		const r = big ? 0.14 + rand() * 0.04 : 0.085 + rand() * 0.045;
		const rr = 0.6 + (big ? 0.03 : 0) + (rand() - 0.5) * 0.06;
		addRock(
			mkRockGeo(r, 2),
			Math.cos(a) * rr,
			r * 0.12,
			Math.sin(a) * rr,
			(rand() - 0.5) * 0.5,
			rand() * Math.PI * 2,
			(rand() - 0.5) * 0.5,
			0.62 + rand() * 0.2,
			'ring'
		);
	}
	// mossy boulders at the clearing edge (composition anchors left / right / back)
	const boulders: [number, number, number][] = [
		[-2.3, -1.25, 0.46],
		[2.15, -0.75, 0.52],
		[-0.85, -2.75, 0.32]
	];
	boulders.forEach(function (b) {
		if (!inView(b[0], b[1], 0.2)) return;
		addRock(mkRockGeo(b[2], 2), b[0], b[2] * 0.08, b[1], (rand() - 0.5) * 0.3, rand() * Math.PI * 2, (rand() - 0.5) * 0.3, 0.68, 'boulder');
		// a satellite stone at each boulder's foot
		const a = rand() * Math.PI * 2;
		addRock(mkRockGeo(b[2] * 0.38, 1), b[0] + Math.cos(a) * b[2] * 1.05, 0.02, b[1] + Math.sin(a) * b[2] * 1.05, rand(), rand() * 6, rand() * 0.4, 0.6, 'boulder');
		aoPts.push([b[0], b[1], b[2] * 1.5]);
		casters.push([b[0], b[1], b[2] * 0.85, b[2] * 0.7]);
	});
	const stoneMat = new T.ShaderMaterial({
		uniforms: { uFlick: flickUni, uAmb: ambUni, uFogC: fogUni, uFogD: { value: todP.fd }, uMoon: { value: todP.moon }, uFire: { value: FIRE_POS } },
		vertexShader: `
              attribute vec3 color;
              varying vec3 vLocal;
              varying vec3 vWorld;
              varying vec3 vN;
              varying vec3 vC;
              void main() {
                vLocal = position;
                vN = normal;
                vC = color;
                vec4 w = modelMatrix * vec4(position, 1.0);
                vWorld = w.xyz;
                gl_Position = projectionMatrix * viewMatrix * w;
              }`,
		fragmentShader:
			`
              uniform float uFlick;
              uniform float uFogD;
              uniform float uMoon;
              uniform vec3 uAmb;
              uniform vec3 uFogC;
              uniform vec3 uFire;
              varying vec3 vLocal;
              varying vec3 vWorld;
              varying vec3 vN;
              varying vec3 vC;` +
			FOG_GLSL +
			NOISE2_GLSL +
			`
              float tri(vec3 p, vec3 b, float sc) { return vn(p.yz * sc) * b.x + vn(p.xz * sc) * b.y + vn(p.xy * sc) * b.z; }
              void main() {
                vec3 n = normalize(vN);
                vec3 b = pow(abs(n), vec3(4.0));
                b /= b.x + b.y + b.z;
                float g1 = tri(vLocal, b, 22.0), g2 = tri(vLocal + 5.3, b, 64.0), g3 = tri(vLocal + 3.1, b, 7.0);
                float grain = g1 * 0.6 + g2 * 0.4;
                float pits = smoothstep(0.8, 0.93, tri(vLocal + 7.0, b, 40.0));
                float crack = 1.0 - smoothstep(0.0, 0.016, abs(tri(vLocal + 11.0, b, 13.0) - 0.5));
                vec3 alb = mix(vec3(0.26, 0.24, 0.22), vec3(0.42, 0.385, 0.34), g3) * (0.78 + 0.44 * grain);
                alb *= (1.0 - pits * 0.45) * (1.0 - crack * 0.4);
                alb *= vC.b;
                alb *= 1.0 - vC.r * 0.75;
                float m = vC.g * smoothstep(0.32, 0.62, g3 + grain * 0.35);
                vec3 mossC = mix(vec3(0.085, 0.14, 0.04), vec3(0.17, 0.25, 0.06), g1);
                alb = mix(alb, mossC, m);
                // purely diffuse: wrapped fire lambert, camera-side ember bounce, sky ambient, moon
                vec3 L = uFire - vLocal;
                float d = length(L);
                L /= d;
                float att = uFlick * 2.2 / (1.0 + d * d * 0.7);
                vec3 fireC = vec3(1.0, 0.52, 0.18);
                vec3 lit = alb * fireC * clamp((dot(n, L) + 0.2) / 1.2, 0.0, 1.0) * att;
                vec3 B = vec3(0.1, 0.7, 2.9) - vLocal;
                float dB = length(B);
                lit += alb * fireC * max(dot(n, B / dB), 0.0) * 1.6 * uFlick / (1.0 + dB * dB * 0.12);
                lit += alb * uAmb * (0.7 + 0.5 * n.y) * mix(0.6, 1.0, vC.b);
                lit += alb * vec3(0.30, 0.40, 0.62) * uMoon * max(dot(n, vec3(-0.51, 0.77, -0.38)), 0.0) * 0.6;
                // moss keeps a little cool moonlit lift on its tops so it still reads at night
                lit += mossC * m * vec3(0.3, 0.4, 0.55) * uMoon * 0.35 * max(n.y, 0.0);
                gl_FragColor = vec4(fogMix(lit, vWorld, uFogD), 1.0);
                ${DITHER}
              }`
	});

	// --- burning logs + flickering coals ---
	// perlin-twist smoke column above the fire (adapted from the coffee-smoke shader)
	// DC L1673 loads 'assets/perlin.png' but the asset is absent from the handoff (the
	// reference render 404s and the smoke never shows). Generate an equivalent tileable
	// value-noise texture procedurally so the smoke column reads as designed.
	const perlinTex = new T.CanvasTexture(
		mkCanvas(256, 256, function (g, w, h) {
			const img = g.createImageData(w, h);
			const cells = [8, 16, 32];
			const lats = cells.map(function (n) {
				const v = new Float32Array(n * n);
				for (let i = 0; i < v.length; i++) v[i] = rand();
				return v;
			});
			const sample = function (lat: Float32Array, n: number, x: number, y: number) {
				const gx = (x / w) * n, gy = (y / h) * n;
				const x0 = Math.floor(gx) % n, y0 = Math.floor(gy) % n;
				const x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
				const fx = gx - Math.floor(gx), fy = gy - Math.floor(gy);
				const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
				const a = lat[y0 * n + x0], b = lat[y0 * n + x1], c = lat[y1 * n + x0], d = lat[y1 * n + x1];
				return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
			};
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					let v = 0, amp = 0.5, tot = 0;
					for (let o = 0; o < 3; o++) {
						v += sample(lats[o], cells[o], x, y) * amp;
						tot += amp;
						amp *= 0.5;
					}
					const c8 = Math.round((v / tot) * 255);
					const i = (y * w + x) * 4;
					img.data[i] = img.data[i + 1] = img.data[i + 2] = c8;
					img.data[i + 3] = 255;
				}
			}
			g.putImageData(img, 0, 0);
		})
	);
	perlinTex.wrapS = perlinTex.wrapT = T.RepeatWrapping;
	const smokeGeo = new T.PlaneGeometry(1, 1, 16, 64);
	smokeGeo.translate(0, 0.5, 0);
	smokeGeo.scale(0.55, 2.1, 0.55);
	const smokeMat = new T.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		side: T.DoubleSide,
		uniforms: Object.assign(
			{ uTime: { value: 0 }, uPerlin: { value: perlinTex }, uRise: { value: 0 } },
			windUni
		),
		vertexShader:
			WIND_GLSL +
			'uniform float uTime; uniform sampler2D uPerlin; varying vec2 vUv;\n' +
			'vec2 rot2(vec2 v, float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c)*v; }\n' +
			'void main(){ vec3 np=position;\n' +
			'  float tw=texture2D(uPerlin, vec2(0.5, uv.y*0.2 - uTime*0.005)).r;\n' +
			'  np.xz=rot2(np.xz, tw*10.0);\n' +
			'  vec2 wind=vec2(texture2D(uPerlin, vec2(0.25, uTime*0.01)).r-0.5, texture2D(uPerlin, vec2(0.75, uTime*0.01)).r-0.5);\n' +
			'  wind = wind*0.55 + uWindDir*(breezeAt(vec2(0.0), uTime)*0.22 + gustAt(vec2(0.0), 0.3 - uv.y*0.9)*0.85);\n' +
			'  np.xz+=wind*pow(uv.y,2.0)*2.2;\n' +
			'  gl_Position=projectionMatrix*modelViewMatrix*vec4(np,1.0); vUv=uv; }',
		fragmentShader:
			'uniform float uTime; uniform float uRise; uniform sampler2D uPerlin; varying vec2 vUv;\n' +
			'void main(){ vec2 suv=vUv; suv.x*=0.5; suv.y*=0.3; suv.y-=uTime*0.03;\n' +
			'  float s=texture2D(uPerlin, suv).r; s=smoothstep(0.4,1.0,s);\n' +
			'  s*=smoothstep(0.0,0.1,vUv.x)*smoothstep(1.0,0.9,vUv.x);\n' +
			'  s*=smoothstep(0.0,0.16,vUv.y)*smoothstep(1.0,0.4,vUv.y);\n' +
			// emerge: a soft front climbs the column as uRise goes 0 -> 1, thickening as it goes
			'  float front=uRise*1.3; s*=smoothstep(front, front-0.3, vUv.y)*smoothstep(0.0,0.4,uRise);\n' +
			'  gl_FragColor=vec4(0.42,0.40,0.38, s*0.32); ' + DITHER + ' }'
	});
	const smoke = new T.Mesh(smokeGeo, smokeMat);
	smoke.position.set(0, 0.55, 0);
	smoke.renderOrder = 3;
	spin.add(smoke);
	const logMat = new T.MeshStandardMaterial({
		map: barkTex,
		bumpMap: barkTex,
		bumpScale: 0.028,
		color: 0x8a6242,
		roughness: 1,
		dithering: Q.dither
	});
	const endMat = new T.MeshStandardMaterial({ map: ringTex, color: 0xd8b98a, roughness: 1, dithering: Q.dither });
	// burning logs get charred, ember-lit ends: the old pale cut-wood caps sat a hand's width from the
	// fire's point light and popped in and out of the flame base every flicker — the "flashing logs"
	const charEndMat = new T.MeshStandardMaterial({ color: 0x1c120c, roughness: 1, emissive: 0xff5a1a, emissiveIntensity: 0.2, dithering: Q.dither });
	// teepee-stacked logs leaning into the fire
	const UP = new T.Vector3(0, 1, 0);
	for (let i = 0; i < 5; i++) {
		const a = (i / 5) * Math.PI * 2 + 0.4;
		const base = new T.Vector3(Math.cos(a) * 0.36, 0.03, Math.sin(a) * 0.36);
		const tip = new T.Vector3((rand() - 0.5) * 0.12, 0.6 + rand() * 0.08, (rand() - 0.5) * 0.12);
		const dir = tip.clone().sub(base);
		const len = dir.length();
		const lg = new T.Mesh(new T.CylinderGeometry(0.042, 0.058, len, 10), [logMat, charEndMat, charEndMat]);
		lg.position.copy(base).add(tip).multiplyScalar(0.5);
		lg.quaternion.setFromUnitVectors(UP, dir.normalize());
		fireKit.add(lg);
	}
	// two collapsed logs lying low across the base
	[[0.55, 0.09], [1.9, 0.07]].forEach(function (pr) {
		const lg = new T.Mesh(new T.CylinderGeometry(0.05, 0.062, 0.7, 10), [logMat, charEndMat, charEndMat]);
		lg.position.set(0, pr[1], 0);
		lg.rotation.z = Math.PI / 2 - 0.06;
		lg.rotation.y = pr[0];
		fireKit.add(lg);
	});

	const coals: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[] = [];
	for (let i = 0; i < 8; i++) {
		const co = new T.Mesh(
			new T.DodecahedronGeometry(0.04 + rand() * 0.035, 0),
			new T.MeshBasicMaterial({ color: 0xff4a10, transparent: true, opacity: 0.9 })
		);
		co.position.set((rand() - 0.5) * 0.44, 0.04 + rand() * 0.09, (rand() - 0.5) * 0.44);
		coals.push(co);
		spin.add(co);
	}

	// --- flame: noise-displaced shader cones (see ./shared) + glow sprites ---
	const flameA = mkFlame(T, spin, 0.44, 1.0, 1.0, 0.58);
	const flameB = mkFlame(T, spin, 0.25, 0.64, 0.7, 0.4);
	const flameAMat = flameA.material as THREE.ShaderMaterial;
	const flameBMat = flameB.material as THREE.ShaderMaterial;
	const glowMat = new T.SpriteMaterial({
		map: glowTex,
		color: 0xff9a48,
		transparent: true,
		opacity: 0.8,
		blending: T.AdditiveBlending,
		depthWrite: false
	});
	const glow = new T.Sprite(glowMat);
	glow.scale.set(3.4, 3.4, 1);
	glow.position.y = 0.75;
	spin.add(glow);
	const glow2Mat = new T.SpriteMaterial({
		map: glowTex,
		color: 0xffd090,
		transparent: true,
		opacity: 0.55,
		blending: T.AdditiveBlending,
		depthWrite: false
	});
	const glow2 = new T.Sprite(glow2Mat);
	glow2.scale.set(1.5, 1.9, 1);
	glow2.position.y = 0.62;
	spin.add(glow2);

	// --- rising embers (rare jade = HxH nod) ---
	const en = lite ? 24 : 55,
		eg = new T.BufferGeometry(),
		ep = new Float32Array(en * 3),
		ec = new Float32Array(en * 3),
		ev: number[] = [];
	const warm = new T.Color(0xff9d4a), jade = new T.Color(0x86caa4);
	for (let i = 0; i < en; i++) {
		ep[i * 3] = (rand() - 0.5) * 0.3;
		ep[i * 3 + 1] = rand() * 1.6;
		ep[i * 3 + 2] = (rand() - 0.5) * 0.3;
		const cc = rand() < 0.08 ? jade : warm;
		ec[i * 3] = cc.r;
		ec[i * 3 + 1] = cc.g;
		ec[i * 3 + 2] = cc.b;
		ev.push(0.004 + rand() * 0.009);
	}
	// 0 = rising spark, 1 = falling lander, 2 = smouldering on the ground / a log
	const eSt = new Uint8Array(en), eVel = new Float32Array(en * 3), eAge = new Float32Array(en), eLife = new Float32Array(en);
	const eBase = new Float32Array(ec);
	eg.setAttribute('position', new T.BufferAttribute(ep, 3));
	eg.setAttribute('color', new T.BufferAttribute(ec, 3));
	spin.add(
		new T.Points(
			eg,
			new T.PointsMaterial({
				size: 0.036,
				vertexColors: true,
				transparent: true,
				opacity: 0.9,
				blending: T.AdditiveBlending,
				depthWrite: false
			})
		)
	);

	// --- fireflies drifting behind the trees ---
	const ffGroups: { g: THREE.BufferGeometry; m: THREE.PointsMaterial; ph: number }[] = [];
	for (let gi = 0; gi < 1; gi++) {
		const fn = lite ? 2 : 3,
			fgeo = new T.BufferGeometry(),
			fp = new Float32Array(fn * 3);
		for (let i = 0; i < fn; i++) {
			const side = rand() < 0.5 ? -1 : 1;
			fp[i * 3] = side * (1.2 + rand() * 3.2);
			fp[i * 3 + 1] = 0.3 + rand() * 1.7;
			fp[i * 3 + 2] = -1.8 - rand() * 4.5;
		}
		fgeo.setAttribute('position', new T.BufferAttribute(fp, 3));
		const fmat = new T.PointsMaterial({
			color: 0xd8e87a,
			size: 0.055,
			transparent: true,
			opacity: 0,
			blending: T.AdditiveBlending,
			depthWrite: false
		});
		spin.add(new T.Points(fgeo, fmat));
		ffGroups.push({ g: fgeo, m: fmat, ph: gi * 2.1 });
	}

	// --- fluffy instanced billboard grass (Codrops technique: alpha cards + wind + AO gradient) ---
	const bladeAlpha = new T.CanvasTexture(
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
	// only casters near the fire throw a visible shadow; lite keeps the 10 closest
	const castN = casters
		.filter(function (c) {
			return Math.hypot(c[0], c[1]) < 5.2;
		})
		.sort(function (a, b) {
			return Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]);
		})
		.slice(0, lite ? 10 : 18);
	const castUni = {
		value: castN.map(function (c) {
			return new T.Vector4(c[0], c[1], c[2], c[3]);
		})
	};
	const grassUni = {
		uTime: { value: 0 },
		uFlick: { value: 1 },
		uAlpha: { value: bladeAlpha },
		uAmb: { value: new T.Vector3(todP.amb[0], todP.amb[1], todP.amb[2]) },
		uFogC: { value: new T.Color(todP.fog) },
		uCast: castUni,
		uFireL: fireLUni
	};
	const grassMat = new T.ShaderMaterial({
		uniforms: Object.assign(grassUni, windUni),
		side: T.DoubleSide,
		transparent: false,
		vertexShader:
			WIND_GLSL +
			`
              uniform float uTime;
              varying vec2 vUv;
              varying vec3 vWorld;
              varying vec2 vLocal;
              varying float vGust;
              varying float vRnd;
              void main() {
                vUv = uv;
                vec4 p = vec4(position, 1.0);
                vec2 iorigin = vec2(0.0);
                #ifdef USE_INSTANCING
                  p = instanceMatrix * p;
                  iorigin = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
                #endif
                vLocal = p.xz;
                vec4 w = modelMatrix * p;
                float sway = uv.y * uv.y;
                float g = gustAt(p.xz, 0.0);
                float br = breezeAt(p.xz, uTime);
                float wind = sin(uTime * 1.6 + w.x * 1.4 + w.z * 1.1) * 0.06 * (0.8 + 0.25 * br)
                           + sin(uTime * 3.9 + w.x * 3.0 + w.z * 2.2) * 0.022 * (1.0 + 2.5 * g);
                vec2 lean = uWindDir * (br * 0.018 + g * 0.11);
                w.x += (wind + lean.x) * sway;
                w.z += (wind * 0.6 + lean.y) * sway;
                vGust = g;
                vRnd = fract(sin(dot(iorigin, vec2(12.9898, 78.233))) * 43758.5453);
                vWorld = w.xyz;
                gl_Position = projectionMatrix * viewMatrix * w;
              }`,
		fragmentShader:
			SHADOW_GLSL(castN.length) +
			`
              uniform sampler2D uAlpha;
              uniform float uFlick;
              uniform vec3 uAmb;
              uniform vec3 uFogC;
              varying vec2 vUv;
              varying vec3 vWorld;
              varying vec2 vLocal;
              varying float vGust;
              varying float vRnd;
              void main() {
                float a = texture2D(uAlpha, vUv).a;
                if (a < 0.4) discard;
                vec3 base = vec3(0.05, 0.085, 0.028);
                vec3 tipA = vec3(0.38, 0.50, 0.17);
                vec3 tipB = vec3(0.22, 0.44, 0.15);
                vec3 col = mix(base, mix(tipA, tipB, vRnd), vUv.y);
                float d = length(vWorld.xz);
                float glow = pow(clamp(1.0 - d / 5.4, 0.0, 1.0), 1.7) * uFlick;
                glow *= 1.0 - 0.85 * fireShadow(vLocal);
                vec3 lit = col * (uAmb + vec3(1.0, 0.52, 0.18) * glow * 2.8);
                // a passing gust flips the blade tips: a faint cool sheen rides the front
                lit += uAmb * vGust * vUv.y * vUv.y * 0.22;
                float camD = distance(vWorld, cameraPosition);
                float fogF = clamp(1.0 - exp(-pow(camD * 0.115, 2.0)), 0.0, 1.0);
                lit = mix(lit, uFogC, fogF);
                gl_FragColor = vec4(lit, 1.0);
                ${DITHER}
              }`
	});
	const bladeGeoG = new T.PlaneGeometry(0.3, 0.34, 1, 3);
	bladeGeoG.translate(0, 0.17, 0);
	const GRASS_N = lite ? 3200 : 5200;
	const grass = new T.InstancedMesh(bladeGeoG, grassMat, GRASS_N);
	const dummy = new T.Object3D();
	// keep blades out of the seat logs' footprint (axis-segment distance test)
	const nearLog = function (x: number, z: number) {
		for (let li = 0; li < 2; li++) {
			const L = SEATS[li],
				dirx = Math.cos(L[2]),
				dirz = -Math.sin(L[2]);
			const dx = x - L[0],
				dz = z - L[1];
			let tt = dx * dirx + dz * dirz;
			tt = Math.max(-0.68, Math.min(0.68, tt));
			if (Math.hypot(dx - dirx * tt, dz - dirz * tt) < 0.22) return true;
		}
		return false;
	};
	let gi = 0;
	while (gi < GRASS_N) {
		let x, z;
		const band = gi % (lite ? 3 : 2);
		if (band === 0) {
			// dedicated foreground band, close to camera — dense so the ground behind the logs stays hidden
			x = (rand() - 0.5) * 7.5;
			z = 2.2 + rand() * 3.2;
		} else if (lite && band === 2) {
			// tree-line band — fills the background around the trees (mobile parity with desktop)
			const a = rand() * Math.PI * 2;
			const r = 4.2 + rand() * 3.0;
			x = Math.cos(a) * r;
			z = Math.sin(a) * r;
		} else {
			// radial field around the campfire — biased toward the fire so the clearing floor is covered, still reaching the tree line
			const a = rand() * Math.PI * 2;
			const r = 0.85 + Math.pow(rand(), 1.5) * 6.8;
			x = Math.cos(a) * r;
			z = Math.sin(a) * r;
		}
		if (z > 4.6 && Math.abs(x) < 0.75) continue;
		if (!inView(x, z, 0.15) || nearLog(x, z)) continue;
		const rr = Math.hypot(x, z);
		if (rr < 0.82) continue;
		const s = 0.51 + rand() * 0.76 + Math.max(0, rr - 2.0) * 0.1;
		for (let k = 0; k < 2 && gi < GRASS_N; k++) {
			dummy.position.set(x + (rand() - 0.5) * 0.08, 0, z + (rand() - 0.5) * 0.08);
			dummy.rotation.set(0, rand() * Math.PI, (rand() - 0.5) * 0.14);
			dummy.scale.setScalar(s * (0.85 + rand() * 0.3));
			dummy.updateMatrix();
			grass.setMatrixAt(gi++, dummy.matrix);
		}
	}
	grass.instanceMatrix.needsUpdate = true;
	spin.add(grass);
	// anchor points for dedicated grass clumps (bushes push theirs below)
	const clumpPts: [number, number, number][] = [];
	// low needle shrubs hugging the tree line — same branch cards as the pines, splayed upward
	const IDENT = new T.Matrix4();
	for (let i = 0; i < 12; i++) {
		const a = rand() * Math.PI * 2;
		const r = 2.6 + rand() * 2.6;
		const bx = Math.cos(a) * r,
			bz = Math.sin(a) * r;
		if (bz > 2.4 || !inView(bx, bz, 0.1)) continue;
		const info = [bx, bz, 0.55, rand()];
		const n = lite ? 6 : 9;
		for (let k = 0; k < n; k++) {
			const yaw = (k / n) * Math.PI * 2 + rand() * 0.6;
			const L = 0.32 + rand() * 0.24;
			pushCard(IDENT, bx + Math.cos(yaw) * 0.04, 0.02, bz - Math.sin(yaw) * 0.04, yaw, 0.35 + rand() * 0.6, Math.PI / 2 + (rand() - 0.5) * 1.6, L, L * 0.6, info);
		}
		aoPts.push([bx, bz, 0.4]);
		clumpPts.push([bx, bz, 0.55]);
	}
	// scattered twigs (merged) & pebbles (into the rock mesh)
	const twigGeos: THREE.BufferGeometry[] = [];
	for (let i = 0; i < 14; i++) {
		const a = rand() * Math.PI * 2,
			r = 1.2 + rand() * 3.4;
		const tw = new T.CylinderGeometry(0.008 + rand() * 0.007, 0.012 + rand() * 0.008, 0.2 + rand() * 0.35, 5);
		if (!inView(Math.cos(a) * r, Math.sin(a) * r, 0)) continue;
		tmpM.compose(
			tmpP.set(Math.cos(a) * r, 0.015, Math.sin(a) * r),
			tmpQ.setFromEuler(tmpE.set(Math.PI / 2, 0, rand() * Math.PI, 'XYZ')),
			tmpS.set(1, 1, 1)
		);
		const twn = tw.toNonIndexed();
		twn.applyMatrix4(tmpM);
		twigGeos.push(twn);
	}
	if (twigGeos.length)
		spin.add(new T.Mesh(mergeGeos(twigGeos, ['position', 'normal']), new T.MeshStandardMaterial({ color: 0x2e2013, roughness: 1 })));
	for (let i = 0; i < 24; i++) {
		const a = rand() * Math.PI * 2,
			r = 0.9 + rand() * 3.6;
		const pr = 0.02 + rand() * 0.035;
		if (!inView(Math.cos(a) * r, Math.sin(a) * r, 0)) continue;
		addRock(mkRockGeo(pr, 1), Math.cos(a) * r, pr * 0.2, Math.sin(a) * r, rand(), rand() * 6, rand(), 0.7, 'pebble');
	}


	// --- seating logs ---
	const seatGeo = new T.CylinderGeometry(0.16, 0.175, 1.3, 13);
	{
		const p = seatGeo.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i),
				z = p.getZ(i);
			if (Math.abs(p.getY(i)) < 0.6) {
				const n = 1 + Math.sin(x * 31 + z * 27) * 0.05;
				p.setX(i, x * n);
				p.setZ(i, z * n);
			}
		}
		seatGeo.computeVertexNormals();
	}
	const seatMat = [
		new T.MeshStandardMaterial({ map: barkTex, bumpMap: barkTex, bumpScale: 0.03, color: 0xc09468, roughness: 1, dithering: Q.dither }),
		endMat,
		endMat
	];
	[
		[0.72, 1.5, 0.35],
		[-1.35, 1.1, -0.6]
	].forEach(function (pr) {
		const sl = new T.Mesh(seatGeo, seatMat);
		sl.position.set(pr[0], 0.155, pr[1]);
		sl.rotation.z = Math.PI / 2;
		sl.rotation.y = pr[2];
		spin.add(sl);
		clumpPts.push([pr[0], pr[1], 0.8]);
	});

	// dedicated clumps: guaranteed grass at every tree base, bush, and seat log
	treeDefs.forEach(function (d) {
		if (inView(d[0], d[1], 1.6 * d[2])) clumpPts.push([d[0], d[1], 0.45 * d[2] + 0.35]);
	});
	if (!lite && clumpPts.length) {
		const CL_N = 1500;
		const clumps = new T.InstancedMesh(bladeGeoG, grassMat, CL_N);
		for (let ci = 0; ci < CL_N; ci++) {
			const pt = clumpPts[ci % clumpPts.length];
			const a = rand() * Math.PI * 2,
				rr2 = 0.12 + Math.pow(rand(), 0.8) * pt[2];
			const cx = pt[0] + Math.cos(a) * rr2,
				cz = pt[1] + Math.sin(a) * rr2;
			if (!inView(cx, cz, 0.15) || Math.hypot(cx, cz) < 0.82 || nearLog(cx, cz)) {
				dummy.scale.setScalar(0.001);
			} else {
				dummy.scale.setScalar(0.55 + rand() * 0.7);
			}
			dummy.position.set(cx, 0, cz);
			dummy.rotation.set(0, rand() * Math.PI, (rand() - 0.5) * 0.14);
			dummy.updateMatrix();
			clumps.setMatrixAt(ci, dummy.matrix);
		}
		clumps.instanceMatrix.needsUpdate = true;
		spin.add(clumps);
	}

	// --- assemble the merged / instanced forest pieces (one draw call each) ---
	const trunkMat = new T.MeshStandardMaterial({ map: barkTex, bumpMap: barkTex, bumpScale: 0.05, roughness: 1, vertexColors: true, dithering: Q.dither });
	// the bark texture is red-brown; pull the trunks toward brown-grey so firelight doesn't paint them red
	trunkMat.onBeforeCompile = function (sh) {
		sh.fragmentShader = sh.fragmentShader.replace(
			'#include <map_fragment>',
			'#include <map_fragment>\n\tdiffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, 0.25) * vec3(1.0, 0.97, 0.95);'
		);
		// and keep the lit result brown-grey: firelight warms the bark without painting it red
		sh.fragmentShader = sh.fragmentShader.replace(
			'#include <output_fragment>',
			'outgoingLight = mix(vec3(dot(outgoingLight, vec3(0.299, 0.587, 0.114))), outgoingLight, 0.6);\n\t#include <output_fragment>'
		);
	};
	spin.add(
		new T.Mesh(
			mergeGeos(trunkGeos, ['position', 'normal', 'uv', 'color']),
			trunkMat
		)
	);
	spin.add(
		new T.Mesh(
			mergeGeos(coreGeos, ['position']),
			new T.ShaderMaterial({
				uniforms: { uFogC: fogUni, uFogD: { value: todP.fd } },
				side: T.DoubleSide,
				vertexShader: `
              varying vec3 vWorld;
              void main() {
                vec4 w = modelMatrix * vec4(position, 1.0);
                vWorld = w.xyz;
                gl_Position = projectionMatrix * viewMatrix * w;
              }`,
				fragmentShader:
					`
              uniform vec3 uFogC;
              uniform float uFogD;
              varying vec3 vWorld;` +
					FOG_GLSL +
					`
              void main() { gl_FragColor = vec4(fogMix(vec3(0.007, 0.011, 0.009), vWorld, uFogD), 1.0); ${DITHER} }`
			})
		)
	);
	spin.add(new T.Mesh(mergeGeos(rockGeos, ['position', 'normal', 'uv', 'color']), stoneMat));
	const cardGeo = new T.PlaneGeometry(1, 1, 4, 1);
	cardGeo.translate(0.5, 0, 0);
	const CARD_N = cardM.length / 16;
	const cardUni = {
		uTime: timeUni,
		uFlick: flickUni,
		uAmb: ambUni,
		uFogC: fogUni,
		uFogD: { value: todP.fd },
		uMoon: { value: todP.moon },
		uFire: { value: FIRE_POS },
		uTex: { value: needleTex }
	};
	const cards = new T.InstancedMesh(
		cardGeo,
		new T.ShaderMaterial({
			uniforms: Object.assign({}, cardUni, windUni),
			side: T.DoubleSide,
			vertexShader:
				WIND_GLSL +
				`
              uniform float uTime;
              attribute vec4 aInfo;
              varying vec2 vUv;
              varying vec3 vLocal;
              varying vec3 vWorld;
              varying vec4 vInfo;
              varying vec3 vN;
              void main() {
                vUv = uv;
                vec4 p = instanceMatrix * vec4(position, 1.0);
                float L = length(instanceMatrix[0].xyz);
                float u2 = uv.x * uv.x;
                p.y -= u2 * L * 0.22;
                float g = gustAt(p.xz, 1.2);
                float br = breezeAt(p.xz, uTime);
                float sw = sin(uTime * 0.7 + aInfo.x * 1.7 + aInfo.y * 1.3 + p.y * 0.5) * 0.03 * (0.8 + 0.3 * br)
                         + sin(uTime * 2.3 + p.y * 3.0 + aInfo.w * 6.0) * 0.008 * (1.0 + 3.0 * g);
                vec2 lean = uWindDir * (br * 0.012 + g * 0.07);
                p.x += (sw + lean.x) * u2 * L;
                p.z += (sw * 0.6 + lean.y) * u2 * L;
                vLocal = p.xyz;
                vInfo = aInfo;
                vN = normalize(mat3(instanceMatrix) * vec3(0.0, 0.0, 1.0));
                vec4 w = modelMatrix * p;
                vWorld = w.xyz;
                gl_Position = projectionMatrix * viewMatrix * w;
              }`,
			fragmentShader:
				`
              uniform sampler2D uTex;
              uniform float uFlick;
              uniform float uFogD;
              uniform float uMoon;
              uniform vec3 uAmb;
              uniform vec3 uFogC;
              uniform vec3 uFire;
              varying vec2 vUv;
              varying vec3 vLocal;
              varying vec3 vWorld;
              varying vec4 vInfo;
              varying vec3 vN;` +
				FOG_GLSL +
				`
              void main() {
                vec4 tx = texture2D(uTex, vUv);
                // cards turning edge-on to the camera thin out instead of drawing hard diagonal strokes
                float facing = abs(dot(vN, normalize(cameraPosition - vWorld)));
                if (tx.a < mix(0.4, 1.01, 1.0 - smoothstep(0.08, 0.3, facing))) discard;
                float rnd = fract(vInfo.w);
                float dk = step(1.0, vInfo.w);
                vec2 rad = vLocal.xz - vInfo.xy;
                vec2 rd = rad / max(length(rad), 1e-3);
                float hN = clamp(vLocal.y / vInfo.z, 0.0, 1.0);
                // needle tone: deep at the stem root, fresher toward the tips
                vec3 tipC = mix(vec3(0.06, 0.095, 0.062), vec3(0.075, 0.09, 0.05), rnd);
                vec3 col = mix(vec3(0.018, 0.03, 0.022), tipC, smoothstep(0.05, 0.9, vUv.x)) * (0.55 + 0.75 * tx.r);
                col *= 1.0 - dk * 0.45;
                // AO toward the trunk core and toward the crown (crown silhouettes against the sky)
                float ao = mix(0.3, 1.0, smoothstep(0.0, 0.75, vUv.x)) * mix(1.0, 0.5, smoothstep(0.5, 1.0, hN));
                // firelight: the fire-facing side and the low boughs catch it, falling off with distance
                vec3 tf = uFire - vLocal;
                float fd = length(tf);
                float face = clamp(dot(rd, normalize(tf.xz)) * 0.65 + 0.35, 0.0, 1.0);
                float low = mix(1.0, 0.45, smoothstep(1.5, 5.5, vLocal.y));
                float fall = pow(clamp(1.0 - fd / 8.5, 0.0, 1.0), 1.8);
                // two-sided lambert per card so each bough shelf reads as its own plane
                float lam = abs(dot(vN, tf / fd));
                vec3 fire = vec3(1.0, 0.5, 0.17) * face * low * fall * (0.3 + 0.9 * lam) * uFlick * 3.6;
                // cool moon rim on the far (moon-side) tips + moon-facing shelf tops
                float rim = pow(max(dot(rd, vec2(-0.8, -0.6)), 0.0), 2.0) * smoothstep(0.45, 1.0, vUv.x);
                float mlam = abs(dot(vN, vec3(-0.51, 0.77, -0.38)));
                vec3 moon = vec3(0.22, 0.32, 0.55) * uMoon * (rim * 0.2 * (0.4 + hN) + mlam * 0.05 * smoothstep(0.3, 1.0, vUv.x));
                vec3 lit = col * (uAmb * ao * 1.3 + fire * ao) + moon * (0.6 + 0.8 * tx.r);
                gl_FragColor = vec4(fogMix(lit, vWorld, uFogD), 1.0);
                ${DITHER}
              }`
		}),
		CARD_N
	);
	(cards.instanceMatrix.array as Float32Array).set(cardM);
	cards.instanceMatrix.needsUpdate = true;
	cardGeo.setAttribute('aInfo', new T.InstancedBufferAttribute(new Float32Array(cardInfo), 4));
	cards.frustumCulled = false;
	spin.add(cards);

	// --- forest floor: procedural soil / needle litter / moss, ash ring, firelight pool (grass-family shader) ---
	[
		[0.72, 1.5, 0.35],
		[-1.35, 1.1, -0.6]
	].forEach(function (pr) {
		for (let k = -1; k <= 1; k++) aoPts.push([pr[0] + Math.cos(pr[2]) * 0.45 * k, pr[1] - Math.sin(pr[2]) * 0.45 * k, 0.36]);
	});
	const AO_N = aoPts.length;
	const gGeo = new T.CircleGeometry(13, 48);
	gGeo.rotateX(-Math.PI / 2);
	{
		const p = (gGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
		// CircleGeometry duplicates the theta=0 / theta=2PI spoke; coincident vertices must share
		// one height or the ground cracks open along +x. rand() still runs per vertex so the
		// seeded stream (and everything built after) is unchanged.
		const seamH = new Map<string, number>();
		for (let i = 0; i < p.length; i += 3) {
			const d = Math.hypot(p[i], p[i + 2]);
			if (d > 1.2) {
				const key = p[i].toFixed(4) + ',' + p[i + 2].toFixed(4);
				const h = (rand() - 0.5) * 0.14 * Math.min(1, d / 4);
				if (!seamH.has(key)) seamH.set(key, h);
				p[i + 1] = seamH.get(key) as number;
			}
		}
		gGeo.computeVertexNormals();
	}
	const groundMat = new T.ShaderMaterial({
		uniforms: {
			uTime: timeUni,
			uFlick: flickUni,
			uAmb: ambUni,
			uFogC: fogUni,
			uFogD: { value: todP.fd },
			uAO: {
				value: aoPts.map(function (a) {
					return new T.Vector3(a[0], a[1], a[2]);
				})
			},
			uCast: castUni,
			uFireL: fireLUni
		},
		vertexShader: `
              varying vec3 vLocal;
              varying vec3 vWorld;
              void main() {
                vLocal = position;
                vec4 w = modelMatrix * vec4(position, 1.0);
                vWorld = w.xyz;
                gl_Position = projectionMatrix * viewMatrix * w;
              }`,
		fragmentShader:
			`
              #define AO_N ${AO_N}
              uniform float uTime;
              uniform float uFlick;
              uniform float uFogD;
              uniform vec3 uAmb;
              uniform vec3 uFogC;
              uniform vec3 uAO[AO_N];
              varying vec3 vLocal;
              varying vec3 vWorld;` +
			FOG_GLSL +
			NOISE2_GLSL +
			SHADOW_GLSL(castN.length) +
			`
              float fbm(vec2 p) {
                float v = 0.0, a = 0.5;
                for (int i = 0; i < 4; i++) { v += vn(p) * a; p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
                return v;
              }
              // thin anisotropic streaks = fallen needles
              float streaks(vec2 p, float ang) {
                float c = cos(ang), s = sin(ang);
                vec2 q = mat2(c, -s, s, c) * p;
                return vn(q * vec2(2.2, 46.0));
              }
              void main() {
                vec2 p = vLocal.xz;
                float d = length(p);
                float big = fbm(p * 0.45);
                float mid = fbm(p * 1.7 + 4.0);
                vec3 col = vec3(0.065, 0.045, 0.03) * (0.7 + 0.6 * mid);
                float ang = fbm(p * 0.35 + 2.0) * 6.28;
                float nd = max(smoothstep(0.6, 0.92, streaks(p * 3.0, ang)), smoothstep(0.6, 0.92, streaks(p * 3.0 + 7.0, ang + 1.2)));
                float litM = smoothstep(0.4, 0.6, big + (mid - 0.5) * 0.4);
                vec3 litter = mix(vec3(0.075, 0.042, 0.024), vec3(0.3, 0.16, 0.075), nd);
                col = mix(col, litter, litM * (0.45 + 0.55 * nd));
                float mossM = smoothstep(0.52, 0.7, fbm(p * 0.8 + 13.0)) * smoothstep(1.4, 3.0, d);
                col = mix(col, vec3(0.05, 0.08, 0.03) * (0.75 + 0.6 * mid), mossM);
                col *= 0.72 + 0.56 * h21(floor(p * 140.0));
                // ash ring, then the charred bed under the fire
                float n2 = fbm(p * 5.0);
                float ashM = 1.0 - smoothstep(0.7, 1.15, d + (n2 - 0.5) * 0.4);
                col = mix(col, vec3(0.24, 0.225, 0.21) * (0.45 + 0.8 * n2), ashM * 0.9);
                float charM = 1.0 - smoothstep(0.32, 0.58, d + (n2 - 0.5) * 0.25);
                col = mix(col, vec3(0.022, 0.018, 0.015), charM);
                float ao = 1.0;
                for (int i = 0; i < AO_N; i++) ao *= mix(0.35, 1.0, smoothstep(0.0, uAO[i].z, length(p - uAO[i].xy)));
                // firelight: grass's falloff plus a tighter pool right around the ring
                float glow = pow(clamp(1.0 - d / 5.4, 0.0, 1.0), 1.7) * uFlick;
                float pool = pow(clamp(1.0 - d / 2.0, 0.0, 1.0), 2.0) * uFlick;
                float sh = 1.0 - 0.9 * fireShadow(p);
                glow *= sh;
                pool *= sh;
                vec3 lit = col * (uAmb * ao + vec3(1.0, 0.52, 0.18) * (glow * 2.8 + pool * 2.2) * mix(0.55, 1.0, ao));
                // live embers glinting in the char bed
                vec2 ec = floor(p * 26.0);
                float em = step(0.9, h21(ec)) * smoothstep(0.32, 0.12, length(fract(p * 26.0) - 0.5)) * charM;
                lit += vec3(1.0, 0.33, 0.07) * em * (0.45 + 0.55 * sin(uTime * 2.6 + h21(ec + 3.0) * 30.0)) * 0.9 * uFlick;
                gl_FragColor = vec4(fogMix(lit, vWorld, uFogD), 1.0);
                ${DITHER}
              }`
	});
	spin.add(new T.Mesh(gGeo, groundMat));

	// freeze static transforms: only the flames change their matrices per-frame
	spin.traverse(function (n) {
		if (n !== spin) {
			n.updateMatrix();
			n.matrixAutoUpdate = false;
		}
	});
	flameA.matrixAutoUpdate = true;
	flameB.matrixAutoUpdate = true;

	// --- sky pack: stars, moon, clouds, shooting star ---
	const starInt = { night: 1.0, dawn: 0.06, dusk: 0.5 }[TOD];
	const starGroups: { m: THREE.PointsMaterial; ph: number }[] = [];
	if (starInt > 0.01) {
		for (let sgi = 0; sgi < 3; sgi++) {
			const sn = lite ? 40 : 100,
				sg = new T.BufferGeometry(),
				sp = new Float32Array(sn * 3);
			for (let i = 0; i < sn; i++) {
				sp[i * 3] = (rand() - 0.5) * 44;
				sp[i * 3 + 1] = 3 + Math.pow(rand(), 0.8) * 14;
				sp[i * 3 + 2] = -5 - rand() * 22;
			}
			sg.setAttribute('position', new T.BufferAttribute(sp, 3));
			const sm = new T.PointsMaterial({
				color: 0xcdd8ee,
				size: 0.05 + sgi * 0.025,
				transparent: true,
				opacity: 0,
				fog: false,
				depthWrite: false
			});
			spin.add(new T.Points(sg, sm));
			starGroups.push({ m: sm, ph: sgi * 2.1 });
		}
	}
	const moonTex = new T.CanvasTexture(
		mkCanvas(128, 128, function (g, w, h) {
			const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
			gr.addColorStop(0, 'rgba(230,238,252,1)');
			gr.addColorStop(0.28, 'rgba(220,230,250,.9)');
			gr.addColorStop(0.34, 'rgba(180,200,235,.28)');
			gr.addColorStop(1, 'rgba(160,185,230,0)');
			g.fillStyle = gr;
			g.fillRect(0, 0, w, h);
		})
	);
	const moonMat = new T.SpriteMaterial({
		map: moonTex,
		transparent: true,
		opacity: 0.2 + todP.moon * 0.75,
		fog: false,
		depthWrite: false
	});
	const moon = new T.Sprite(moonMat);
	moon.position.set(-7.5, 9.6, -17);
	moon.scale.set(3.4, 3.4, 1);
	spin.add(moon);
	const clouds: { s: THREE.Sprite; v: number }[] = [];
	if (!lite) {
		const cloudTex = new T.CanvasTexture(
			mkCanvas(256, 96, function (g, w, h) {
				for (let i = 0; i < 16; i++) {
					const x = 30 + rand() * (w - 60),
						y = 28 + rand() * (h - 56),
						r = 16 + rand() * 26;
					const gr = g.createRadialGradient(x, y, 0, x, y, r);
					gr.addColorStop(0, 'rgba(150,165,195,.16)');
					gr.addColorStop(1, 'rgba(150,165,195,0)');
					g.fillStyle = gr;
					g.beginPath();
					g.arc(x, y, r, 0, Math.PI * 2);
					g.fill();
				}
			})
		);
		for (let i = 0; i < 3; i++) {
			const cm = new T.SpriteMaterial({
				map: cloudTex,
				transparent: true,
				opacity: TOD === 'night' ? 0.5 : 0.7,
				fog: false,
				depthWrite: false
			});
			const cl = new T.Sprite(cm);
			cl.position.set(-14 + i * 12 + rand() * 4, 8.5 + rand() * 3.5, -19 - i * 1.5);
			cl.scale.set(10 + rand() * 5, 3.4, 1);
			spin.add(cl);
			clouds.push({ s: cl, v: 0.0018 + rand() * 0.0016 });
		}
	}
	const shGeo = new T.BufferGeometry();
	shGeo.setAttribute('position', new T.BufferAttribute(new Float32Array([0, 0, 0, 1.6, 0.5, 0]), 3));
	const shootLine = new T.Line(
		shGeo,
		new T.LineBasicMaterial({ color: 0xdfe8fa, transparent: true, opacity: 0, fog: false })
	);
	shootLine.position.set(0, 11, -18);
	spin.add(shootLine);
	const shoot = { m: shootLine, t0: -1, next: 8 + rand() * 20 };
	// --- ground mist hugging the tree line ---
	const mistTex = new T.CanvasTexture(
		mkCanvas(256, 64, function (g, w, h) {
			for (let i = 0; i < 22; i++) {
				const x = rand() * w,
					y = h * 0.5 + (rand() - 0.5) * 18,
					r = 14 + rand() * 24;
				const gr = g.createRadialGradient(x, y, 0, x, y, r);
				gr.addColorStop(0, 'rgba(170,190,215,.13)');
				gr.addColorStop(1, 'rgba(170,190,215,0)');
				g.fillStyle = gr;
				g.beginPath();
				g.arc(x, y, r, 0, Math.PI * 2);
				g.fill();
			}
		})
	);
	const mists: { s: THREE.Sprite; m: THREE.SpriteMaterial; ph: number }[] = [];
	for (let i = 0; i < (lite ? 1 : 2); i++) {
		const mm = new T.SpriteMaterial({ map: mistTex, transparent: true, opacity: 0.5, fog: false, depthWrite: false });
		const ms = new T.Sprite(mm);
		ms.position.set(i ? 2.4 : -2.2, 0.55 + i * 0.2, -3.4 - i * 1.6);
		ms.scale.set(9 + i * 3, 1.5, 1);
		spin.add(ms);
		mists.push({ s: ms, m: mm, ph: i * 2.4 });
	}
	// --- moonlit canopy haze: faint cool layers BETWEEN the tree rows (depth-tested, so nearer
	// boughs stay dark against them) — separates the upper canopy into depth without lighting it ---
	const hazeTex = new T.CanvasTexture(
		mkCanvas(128, 128, function (g, w, h) {
			const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
			gr.addColorStop(0, 'rgba(255,255,255,1)');
			gr.addColorStop(0.45, 'rgba(255,255,255,.45)');
			gr.addColorStop(1, 'rgba(255,255,255,0)');
			g.fillStyle = gr;
			g.fillRect(0, 0, w, h);
		})
	);
	const hazeLayers: [number, number, number, number, number, number][] = [
		// x, y, z, scaleX, scaleY, opacity — nearer layers fainter
		[-0.9, 3.6, -3.6, 7.5, 3.2, 0.045],
		[0.6, 4.4, -6.4, 10, 4, 0.06],
		[-1.8, 5.2, -9.5, 13, 5, 0.07]
	];
	(lite ? hazeLayers.slice(1) : hazeLayers).forEach(function (hl) {
		const hm = new T.SpriteMaterial({
			map: hazeTex,
			color: 0x8ea4c6,
			transparent: true,
			opacity: hl[5] * (0.45 + todP.moon * 1.3),
			fog: false,
			depthWrite: false
		});
		const hs = new T.Sprite(hm);
		hs.position.set(hl[0], hl[1], hl[2]);
		hs.scale.set(hl[3], hl[4], 1);
		spin.add(hs);
	});
	// --- falling leaves ---
	const leaves: {
		m: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
		x: number;
		z: number;
		y: number;
		vy: number;
		ph: number;
		wait: number;
	}[] = [];
	if (!lite) {
		const leafGeo = new T.PlaneGeometry(0.055, 0.075);
		for (let i = 0; i < 6; i++) {
			const lm = new T.Mesh(
				leafGeo,
				new T.MeshBasicMaterial({
					color: new T.Color().setHSL(0.09 + rand() * 0.06, 0.5, 0.16 + rand() * 0.1),
					transparent: true,
					opacity: 0,
					side: T.DoubleSide
				})
			);
			spin.add(lm);
			leaves.push({ m: lm, x: 0, z: 0, y: -1, vy: 0, ph: rand() * 9, wait: rand() * 14 });
		}
	}
	let flick = flickAt(0, 0);
	const flameAY = flameA.position.y, flameBY = flameB.position.y;
	const sAy = flameAMat.uniforms.uSway.value, sBy = flameBMat.uniforms.uSway.value;
	// smoke emerges a few seconds after the scene first runs, then climbs slowly
	const SMOKE_DELAY = 2.5,
		SMOKE_RISE = 6;
	let smokeT0 = -1;
	return function (t, dt) {
		const fdt = Math.min(dt || 0.016, 0.05);
		updateWind(t);
		const gF = gustAt(0, 0, 0.6), brF = breezeAt(0, 0, t);
		// one smooth flicker (value noise of the clock), eased so no frame jumps more than a few %
		const fTarget = flickAt(t, gF);
		flick += Math.max(-0.03, Math.min(0.03, (fTarget - flick) * Math.min(1, fdt * 14)));
		// flames lean downwind (pivot at the base) and sway harder with the same signal
		const lean = brF * 0.04 + gF * 0.16;
		const fl = [flameA, flameB];
		for (let k = 0; k < 2; k++) {
			const fm = fl[k], ln = lean * (k ? 0.8 : 1), hh = k ? 0.32 : 0.5;
			fm.rotation.set(WIND_DIR[1] * ln, 0, -WIND_DIR[0] * ln);
			fm.position.set(WIND_DIR[0] * Math.sin(ln) * hh, k ? flameBY : flameAY, WIND_DIR[1] * Math.sin(ln) * hh);
		}
		flameAMat.uniforms.uSway.value = sAy * (0.85 + (flick - 0.82) * 1.5 + gF * 0.5);
		flameBMat.uniforms.uSway.value = sBy * (0.85 + (flick - 0.82) * 1.5 + gF * 0.5);
		// the light centre the fake shadows are cast from rides the flame lean + flicker
		fireLUni.value.set(WIND_DIR[0] * lean * 0.35, WIND_DIR[1] * lean * 0.35, 0.7 + (flick - 0.82) * 0.8);
		bounceLight.intensity = (1.2 + 1.45 * flick) * todP.fire;
		bounceLight2.intensity = (0.55 + 0.65 * flick) * todP.fire;
		charEndMat.emissiveIntensity = (0.12 + (flick - 0.6) * 0.45) * todP.fire;
		flameAMat.uniforms.uTime.value = t;
		flameBMat.uniforms.uTime.value = t * 1.25 + 7.0;
		const fmul = 0.45 + 0.55 * todP.fire;
		flameAMat.uniforms.uOpacity.value = (0.7 + flick * 0.3) * fmul;
		flameBMat.uniforms.uOpacity.value = (0.8 + flick * 0.25) * fmul;
		flameA.scale.y = (0.9 + flick * 0.16) * (0.6 + 0.4 * todP.fire);
		flameB.scale.y = (0.88 + flick * 0.18) * (0.6 + 0.4 * todP.fire);
		fireLight.intensity = (2.9 * flick + 0.5) * todP.fire;
		canopyLight.intensity = (0.55 * flick + 0.1) * todP.fire;
		glowMat.opacity = (0.62 * flick + 0.12) * fmul;
		glow2Mat.opacity = (0.42 * flick + 0.1) * fmul;
		gGlowMat.opacity = (0.2 * flick + 0.06) * fmul;
		grassUni.uTime.value = t;
		timeUni.value = t;
		flickUni.value = (0.7 + flick * 0.5) * todP.fire;
		grassUni.uFlick.value = (0.7 + flick * 0.5) * todP.fire;
		smokeMat.uniforms.uTime.value = t;
		if (smokeT0 < 0) smokeT0 = t;
		// still mode (reduced motion) renders a single t=0 frame: show the column fully formed
		const sk =
			t === 0 && dt === 0 ? 1 : Math.min(1, Math.max(0, (t - smokeT0 - SMOKE_DELAY) / SMOKE_RISE));
		smokeMat.uniforms.uRise.value = 1 - Math.pow(1 - sk, 2); // eases into its full height
		coals.forEach(function (co, i) {
			co.material.opacity = 0.55 + (flick - 0.82) * 0.9 + Math.sin(t * 0.9 + i * 2.1) * 0.05;
		});
		const p = (eg.attributes.position as THREE.BufferAttribute).array as Float32Array;
		const col = (eg.attributes.color as THREE.BufferAttribute).array as Float32Array;
		let colDirty = false;
		for (let i = 0; i < en; i++) {
			const i3 = i * 3;
			const wx = WIND_DIR[0] * (breezeAt(p[i3], p[i3 + 2], t) * 0.08 + gustAt(p[i3], p[i3 + 2], 0.4) * 0.5) * fdt;
			const wz = WIND_DIR[1] * (breezeAt(p[i3], p[i3 + 2], t) * 0.08 + gustAt(p[i3], p[i3 + 2], 0.4) * 0.5) * fdt;
			if (eSt[i] === 0) {
				p[i3 + 1] += ev[i];
				p[i3] += Math.sin(t * 2 + i) * 0.0018 + wx;
				p[i3 + 2] += wz;
				if (p[i3 + 1] > 2.0) {
					p[i3 + 1] = 0;
					p[i3] = (rand() - 0.5) * 0.3;
					p[i3 + 2] = (rand() - 0.5) * 0.3;
					if (Q.landingEmbers && rand() < 0.28) {
						// a heavier spark: popped out sideways, it arcs back down instead of rising away
						const a = rand() * Math.PI * 2, sp = 0.35 + rand() * 0.5;
						eSt[i] = 1;
						p[i3 + 1] = 0.45 + rand() * 0.3;
						eVel[i3] = Math.cos(a) * sp;
						eVel[i3 + 1] = 0.9 + rand() * 0.6;
						eVel[i3 + 2] = Math.sin(a) * sp;
					}
				}
			} else if (eSt[i] === 1) {
				eVel[i3 + 1] -= 1.7 * fdt;
				p[i3] += eVel[i3] * fdt + wx;
				p[i3 + 1] += eVel[i3 + 1] * fdt;
				p[i3 + 2] += eVel[i3 + 2] * fdt + wz;
				const floor = nearLog(p[i3], p[i3 + 2]) ? 0.32 : 0.012;
				if (eVel[i3 + 1] < 0 && p[i3 + 1] <= floor) {
					p[i3 + 1] = floor;
					eSt[i] = 2;
					eAge[i] = 0;
					eLife[i] = 2 + rand() * 2;
				}
			} else {
				// smoulder: orange → deep red → dark (additive, so dark = gone), then re-launch as a spark
				eAge[i] += fdt;
				const k = Math.min(1, eAge[i] / eLife[i]);
				const glowK = Math.pow(1 - k, 1.4) * (0.85 + 0.15 * Math.sin(t * 9 + i));
				col[i3] = eBase[i3] * glowK;
				col[i3 + 1] = eBase[i3 + 1] * glowK * (1 - k * 0.7);
				col[i3 + 2] = eBase[i3 + 2] * glowK * (1 - k);
				colDirty = true;
				if (k >= 1) {
					eSt[i] = 0;
					p[i3] = (rand() - 0.5) * 0.3;
					p[i3 + 1] = 0;
					p[i3 + 2] = (rand() - 0.5) * 0.3;
					col[i3] = eBase[i3];
					col[i3 + 1] = eBase[i3 + 1];
					col[i3 + 2] = eBase[i3 + 2];
				}
			}
		}
		eg.attributes.position.needsUpdate = true;
		if (colDirty) eg.attributes.color.needsUpdate = true;
		ffGroups.forEach(function (f, gi) {
			f.m.opacity = Math.max(0, Math.sin(t * 0.8 + f.ph)) * 0.8 * todP.ff;
			const fp = (f.g.attributes.position as THREE.BufferAttribute).array as Float32Array;
			for (let i = 0; i < fp.length; i += 3) {
				fp[i] += Math.sin(t * 0.5 + i + gi) * 0.0014;
				fp[i + 1] += Math.cos(t * 0.7 + i * 1.3 + gi) * 0.001;
			}
			f.g.attributes.position.needsUpdate = true;
		});
		starGroups.forEach(function (s, i) {
			s.m.opacity = starInt * (0.55 + 0.45 * Math.sin(t * (0.6 + i * 0.23) + s.ph));
		});
		clouds.forEach(function (c) {
			c.s.position.x += c.v;
			if (c.s.position.x > 22) c.s.position.x = -22;
		});
		mists.forEach(function (mi) {
			mi.m.opacity = 0.34 + 0.2 * Math.sin(t * 0.22 + mi.ph);
			mi.s.position.x += Math.sin(t * 0.1 + mi.ph) * 0.0012;
		});
		if (t > shoot.next) {
			const el = t - shoot.next;
			if (el < 1.1) {
				if (el < 0.04 && shoot.t0 < 0) {
					shoot.t0 = t;
					shoot.m.position.set(-6 + rand() * 12, 9 + rand() * 4.5, -16 - rand() * 6);
				}
				shoot.m.material.opacity = Math.sin((el / 1.1) * Math.PI) * 0.75 * Math.max(0.15, starInt);
				shoot.m.position.x += 0.085;
				shoot.m.position.y -= 0.026;
			} else {
				shoot.m.material.opacity = 0;
				shoot.t0 = -1;
				shoot.next = t + 20 + rand() * 20;
			}
		}
		leaves.forEach(function (lf) {
			if (lf.y < 0.02) {
				lf.wait -= 0.016;
				lf.m.material.opacity = 0;
				if (lf.wait <= 0) {
					lf.x = (rand() - 0.5) * 6;
					lf.z = -1 - rand() * 3;
					lf.y = 2.6 + rand() * 1.2;
					lf.vy = 0.0045 + rand() * 0.003;
					lf.wait = 8 + rand() * 16;
				}
			} else {
				lf.y -= lf.vy;
				lf.x += WIND_DIR[0] * (breezeAt(lf.x, lf.z, t) * 0.15 + gustAt(lf.x, lf.z, 1.0) * 0.9) * fdt;
				lf.z += WIND_DIR[1] * (breezeAt(lf.x, lf.z, t) * 0.15 + gustAt(lf.x, lf.z, 1.0) * 0.9) * fdt;
				lf.m.material.opacity = Math.min(0.85, lf.m.material.opacity + 0.02) * Math.min(1, lf.y / 0.4);
				lf.m.position.set(lf.x + Math.sin(t * 1.3 + lf.ph) * 0.35, lf.y, lf.z);
				lf.m.rotation.set(Math.sin(t * 2 + lf.ph) * 0.8, t * 0.7 + lf.ph, Math.sin(t * 1.6 + lf.ph) * 0.6);
			}
		});
	};
}
