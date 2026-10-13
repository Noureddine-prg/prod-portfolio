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
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i) / r, y = p.getY(i) / r, z = p.getZ(i) / r;
			let n =
				1 +
				Math.sin(x * 2.6 + ph) * Math.sin(y * 2.2 + ph * 1.3) * Math.sin(z * 2.9 + ph * 0.7) * 0.32 +
				Math.sin(x * 6.3 + z * 4.1 + ph) * 0.05 +
				Math.sin(y * 7.7 - x * 5.2 + ph * 2.0) * 0.04;
			if (y > 1 - flat) n *= 1 - (y - (1 - flat)) * 0.5; // weathered flat-ish crown
			p.setXYZ(i, x * r * n * sx, y * r * n, z * r * n * sz);
		}
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
	// far-treeline pine silhouette (alpha only) — jagged drooping tiers on a thin spine
	const silTex = new T.CanvasTexture(
		mkCanvas(128, 256, function (g, w, h) {
			g.clearRect(0, 0, w, h);
			g.fillStyle = '#ffffff';
			const cx = w / 2;
			g.fillRect(cx - 3, h * 0.8, 6, h * 0.2);
			// tiers: apex → drooping tips → arched underside back to the spine
			const tiers = 8;
			for (let k = 0; k < tiers; k++) {
				const f = k / (tiers - 1);
				const yb = h * (0.9 - f * 0.76);
				const th = h * (0.19 - f * 0.07);
				const wd = (w / 2 - 3) * (1 - f * 0.8) * (0.9 + rand() * 0.1);
				g.beginPath();
				g.moveTo(cx, yb - th);
				g.quadraticCurveTo(cx - wd * 0.45, yb - th * 0.35, cx - wd, yb + th * 0.16);
				g.quadraticCurveTo(cx - wd * 0.45, yb - th * 0.32, cx, yb - th * 0.12);
				g.quadraticCurveTo(cx + wd * 0.45, yb - th * 0.32, cx + wd, yb + th * 0.16);
				g.quadraticCurveTo(cx + wd * 0.45, yb - th * 0.35, cx, yb - th);
				g.fill();
				// needle fringe along the drooping edges
				g.strokeStyle = '#ffffff';
				g.lineWidth = 1.2;
				for (let i = 0; i < 26; i++) {
					const side = i % 2 ? 1 : -1;
					const t = rand();
					const x = cx + side * wd * t, y = yb - th + (th * 1.16) * Math.pow(t, 1.4);
					g.beginPath();
					g.moveTo(x, y);
					g.lineTo(x + side * (2 + rand() * 4), y + 2 + rand() * 5);
					g.stroke();
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
		tmpE.set(roll, yaw, pitch, 'YZX');
		tmpQ.setFromEuler(tmpE);
		tmpM.compose(tmpP.set(px, py, pz), tmpQ, tmpS.set(L, W, 1)).premultiply(base);
		for (let i = 0; i < 16; i++) cardM.push(tmpM.elements[i]);
		cardInfo.push(info[0], info[1], info[2], info[3]);
	};
	const NEAR_BARK = new T.Color(0x52443a),
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
		const cg = new T.ConeGeometry(0.36 * s, th * 0.97 - y0 - 0.2, 7, 1, true);
		cg.translate(0, y0 + 0.2 + (th * 0.97 - y0 - 0.2) / 2, 0);
		const cgn = cg.toNonIndexed();
		cgn.applyMatrix4(base);
		coreGeos.push(cgn);
		aoPts.push([x, z, 0.55 * s]);
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
	const silAt = function (x: number, z: number, hgt: number) {
		tmpM.compose(
			tmpP.set(x, -0.15, z),
			tmpQ.setFromEuler(tmpE.set(0, Math.atan2(-x, 5.8 - z), 0)),
			tmpS.set(hgt * 0.5, hgt, 1)
		);
		for (let i = 0; i < 16; i++) silM.push(tmpM.elements[i]);
	};
	treeDefs.forEach(function (d) {
		if (isFar(d)) silAt(d[0], d[1], 4.6 * d[2] * (0.85 + rand() * 0.3));
	});
	[-7.0, -10.0, -13.5].forEach(function (zr, ri) {
		const n = (lite ? [7, 8, 9] : [10, 12, 14])[ri];
		const half = Math.tan(1.0) * (5.8 - zr);
		for (let i = 0; i < n; i++) {
			const x = -half + ((i + 0.2 + rand() * 0.6) / n) * half * 2;
			silAt(x, zr + (rand() - 0.5) * 1.6, (4.2 + rand() * 2.6) * (1 + ri * 0.22));
		}
	});
	const silGeo = new T.PlaneGeometry(1, 1);
	silGeo.translate(0, 0.5, 0);
	const silMesh = new T.InstancedMesh(
		silGeo,
		new T.ShaderMaterial({
			uniforms: { uAlpha: { value: silTex }, uFogC: fogUni, uHor: { value: new T.Color(todP.hor) } },
			vertexShader: `
              varying vec2 vUv;
              varying vec3 vWorld;
              void main() {
                vUv = uv;
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
              varying vec3 vWorld;` +
				FOG_GLSL +
				`
              void main() {
                if (texture2D(uAlpha, vUv).a < 0.5) discard;
                vec3 c = mix(vec3(0.012, 0.018, 0.02), uHor * 0.5, vUv.y * 0.25);
                gl_FragColor = vec4(fogMix(c, vWorld, 0.072), 1.0);
              }`
		}),
		silM.length / 16
	);
	(silMesh.instanceMatrix.array as Float32Array).set(silM);
	silMesh.instanceMatrix.needsUpdate = true;
	silMesh.frustumCulled = false;
	spin.add(silMesh);

	const fireKit = new T.Group();
	spin.add(fireKit);
	// --- fire ring + clearing boulders: one merged, vertex-tinted rock mesh (soot / moss baked) ---
	const rockGeos: THREE.BufferGeometry[] = [];
	const MOSS = [0.36, 0.72, 0.2];
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
		const c = new Float32Array(p.count * 3);
		for (let i = 0; i < p.count; i++) {
			const wx = p.getX(i), wy = p.getY(i), wz = p.getZ(i);
			const nx = nn.getX(i), ny = nn.getY(i), nz = nn.getZ(i);
			let k = (kind === 'boulder' ? 0.38 : 0.5) + (kind === 'boulder' ? 0.42 : 0.5) * Math.min(1, Math.max(0, wy / (kind === 'boulder' ? 0.28 : 0.09)));
			let col = [k, k, k];
			if (kind === 'ring') {
				// soot: faces turned toward the flames and the stone's crown blacken
				const tx = -wx, ty = FIRE_POS.y - wy, tz = -wz, tl = Math.hypot(tx, ty, tz);
				const soot = Math.max(0, (nx * tx + ny * ty + nz * tz) / tl) * 0.8 + Math.max(0, ny) * 0.25;
				k *= 1 - Math.min(0.82, soot * 0.9);
				col = [k, k * 0.96, k * 0.93];
			} else if (kind === 'boulder') {
				const m = Math.min(1, Math.max(0, (ny - 0.05 + Math.sin(wx * 9 + wz * 7) * 0.2) * 2.6));
				col = [k * (1 - m + m * MOSS[0]), k * (1 - m + m * MOSS[1]), k * (1 - m + m * MOSS[2])];
			}
			c[i * 3] = col[0];
			c[i * 3 + 1] = col[1];
			c[i * 3 + 2] = col[2];
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
	});
	const stoneMat = new T.MeshStandardMaterial({
		map: rockTex,
		bumpMap: rockTex,
		bumpScale: 0.02,
		color: 0x9a8672,
		roughness: 0.96,
		vertexColors: true
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
		uniforms: { uTime: { value: 0 }, uPerlin: { value: perlinTex } },
		vertexShader:
			'uniform float uTime; uniform sampler2D uPerlin; varying vec2 vUv;\n' +
			'vec2 rot2(vec2 v, float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c)*v; }\n' +
			'void main(){ vec3 np=position;\n' +
			'  float tw=texture2D(uPerlin, vec2(0.5, uv.y*0.2 - uTime*0.005)).r;\n' +
			'  np.xz=rot2(np.xz, tw*10.0);\n' +
			'  vec2 wind=vec2(texture2D(uPerlin, vec2(0.25, uTime*0.01)).r-0.5, texture2D(uPerlin, vec2(0.75, uTime*0.01)).r-0.5);\n' +
			'  np.xz+=wind*pow(uv.y,2.0)*2.2;\n' +
			'  gl_Position=projectionMatrix*modelViewMatrix*vec4(np,1.0); vUv=uv; }',
		fragmentShader:
			'uniform float uTime; uniform sampler2D uPerlin; varying vec2 vUv;\n' +
			'void main(){ vec2 suv=vUv; suv.x*=0.5; suv.y*=0.3; suv.y-=uTime*0.03;\n' +
			'  float s=texture2D(uPerlin, suv).r; s=smoothstep(0.4,1.0,s);\n' +
			'  s*=smoothstep(0.0,0.1,vUv.x)*smoothstep(1.0,0.9,vUv.x);\n' +
			'  s*=smoothstep(0.0,0.16,vUv.y)*smoothstep(1.0,0.4,vUv.y);\n' +
			'  gl_FragColor=vec4(0.42,0.40,0.38, s*0.32); }'
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
		roughness: 0.95
	});
	const endMat = new T.MeshStandardMaterial({ map: ringTex, color: 0xd8b98a, roughness: 0.85 });
	// teepee-stacked logs leaning into the fire
	const UP = new T.Vector3(0, 1, 0);
	for (let i = 0; i < 5; i++) {
		const a = (i / 5) * Math.PI * 2 + 0.4;
		const base = new T.Vector3(Math.cos(a) * 0.36, 0.03, Math.sin(a) * 0.36);
		const tip = new T.Vector3((rand() - 0.5) * 0.12, 0.6 + rand() * 0.08, (rand() - 0.5) * 0.12);
		const dir = tip.clone().sub(base);
		const len = dir.length();
		const lg = new T.Mesh(new T.CylinderGeometry(0.042, 0.058, len, 10), [logMat, endMat, endMat]);
		lg.position.copy(base).add(tip).multiplyScalar(0.5);
		lg.quaternion.setFromUnitVectors(UP, dir.normalize());
		fireKit.add(lg);
	}
	// two collapsed logs lying low across the base
	[[0.55, 0.09], [1.9, 0.07]].forEach(function (pr) {
		const lg = new T.Mesh(new T.CylinderGeometry(0.05, 0.062, 0.7, 10), [logMat, endMat, endMat]);
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
	const grassUni = {
		uTime: { value: 0 },
		uFlick: { value: 1 },
		uAlpha: { value: bladeAlpha },
		uAmb: { value: new T.Vector3(todP.amb[0], todP.amb[1], todP.amb[2]) },
		uFogC: { value: new T.Color(todP.fog) }
	};
	const grassMat = new T.ShaderMaterial({
		uniforms: grassUni,
		side: T.DoubleSide,
		transparent: false,
		vertexShader: `
              uniform float uTime;
              varying vec2 vUv;
              varying vec3 vWorld;
              varying float vRnd;
              void main() {
                vUv = uv;
                vec4 p = vec4(position, 1.0);
                vec2 iorigin = vec2(0.0);
                #ifdef USE_INSTANCING
                  p = instanceMatrix * p;
                  iorigin = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
                #endif
                vec4 w = modelMatrix * p;
                float sway = uv.y * uv.y;
                float wind = sin(uTime * 1.6 + w.x * 1.4 + w.z * 1.1) * 0.06
                           + sin(uTime * 3.9 + w.x * 3.0 + w.z * 2.2) * 0.022;
                w.x += wind * sway;
                w.z += wind * 0.6 * sway;
                vRnd = fract(sin(dot(iorigin, vec2(12.9898, 78.233))) * 43758.5453);
                vWorld = w.xyz;
                gl_Position = projectionMatrix * viewMatrix * w;
              }`,
		fragmentShader: `
              uniform sampler2D uAlpha;
              uniform float uFlick;
              uniform vec3 uAmb;
              uniform vec3 uFogC;
              varying vec2 vUv;
              varying vec3 vWorld;
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
                vec3 lit = col * (uAmb + vec3(1.0, 0.52, 0.18) * glow * 2.8);
                float camD = distance(vWorld, cameraPosition);
                float fogF = clamp(1.0 - exp(-pow(camD * 0.115, 2.0)), 0.0, 1.0);
                lit = mix(lit, uFogC, fogF);
                gl_FragColor = vec4(lit, 1.0);
              }`
	});
	const bladeGeoG = new T.PlaneGeometry(0.3, 0.34, 1, 3);
	bladeGeoG.translate(0, 0.17, 0);
	const GRASS_N = lite ? 3200 : 5200;
	const grass = new T.InstancedMesh(bladeGeoG, grassMat, GRASS_N);
	const dummy = new T.Object3D();
	// keep blades out of the seat logs' footprint (axis-segment distance test)
	const nearLog = function (x: number, z: number) {
		const logs = [
			[0.72, 1.5, 0.35],
			[-1.35, 1.1, -0.6]
		];
		for (let li = 0; li < 2; li++) {
			const L = logs[li],
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
		new T.MeshStandardMaterial({ map: barkTex, bumpMap: barkTex, bumpScale: 0.03, color: 0xc09468, roughness: 0.82 }),
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
	spin.add(
		new T.Mesh(
			mergeGeos(trunkGeos, ['position', 'normal', 'uv', 'color']),
			new T.MeshStandardMaterial({ map: barkTex, bumpMap: barkTex, bumpScale: 0.05, roughness: 0.95, vertexColors: true })
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
              void main() { gl_FragColor = vec4(fogMix(vec3(0.007, 0.011, 0.009), vWorld, uFogD), 1.0); }`
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
			uniforms: cardUni,
			side: T.DoubleSide,
			vertexShader: `
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
                float sw = sin(uTime * 0.7 + aInfo.x * 1.7 + aInfo.y * 1.3 + p.y * 0.5) * 0.03
                         + sin(uTime * 2.3 + p.y * 3.0 + aInfo.w * 6.0) * 0.008;
                p.x += sw * u2 * L;
                p.z += sw * 0.6 * u2 * L;
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
                if (tx.a < 0.4) discard;
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
			}
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
			`
              float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
              float vn(vec2 p) {
                vec2 i = floor(p), f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
              }
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
                vec3 lit = col * (uAmb * ao + vec3(1.0, 0.52, 0.18) * (glow * 2.8 + pool * 2.2) * mix(0.55, 1.0, ao));
                // live embers glinting in the char bed
                vec2 ec = floor(p * 26.0);
                float em = step(0.9, h21(ec)) * smoothstep(0.32, 0.12, length(fract(p * 26.0) - 0.5)) * charM;
                lit += vec3(1.0, 0.33, 0.07) * em * (0.45 + 0.55 * sin(uTime * 2.6 + h21(ec + 3.0) * 30.0)) * 0.9;
                gl_FragColor = vec4(fogMix(lit, vWorld, uFogD), 1.0);
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
	let flick = 1;
	return function (t) {
		flick += (0.82 + Math.sin(t * 11) * 0.08 + Math.sin(t * 5.3) * 0.06 + rand() * 0.1 - flick) * 0.22;
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
		coals.forEach(function (co, i) {
			co.material.opacity = 0.55 + Math.sin(t * 7 + i * 2.1) * 0.35;
		});
		const p = (eg.attributes.position as THREE.BufferAttribute).array as Float32Array;
		for (let i = 0; i < en; i++) {
			p[i * 3 + 1] += ev[i];
			p[i * 3] += Math.sin(t * 2 + i) * 0.0018;
			if (p[i * 3 + 1] > 2.0) {
				p[i * 3 + 1] = 0;
				p[i * 3] = (rand() - 0.5) * 0.3;
				p[i * 3 + 2] = (rand() - 0.5) * 0.3;
			}
		}
		eg.attributes.position.needsUpdate = true;
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
				lf.m.material.opacity = Math.min(0.85, lf.m.material.opacity + 0.02) * Math.min(1, lf.y / 0.4);
				lf.m.position.set(lf.x + Math.sin(t * 1.3 + lf.ph) * 0.35, lf.y, lf.z);
				lf.m.rotation.set(Math.sin(t * 2 + lf.ph) * 0.8, t * 0.7 + lf.ph, Math.sin(t * 1.6 + lf.ph) * 0.6);
			}
		});
	};
}
