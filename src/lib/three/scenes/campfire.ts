// Campfire hero scene — DC `kind === 'campfire'` branch (L1409–2191) ported verbatim onto
// the SceneCtx contract. NOISE_GLSL / FLAME_VERT / FLAME_FRAG / mkFlame / mkCanvas come
// from ./shared (they were window.__DC_* globals in the DC file). All build-time and
// runtime randomness goes through ctx.rand (seeded) instead of Math.random.
//
// Build ORDER is load-bearing: everything added to `spin` before the freeze traverse
// (DC L2051) gets `matrixAutoUpdate = false` (flameA/B re-exempted); the sky pack
// (stars, moon, clouds, shooting star), mists and leaves are added AFTER and stay auto.

import type * as THREE from 'three';
import type { SceneCtx, UpdateFn } from '../types';
import { mkFlame, mkCanvas } from './shared';

export function buildCampfire(ctx: SceneCtx): UpdateFn | null {
	const { T, scene, cam, spin, renderer } = ctx;
	const rand = ctx.rand;

	renderer.toneMapping = T.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.25;
	renderer.outputEncoding = T.sRGBEncoding;
	const lite = ctx.variants.lite;
	const hr = ctx.variants.hour; // DC L1415 data-hour / ?hour= / local hour, resolved upstream
	const TOD = hr >= 20 || hr < 6 ? 'night' : hr < 12 ? 'dawn' : 'dusk';
	const todP = {
		night: { bg: 0x060302, fog: 0x0a0502, fd: 0.115, sky: 0x1c2a44, hemi: 0.3, moon: 0.42, fire: 1.0, ff: 1.0, amb: [0.15, 0.19, 0.27] },
		dawn: { bg: 0x2a2233, fog: 0x2e2436, fd: 0.095, sky: 0x8a6a72, hemi: 0.75, moon: 0.2, fire: 0.6, ff: 0.25, amb: [0.34, 0.28, 0.33] },
		dusk: { bg: 0x33222a, fog: 0x3a262c, fd: 0.095, sky: 0xc8784a, hemi: 0.7, moon: 0.15, fire: 0.8, ff: 0.55, amb: [0.4, 0.29, 0.27] }
	}[TOD];
	scene.fog = new T.FogExp2(todP.fog, todP.fd);
	scene.background = new T.Color(todP.bg);
	cam.position.set(0, 1.5, 5.8);
	cam.lookAt(lite ? 0.55 : 0, 0.72, 0);
	// camera is fixed: cull scatter that can never enter the widest crop (+parallax margin)
	const inView = function (x: number, z: number, extra?: number) {
		const dz = z - 5.8;
		if (dz > -0.3) return false;
		return Math.atan2(Math.abs(x), -dz) < 0.84 + (extra || 0);
	};

	// --- procedural textures ---
	const groundTex = new T.CanvasTexture(
		mkCanvas(512, 512, function (g, w, h) {
			g.fillStyle = '#1c1006';
			g.fillRect(0, 0, w, h);
			// large soft tonal patches for unevenness
			for (let i = 0; i < 26; i++) {
				const x = rand() * w, y = rand() * h, r = 30 + rand() * 90;
				const gr = g.createRadialGradient(x, y, 0, x, y, r);
				const dark = rand() < 0.5;
				gr.addColorStop(0, dark ? 'rgba(8,4,1,.28)' : 'rgba(64,42,18,.16)');
				gr.addColorStop(1, 'rgba(0,0,0,0)');
				g.fillStyle = gr;
				g.beginPath();
				g.arc(x, y, r, 0, Math.PI * 2);
				g.fill();
			}
			for (let i = 0; i < 9000; i++) {
				const x = rand() * w, y = rand() * h, a = rand() * Math.PI;
				g.strokeStyle = 'hsl(' + (24 + rand() * 26) + ',46%,' + (13 + rand() * 27) + '%)';
				g.lineWidth = 1 + rand();
				g.beginPath();
				g.moveTo(x, y);
				g.lineTo(x + Math.cos(a) * (3 + rand() * 8), y + Math.sin(a) * (3 + rand() * 8));
				g.stroke();
			}
			// fine grain speckle
			for (let i = 0; i < 26000; i++) {
				const x = rand() * w, y = rand() * h;
				const l = rand();
				g.fillStyle =
					l < 0.55
						? 'rgba(0,0,0,' + (0.12 + rand() * 0.2) + ')'
						: 'hsla(' + (26 + rand() * 24) + ',42%,' + (22 + rand() * 30) + '%,' + (0.14 + rand() * 0.22) + ')';
				g.fillRect(x, y, 1, 1);
			}
			// pebbles
			for (let i = 0; i < 170; i++) {
				const x = rand() * w, y = rand() * h, r = 1.2 + rand() * 3.2, a = rand() * Math.PI;
				const li = 16 + rand() * 22;
				g.save();
				g.translate(x, y);
				g.rotate(a);
				g.fillStyle = 'hsl(' + (22 + rand() * 18) + ',18%,' + li + '%)';
				g.beginPath();
				g.ellipse(0, 0, r, r * (0.55 + rand() * 0.3), 0, 0, Math.PI * 2);
				g.fill();
				g.fillStyle = 'hsla(' + (26 + rand() * 18) + ',22%,' + (li + 14) + '%,.6)';
				g.beginPath();
				g.ellipse(-r * 0.22, -r * 0.24, r * 0.45, r * 0.26, 0, 0, Math.PI * 2);
				g.fill();
				g.restore();
			}
		})
	);
	groundTex.wrapS = groundTex.wrapT = T.RepeatWrapping;
	groundTex.repeat.set(5, 5);
	groundTex.encoding = T.sRGBEncoding;
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
	// organic rock geometry: subdivided icosahedron with noise displacement
	const mkRockGeo = function (r: number) {
		const g = new T.IcosahedronGeometry(r, 1);
		const p = g.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
			const n =
				1 + (Math.sin(x * 21.7) + Math.cos(y * 17.3) + Math.sin(z * 25.1)) * 0.09 + (rand() - 0.5) * 0.1;
			p.setXYZ(i, x * n, y * n * 0.72, z * n);
		}
		g.computeVertexNormals();
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

	// --- uneven textured ground ---
	const gGeo = new T.CircleGeometry(13, 48);
	gGeo.rotateX(-Math.PI / 2);
	{
		const p = (gGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
		for (let i = 0; i < p.length; i += 3) {
			const d = Math.hypot(p[i], p[i + 2]);
			if (d > 1.2) p[i + 1] = (rand() - 0.5) * 0.14 * Math.min(1, d / 4);
		}
		gGeo.computeVertexNormals();
	}
	spin.add(
		new T.Mesh(
			gGeo,
			new T.MeshStandardMaterial({ map: groundTex, bumpMap: groundTex, bumpScale: 0.14, roughness: 1, metalness: 0 })
		)
	);
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

	// --- close trees: warped bark trunks + dark canopy blobs ---
	const trunkMat = new T.MeshStandardMaterial({
		map: barkTex,
		bumpMap: barkTex,
		bumpScale: 0.05,
		color: 0x9a7c5e,
		roughness: 0.95
	});
	const darkTrunkMat = new T.MeshStandardMaterial({
		map: barkTex,
		bumpMap: barkTex,
		bumpScale: 0.04,
		color: 0x3a2e22,
		roughness: 1
	});
	const folMat = new T.MeshStandardMaterial({ color: 0x1a2b1c, roughness: 1, flatShading: true });
	const folMatDark = new T.MeshStandardMaterial({ color: 0x0c1409, roughness: 1, flatShading: true });
	// stacked jagged pine tier (low-poly cone, base ring jittered)
	const mkTier = function (r: number, h: number, mat: THREE.Material) {
		const cg = new T.ConeGeometry(r, h, 8, 1);
		const p = (cg.attributes.position as THREE.BufferAttribute).array as Float32Array;
		for (let i = 0; i < p.length; i += 3) {
			if (p[i + 1] < 0) {
				const jr = 1 + (rand() - 0.5) * 0.3;
				p[i] *= jr;
				p[i + 2] *= jr;
				p[i + 1] += (rand() - 0.5) * h * 0.14;
			}
		}
		cg.computeVertexNormals();
		return new T.Mesh(cg, mat);
	};
	const mkTree = function (x: number, z: number, s: number, lean: number, dark?: boolean) {
		const g = new T.Group();
		const th = 5.5 * s * (0.78 + rand() * 0.5);
		const tg = new T.CylinderGeometry(0.11 * s, 0.22 * s, th, 9, 7);
		{
			const p = (tg.attributes.position as THREE.BufferAttribute).array as Float32Array;
			for (let i = 0; i < p.length; i += 3) {
				const k = p[i + 1] / th + 0.5;
				p[i] += Math.sin(k * 9 + x) * 0.035 * s;
				p[i + 2] += Math.cos(k * 7 + z) * 0.035 * s;
			}
			tg.computeVertexNormals();
		}
		const trunk = new T.Mesh(tg, dark ? darkTrunkMat : trunkMat);
		trunk.position.y = th / 2;
		g.add(trunk);
		// pine canopy: overlapping tapered tiers, wide at base, spire at top
		const mat = dark ? folMatDark : folMat;
		const tiers = 8;
		const y0 = th * 0.34, y1 = th * 1.02;
		for (let k = 0; k < tiers; k++) {
			const f = k / (tiers - 1);
			const r = (1.1 - f * 0.78) * s;
			const h = (1.55 - f * 0.5) * s;
			const tier = mkTier(r, h, mat);
			tier.position.set((rand() - 0.5) * 0.06 * s, y0 + (y1 - y0) * f, (rand() - 0.5) * 0.06 * s);
			tier.rotation.y = rand() * Math.PI;
			g.add(tier);
		}
		g.position.set(x, 0, z);
		g.rotation.z = lean;
		spin.add(g);
	};
	const treeDefs: [number, number, number, number, boolean?][] = [
		[-1.25, -1.6, 1.0, 0.05], [1.35, -1.9, 1.15, -0.04], [-1.95, -3.2, 1.3, 0.02], [2.1, -3.4, 1.2, -0.06], [0.7, -4.6, 1.1, 0.03], [-3.3, -0.6, 1.2, 0.04], [3.3, -0.2, 1.35, -0.02], [-2.6, 1.6, 1.1, -0.05, true], [2.8, 1.9, 1.25, 0.05, true],
		[-4.4, -6.2, 1.7, 0.03, true], [3.9, -5.8, 1.6, -0.04, true], [-1.3, -7.4, 1.85, 0.02, true], [1.7, -8.0, 1.8, -0.02, true], [-6.2, -8.5, 2.0, 0.04, true], [6.0, -8.2, 1.95, -0.03, true]
	];
	(lite
		? treeDefs.filter(function (d, i) {
				return i % 2 === 0;
			})
		: treeDefs
	).forEach(function (d) {
		if (inView(d[0], d[1], 1.6 * d[2])) mkTree(d[0], d[1], d[2], d[3], d[4]);
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

	// --- fire kit (procedural fallback; replaced by GLB model when it loads) ---
	const fireKit = new T.Group();
	spin.add(fireKit);
	const stoneMat = new T.MeshStandardMaterial({
		map: rockTex,
		bumpMap: rockTex,
		bumpScale: 0.02,
		color: 0x9a8672,
		roughness: 0.96,
		flatShading: true
	});
	for (let i = 0; i < 15; i++) {
		const a = (i / 15) * Math.PI * 2 + 0.3;
		const st = new T.Mesh(mkRockGeo(0.115 + rand() * 0.035), stoneMat);
		st.position.set(Math.cos(a) * 0.6, 0.05, Math.sin(a) * 0.6);
		st.rotation.set(rand() * 0.6, rand() * Math.PI, rand() * 0.6);
		st.scale.y = 0.65;
		fireKit.add(st);
	}

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
	// bushes hugging the tree line
	const bushMat = new T.MeshStandardMaterial({ color: 0x0e150a, roughness: 1, flatShading: true });
	for (let i = 0; i < 12; i++) {
		const a = rand() * Math.PI * 2;
		const r = 2.6 + rand() * 2.6;
		const bx = Math.cos(a) * r,
			bz = Math.sin(a) * r;
		if (bz > 2.4 || !inView(bx, bz, 0.1)) continue;
		const bush = new T.Group();
		const n = 2 + Math.floor(rand() * 3);
		for (let k = 0; k < n; k++) {
			const b = new T.Mesh(new T.IcosahedronGeometry(0.16 + rand() * 0.16, 1), bushMat);
			b.position.set((rand() - 0.5) * 0.4, 0.08 + rand() * 0.1, (rand() - 0.5) * 0.4);
			b.scale.y = 0.6;
			bush.add(b);
		}
		bush.position.set(bx, 0, bz);
		spin.add(bush);
		clumpPts.push([bx, bz, 0.55]);
	}
	// scattered twigs & pebbles
	const twigMat = new T.MeshStandardMaterial({ color: 0x2e2013, roughness: 1 });
	for (let i = 0; i < 14; i++) {
		const a = rand() * Math.PI * 2,
			r = 1.2 + rand() * 3.4;
		const tw = new T.Mesh(
			new T.CylinderGeometry(0.008 + rand() * 0.007, 0.012 + rand() * 0.008, 0.2 + rand() * 0.35, 5),
			twigMat
		);
		if (!inView(Math.cos(a) * r, Math.sin(a) * r, 0)) continue;
		tw.position.set(Math.cos(a) * r, 0.015, Math.sin(a) * r);
		tw.rotation.set(Math.PI / 2, 0, rand() * Math.PI);
		spin.add(tw);
	}
	for (let i = 0; i < 24; i++) {
		const a = rand() * Math.PI * 2,
			r = 0.9 + rand() * 3.6;
		const pb = new T.Mesh(mkRockGeo(0.02 + rand() * 0.035), stoneMat);
		if (!inView(Math.cos(a) * r, Math.sin(a) * r, 0)) continue;
		pb.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r);
		pb.rotation.set(rand(), rand(), rand());
		spin.add(pb);
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
		gGlowMat.opacity = (0.34 * flick + 0.1) * fmul;
		grassUni.uTime.value = t;
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
