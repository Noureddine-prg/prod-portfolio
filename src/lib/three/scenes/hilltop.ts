// Hilltop vignette for the axelog scene (data-hill, the desktop Work column): the stump stands on
// a grassy crest in the campfire's night world — same palette, wind, flicker and moonlit haze —
// under a sky that fades to transparent at the top into the tile's own night ground.
// Not a DC section (owner-approved addition); the DC stump + axe are untouched.

import type * as THREE from 'three';
import type { SceneCtx, UpdateFn } from '../types';
import { mkCanvas, todPalette, mkWind, flickAt } from './shared';
import { mulberry32, hashSeed } from '$lib/util/rand';

export function addHilltop(ctx: SceneCtx): UpdateFn {
	const { T, scene, cam, spin, renderer, rand } = ctx;
	const { p: todP } = todPalette(ctx.variants.hour);
	const full = ctx.quality === 'full';

	renderer.toneMapping = T.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.1;
	renderer.outputEncoding = T.sRGBEncoding;
	scene.fog = new T.FogExp2(todP.fog, todP.fd);

	cam.position.set(0, 0.75, 5.6);
	cam.lookAt(0, -0.72, 0);

	// seeded like the campfire's wind, so both scenes gust on the same schedule
	const wind = mkWind(T, mulberry32(hashSeed('campfire-pass2')));
	// the campfire is just off-frame, front-left: its light rakes the near slope and the stump
	const FIRE = new T.Vector3(-2.6, 0.3, 1.9);

	// a gentle, nearly flat rise: level under the stump, easing away so the far ground sinks into the fog
	const CREST = -1.02;
	const hillY = (r: number) => CREST - 0.035 * Math.max(0, r - 0.75) ** 2;

	// --- sky: screen-space quad, night gradient, transparent toward the top edge ---
	const skyUni = {
		uZen: { value: new T.Color(todP.zen) },
		uHor: { value: new T.Color(todP.hor) },
		// fade band: a cool moonlit mist over the treeline that then dissolves (via alpha) into
		// the tile's night ground — the haze kept, without the parchment-era warm dusk
		uDusk: { value: new T.Color(todP.hor).lerp(new T.Color(0x8ea4c6), 0.32) },
		uTime: { value: 0 },
		uAspect: { value: ctx.w / ctx.h }
	};
	const sky = new T.Mesh(
		new T.PlaneGeometry(2, 2),
		new T.ShaderMaterial({
			uniforms: skyUni,
			transparent: true,
			depthWrite: false,
			vertexShader: `
              varying vec2 vUv;
              void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
			fragmentShader: `
              uniform vec3 uZen;
              uniform vec3 uHor;
              uniform vec3 uDusk;
              uniform float uTime;
              uniform float uAspect;
              varying vec2 vUv;
              float hh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
              void main() {
                float y = vUv.y;
                vec3 c = mix(uHor, uZen, smoothstep(0.3, 0.62, y));
                // the fade band turns to mist before the alpha takes it into the tile's ground
                c = mix(c, uDusk, smoothstep(0.6, 0.9, y));
                float a = 1.0 - smoothstep(0.66, 1.0, y);
                vec2 g = vec2(vUv.x * uAspect, y) * 70.0;
                vec2 cell = floor(g);
                float s = hh(cell);
                if (s > 0.972) {
                  float d = length(fract(g) - 0.5);
                  float tw = 0.55 + 0.45 * sin(uTime * (0.6 + s * 2.0) + s * 40.0);
                  c += vec3(0.8, 0.85, 0.95) * smoothstep(0.22, 0.0, d) * tw * 0.5 * (1.0 - smoothstep(0.45, 0.75, y)) * smoothstep(0.32, 0.42, y);
                }
                gl_FragColor = vec4(c * a, a);
              }`
		})
	);
	(sky.material as THREE.ShaderMaterial).blending = T.CustomBlending;
	// sky output is premultiplied (c * a)
	(sky.material as THREE.ShaderMaterial).blendSrc = T.OneFactor;
	(sky.material as THREE.ShaderMaterial).blendDst = T.OneMinusSrcAlphaFactor;
	sky.frustumCulled = false;
	sky.renderOrder = -10;
	scene.add(sky);

	// --- far treeline: pine silhouettes (tiered spikes), a shade darker than the horizon glow ---
	const ridge = new T.Shape();
	ridge.moveTo(-26, -9);
	let rx = -26;
	while (rx < 26) {
		const base = -3.0 + Math.sin(rx * 0.19) * 0.45 + Math.sin(rx * 0.53) * 0.2;
		const hgt = 0.5 + rand() * 1.0;
		const hw = 0.22 + rand() * 0.12;
		ridge.lineTo(rx, base);
		ridge.lineTo(rx + hw * 0.55, base + hgt * 0.45);
		ridge.lineTo(rx + hw * 0.35, base + hgt * 0.45);
		ridge.lineTo(rx + hw, base + hgt);
		ridge.lineTo(rx + hw * 1.65, base + hgt * 0.45);
		ridge.lineTo(rx + hw * 1.45, base + hgt * 0.45);
		rx += hw * 2;
		ridge.lineTo(rx, base);
		rx += rand() * 0.5;
	}
	ridge.lineTo(26, -9);
	const ridgeMesh = new T.Mesh(
		new T.ShapeGeometry(ridge),
		new T.ShaderMaterial({
			uniforms: { uC: { value: new T.Color(todP.hor).lerp(new T.Color(todP.zen), 0.45) } },
			vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
			fragmentShader: `uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 1.0); }`
		})
	);
	ridgeMesh.position.z = -13;
	scene.add(ridgeMesh);

	// --- moonlit haze between the treeline and the hill (the campfire's canopy haze) ---
	const softTex = new T.CanvasTexture(
		mkCanvas(128, 128, function (g, w, h) {
			const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
			gr.addColorStop(0, 'rgba(255,255,255,1)');
			gr.addColorStop(0.45, 'rgba(255,255,255,.45)');
			gr.addColorStop(1, 'rgba(255,255,255,0)');
			g.fillStyle = gr;
			g.fillRect(0, 0, w, h);
		})
	);
	const hazes: [number, number, number, number, number, number][] = [
		// x, y, z, scaleX, scaleY, opacity
		[0.4, -2.0, -8.5, 16, 2.6, 0.09],
		[-1.2, -1.15, -4.2, 9, 1.2, 0.04]
	];
	const hazeMats: THREE.SpriteMaterial[] = [];
	hazes.forEach(function (hl) {
		const hm = new T.SpriteMaterial({
			map: softTex,
			color: 0x8ea4c6,
			transparent: true,
			opacity: hl[5] * (0.45 + todP.moon * 1.3),
			fog: false,
			depthWrite: false
		});
		const hs = new T.Sprite(hm);
		hs.position.set(hl[0], hl[1], hl[2]);
		hs.scale.set(hl[3], hl[4], 1);
		scene.add(hs);
		hazeMats.push(hm);
	});

	// --- lights: firelight from off-frame, cool moon rim, faint sky fill ---
	scene.add(new T.HemisphereLight(todP.sky, 0x000000, todP.hemi * 1.4));
	const moonRim = new T.DirectionalLight(0x8fa8e0, todP.moon * 2.4);
	moonRim.position.set(3, 2.5, -3);
	scene.add(moonRim);
	// the DC scene's cool fill, dimmed to moonlight, so the stump's shadow side still reads
	const fill = new T.DirectionalLight(0x6a86ff, 0.22);
	fill.position.set(2.5, 0.8, 2);
	scene.add(fill);
	const fireLight = new T.PointLight(0xff7d2e, 1.5, 10, 1.6);
	fireLight.position.copy(FIRE);
	scene.add(fireLight);

	// --- hill ---
	const hillGeo = new T.RingGeometry(0.001, 8, 56, 28);
	hillGeo.rotateX(-Math.PI / 2);
	const hp = hillGeo.attributes.position as THREE.BufferAttribute;
	for (let i = 0; i < hp.count; i++) {
		const x = hp.getX(i), z = hp.getZ(i);
		hp.setY(i, hillY(Math.hypot(x, z)) + (rand() - 0.5) * 0.03);
	}
	hillGeo.computeVertexNormals();
	const hill = new T.Mesh(hillGeo, new T.MeshLambertMaterial({ color: 0x0c1009 }));
	spin.add(hill);

	// --- grass: the campfire's alpha-card blades + wind, far fewer of them ---
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
		uFogC: { value: new T.Color(todP.fog) },
		uFire: { value: new T.Vector2(FIRE.x, FIRE.z) }
	};
	const grassMat = new T.ShaderMaterial({
		uniforms: Object.assign(grassUni, wind.uni),
		side: T.DoubleSide,
		vertexShader:
			wind.GLSL +
			`
              uniform float uTime;
              varying vec2 vUv;
              varying vec3 vWorld;
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
		fragmentShader: `
              uniform sampler2D uAlpha;
              uniform float uFlick;
              uniform vec3 uAmb;
              uniform vec3 uFogC;
              uniform vec2 uFire;
              varying vec2 vUv;
              varying vec3 vWorld;
              varying float vGust;
              varying float vRnd;
              void main() {
                float a = texture2D(uAlpha, vUv).a;
                if (a < 0.4) discard;
                vec3 base = vec3(0.05, 0.085, 0.028);
                vec3 tipA = vec3(0.38, 0.50, 0.17);
                vec3 tipB = vec3(0.22, 0.44, 0.15);
                vec3 col = mix(base, mix(tipA, tipB, vRnd), vUv.y);
                float d = distance(vWorld.xz, uFire);
                float glow = pow(clamp(1.0 - d / 5.4, 0.0, 1.0), 1.7) * uFlick;
                vec3 lit = col * (uAmb + vec3(1.0, 0.52, 0.18) * glow * 2.8);
                lit += uAmb * vGust * vUv.y * vUv.y * 0.22;
                float camD = distance(vWorld, cameraPosition);
                float fogF = clamp(1.0 - exp(-pow(camD * 0.115, 2.0)), 0.0, 1.0);
                gl_FragColor = vec4(mix(lit, uFogC, fogF), 1.0);
              }`
	});
	const bladeGeo = new T.PlaneGeometry(0.3, 0.34, 1, 3);
	bladeGeo.translate(0, 0.17, 0);
	const GRASS_N = 1400;
	const grass = new T.InstancedMesh(bladeGeo, grassMat, GRASS_N);
	const dummy = new T.Object3D();
	let gi = 0;
	while (gi < GRASS_N) {
		const a = rand() * Math.PI * 2;
		const r = 0.84 + Math.pow(rand(), 1.2) * 4.8;
		const x = Math.cos(a) * r, z = Math.sin(a) * r;
		if (z < -3.6) continue; // fogged out past here
		const s = 0.55 + rand() * 0.6;
		dummy.position.set(x, hillY(r) - 0.02, z);
		dummy.rotation.set(0, rand() * Math.PI, (rand() - 0.5) * 0.14);
		dummy.scale.setScalar(s);
		dummy.updateMatrix();
		grass.setMatrixAt(gi++, dummy.matrix);
	}
	grass.instanceMatrix.needsUpdate = true;
	if (!full) grass.count = Math.round(GRASS_N * 0.65);
	spin.add(grass);

	// --- embers drifting over from the fire on the wind ---
	const EN = full ? 10 : 6;
	const emberTex = new T.CanvasTexture(
		mkCanvas(32, 32, function (g, w, h) {
			const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
			gr.addColorStop(0, 'rgba(255,220,150,1)');
			gr.addColorStop(0.35, 'rgba(255,140,58,.8)');
			gr.addColorStop(1, 'rgba(255,120,40,0)');
			g.fillStyle = gr;
			g.fillRect(0, 0, w, h);
		})
	);
	const eg = new T.BufferGeometry();
	const ep = new Float32Array(EN * 3);
	const eCol = new Float32Array(EN * 3);
	const eLife: number[] = [];
	const eAge: number[] = [];
	const eRise: number[] = [];
	const respawn = function (i: number, age: number) {
		ep[i * 3] = FIRE.x + (rand() - 0.5) * 0.6;
		ep[i * 3 + 1] = -0.6 + rand() * 0.3;
		ep[i * 3 + 2] = FIRE.z - 0.8 - rand() * 1.6;
		eLife[i] = 5 + rand() * 4;
		eAge[i] = age;
		eRise[i] = 0.12 + rand() * 0.12;
	};
	// start them spread along their path so the first (or only, when still) frame isn't a cluster at the fire
	for (let i = 0; i < EN; i++) {
		respawn(i, rand() * 5);
		ep[i * 3] += eAge[i] * 0.33;
		ep[i * 3 + 1] += eAge[i] * eRise[i];
		ep[i * 3 + 2] += eAge[i] * 0.08;
	}
	eg.setAttribute('position', new T.BufferAttribute(ep, 3));
	eg.setAttribute('color', new T.BufferAttribute(eCol, 3));
	const embers = new T.Points(
		eg,
		new T.PointsMaterial({
			size: 0.07,
			map: emberTex,
			vertexColors: true,
			transparent: true,
			blending: T.AdditiveBlending,
			depthWrite: false,
			fog: false
		})
	);
	embers.frustumCulled = false;
	scene.add(embers);

	let flick = flickAt(0, 0);
	let lastT = -1;
	return function (t, dt) {
		wind.update(t);
		const fdt = Math.min(dt || 0, 0.05);
		const fTarget = flickAt(t, wind.gustAt(FIRE.x, FIRE.z, 0.6));
		flick += Math.max(-0.03, Math.min(0.03, (fTarget - flick) * Math.min(1, Math.max(fdt, 0.016) * 14)));
		fireLight.intensity = (1.2 * flick + 0.3) * todP.fire;
		grassUni.uTime.value = t;
		grassUni.uFlick.value = (0.7 + flick * 0.5) * todP.fire;
		skyUni.uTime.value = t;
		hazeMats[0].opacity = hazes[0][5] * (0.45 + todP.moon * 1.3) * (0.85 + 0.15 * Math.sin(t * 0.22));

		const step = t !== lastT ? fdt : 0;
		lastT = t;
		for (let i = 0; i < EN; i++) {
			const i3 = i * 3;
			eAge[i] += step;
			if (eAge[i] > eLife[i]) respawn(i, 0);
			const age = eAge[i];
			const k = age / eLife[i];
			const x0 = ep[i3], z0 = ep[i3 + 2];
			const drift = wind.DIR[0] * (wind.breezeAt(x0, z0, t) * 0.35 + wind.gustAt(x0, z0, 0.4) * 1.2) * step;
			ep[i3] += drift + Math.sin(t * 1.3 + i) * 0.002;
			ep[i3 + 1] += eRise[i] * step;
			ep[i3 + 2] += wind.DIR[1] * drift;
			const glowK = Math.sin(Math.PI * Math.min(1, k)) * (0.7 + 0.3 * Math.sin(t * 7 + i * 1.7)) * todP.ff;
			eCol[i3] = 1.0 * glowK;
			eCol[i3 + 1] = 0.55 * glowK;
			eCol[i3 + 2] = 0.2 * glowK;
		}
		eg.attributes.position.needsUpdate = true;
		eg.attributes.color.needsUpdate = true;
	};
}
