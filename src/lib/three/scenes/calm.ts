// Calm/ocean scene — sunset sea + airplane-window wing, verbatim port of the DC `kind === 'calm'`.
// Everything parents to `scene` (not `spin`); the wing/contrail parent to the camera. spins.calm = 0.
/* eslint-disable prefer-template */

import type * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { SceneCtx, UpdateFn } from '../types';

// Lazy-load the A320 GLB (Mauro3D, CC-BY 4.0) and graft its starboard wing into the
// cam-child wgrp. Dynamic import so mobile/tiles/first-paint never pull the loader or model.
async function loadWing(ctx: SceneCtx, wgrp: THREE.Group): Promise<void> {
	const { T, cam, scene } = ctx;
	let gltf: GLTF;
	try {
		const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
		gltf = await new GLTFLoader().loadAsync(import.meta.env.BASE_URL + 'models/a320.glb');
	} catch {
		return; // no loader/model — porthole just shows ocean
	}
	if (!wgrp.parent) return; // scene disposed mid-load

	// crop the starboard wing from the single combined airframe mesh: triangles whose centroid
	// is outboard of the fuselage and within the wing chord (raw glTF axes: x=span, z=nose→tail,
	// y=up). Drops fuselage, far wing, tail; the underslung nacelle rides along.
	const inWing = (x: number, z: number) => x > 130 && x < 1100 && z > -260 && z < 430;
	const pos: number[] = [];
	const col: number[] = [];
	gltf.scene.updateWorldMatrix(true, true);
	gltf.scene.traverse((o) => {
		const mesh = o as THREE.Mesh;
		if (!mesh.isMesh) return;
		const src = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
		const p = src.getAttribute('position') as THREE.BufferAttribute;
		const base = (mesh.material as THREE.MeshStandardMaterial).color ?? new T.Color(0.8, 0.8, 0.8);
		const DIM = 0.55; // dim the cream so it silhouettes against the dusk like the reference
		for (let i = 0; i < p.count; i += 3) {
			const gx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
			const gz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
			if (!inWing(gx, gz)) continue;
			for (let v = 0; v < 3; v++) {
				pos.push(p.getX(i + v), p.getY(i + v), p.getZ(i + v));
				col.push(base.r * DIM, base.g * DIM, base.b * DIM);
			}
		}
	});
	if (!pos.length) return;

	// recenter to the wing centroid so it scales/rotates about its middle; track the
	// starboard-most vertex for the nav-light
	let cx = 0,
		cy = 0,
		cz = 0;
	for (let i = 0; i < pos.length; i += 3) {
		cx += pos[i];
		cy += pos[i + 1];
		cz += pos[i + 2];
	}
	const n = pos.length / 3;
	cx /= n;
	cy /= n;
	cz /= n;
	const tip = new T.Vector3(-Infinity, 0, 0);
	for (let i = 0; i < pos.length; i += 3) {
		pos[i] -= cx;
		pos[i + 1] -= cy;
		pos[i + 2] -= cz;
		if (pos[i] > tip.x) tip.set(pos[i], pos[i + 1], pos[i + 2]);
	}
	const geo = new T.BufferGeometry();
	geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
	geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
	geo.computeVertexNormals();
	const wing = new T.Mesh(
		geo,
		new T.MeshStandardMaterial({
			vertexColors: true,
			flatShading: true,
			roughness: 0.6,
			metalness: 0.3,
			side: T.DoubleSide
		})
	);
	wing.renderOrder = 20;
	wgrp.add(wing);

	// nav-light: pulsing amber sprite pinned at the wingtip (model space)
	const navCv = document.createElement('canvas');
	navCv.width = navCv.height = 64;
	const ng = navCv.getContext('2d')!;
	const ngr = ng.createRadialGradient(32, 32, 0, 32, 32, 32);
	ngr.addColorStop(0, 'rgba(255,200,130,1)');
	ngr.addColorStop(0.35, 'rgba(255,150,80,0.55)');
	ngr.addColorStop(1, 'rgba(255,150,80,0)');
	ng.fillStyle = ngr;
	ng.fillRect(0, 0, 64, 64);
	const navLight = new T.Sprite(
		new T.SpriteMaterial({
			map: new T.CanvasTexture(navCv),
			color: 0xffb36b,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			blending: T.AdditiveBlending
		})
	);
	navLight.position.copy(tip);
	navLight.scale.setScalar(70); // model units; scaled down with the group
	navLight.renderOrder = 30;
	wgrp.add(navLight);
	wgrp.userData.navLight = navLight;

	// contrail wisp streaming off the wingtip, re-anchored in camera space each frame
	const cCv = document.createElement('canvas');
	cCv.width = 256;
	cCv.height = 32;
	const cg = cCv.getContext('2d')!;
	const cgr = cg.createLinearGradient(0, 0, 256, 0);
	cgr.addColorStop(0, 'rgba(255,255,255,0.85)');
	cgr.addColorStop(0.25, 'rgba(255,255,255,0.45)');
	cgr.addColorStop(1, 'rgba(255,255,255,0)');
	cg.fillStyle = cgr;
	cg.beginPath();
	cg.ellipse(128, 16, 128, 5, 0, 0, Math.PI * 2);
	cg.fill();
	const trail = new T.Sprite(
		new T.SpriteMaterial({
			map: new T.CanvasTexture(cCv),
			transparent: true,
			depthWrite: false,
			depthTest: false,
			opacity: 0.4
		})
	);
	trail.renderOrder = 45;
	cam.add(trail);
	wgrp.userData.contrail = trail;

	// lights: key travels with the camera (light metallic top), warm bounce from the sea below
	const wKey = new T.DirectionalLight(0xfff0d8, 1.0);
	wKey.position.set(0, 3, 2);
	cam.add(wKey);
	const bounce = new T.DirectionalLight(0xe8a05f, 0.5);
	bounce.position.set(0.5, -3, 2.5);
	scene.add(bounce);
	wgrp.userData.key = wKey;
	wgrp.userData.bounce = bounce;

	// anchor into the cam-child porthole framing (tuned so the wing sweeps away toward the
	// winglet with the nacelle visible under it); base rot Z is the sway pivot
	// porthole framing tuned to the hand-built reference: root low, wing narrow and near-
	// vertical, tip rising toward center, top edge catching light, sunset/ocean above
	const BASE_RZ = 1.45;
	wgrp.scale.setScalar(0.011);
	wgrp.position.set(0.0, -1.3, -7);
	wgrp.rotation.set(-1.35, 0.2, BASE_RZ);
	wgrp.userData.baseRotZ = BASE_RZ;
}

export function buildCalm(ctx: SceneCtx): UpdateFn {
	const { T, scene, cam, variants, rand } = ctx;

	// sunset sea — copied from the other portfolio's Home hero (sun, water)
	// airplane-window vantage: high altitude, looking down over a cloud deck to the horizon
	cam.position.set(0, 7.5, 7.2);
	cam.fov = 62;
	cam.updateProjectionMatrix();
	cam.lookAt(0, 1.6, -7);
	// dusk sky gradient (from the source hero's background)
	const skyCv = document.createElement('canvas');
	skyCv.width = 8;
	skyCv.height = 256;
	const sg2 = skyCv.getContext('2d')!;
	const sgr = sg2.createLinearGradient(0, 0, 0, 256);
	sgr.addColorStop(0, '#140e12');
	sgr.addColorStop(0.55, '#241428');
	sgr.addColorStop(0.76, '#43223a');
	sgr.addColorStop(0.87, '#7a3b3a');
	sgr.addColorStop(0.94, '#c8703f');
	sgr.addColorStop(1, '#e2954f');
	sg2.fillStyle = sgr;
	sg2.fillRect(0, 0, 8, 256);
	const sky = new T.Mesh(
		new T.PlaneGeometry(34, 26),
		new T.MeshBasicMaterial({ map: new T.CanvasTexture(skyCv) })
	);
	sky.position.set(0, 12.4, -12);
	scene.add(sky);
	// widen the backdrop for wide/short canvases (mobile banner) so the frustum never sees past it
	// (the DC's `skyClouds` deck rescale is omitted — the deck itself was removed upstream)
	const fitBackdrop = () => {
		const need = (Math.tan((cam.fov * Math.PI) / 360) / cam.zoom) * cam.aspect * 13 * 2.35;
		const s = Math.max(1, need / 34);
		sky.scale.set(s, 1, 1);
		sea.scale.x = Math.max(1, s * 0.95);
	};
	// stars in the upper sky
	const stN = 60,
		stG = new T.BufferGeometry(),
		stP = new Float32Array(stN * 3);
	for (let i = 0; i < stN; i++) {
		stP[i * 3] = (rand() - 0.5) * 26;
		stP[i * 3 + 1] = 5 + rand() * 16;
		stP[i * 3 + 2] = -11.8;
	}
	stG.setAttribute('position', new T.BufferAttribute(stP, 3));
	const stM = new T.PointsMaterial({
		color: 0xfff5e8,
		size: 0.06,
		transparent: true,
		opacity: 0.6,
		depthWrite: false
	});
	scene.add(new T.Points(stG, stM));
	// shooting star above the purple band, random intervals
	const shCv = document.createElement('canvas');
	shCv.width = 128;
	shCv.height = 8;
	const shg = shCv.getContext('2d')!;
	const shgr = shg.createLinearGradient(0, 0, 128, 0);
	shgr.addColorStop(0, 'rgba(255,250,240,0)');
	shgr.addColorStop(0.8, 'rgba(255,250,240,0.7)');
	shgr.addColorStop(1, 'rgba(255,255,255,1)');
	shg.fillStyle = shgr;
	shg.fillRect(0, 0, 128, 8);
	const shSpr = new T.Sprite(
		new T.SpriteMaterial({
			map: new T.CanvasTexture(shCv),
			transparent: true,
			opacity: 0,
			depthWrite: false,
			blending: T.AdditiveBlending
		})
	);
	shSpr.scale.set(1.6, 0.05, 1);
	scene.add(shSpr);
	const shoot2 = { m: shSpr, t0: -1, next: 8 + rand() * 12 };
	// the setting sun — layered gradient sprites (halo, corona, disc, hot core)
	const mkGlow = function (stops: [number, string][]) {
		const cvx = document.createElement('canvas');
		cvx.width = cvx.height = 128;
		const gx = cvx.getContext('2d')!;
		const gr = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
		stops.forEach(function (s) {
			gr.addColorStop(s[0], s[1]);
		});
		gx.fillStyle = gr;
		gx.fillRect(0, 0, 128, 128);
		return new T.CanvasTexture(cvx);
	};
	const halo = new T.Sprite(
		new T.SpriteMaterial({
			map: mkGlow([
				[0, 'rgba(255,180,110,.32)'],
				[0.34, 'rgba(245,140,90,.14)'],
				[0.56, 'rgba(200,90,90,.06)'],
				[1, 'rgba(200,90,90,0)']
			]),
			transparent: true,
			depthWrite: false
		})
	);

	const disc = new T.Sprite(
		new T.SpriteMaterial({
			map: mkGlow([
				[0, '#fff6e6'],
				[0.18, '#ffe3b0'],
				[0.42, '#ffc06f'],
				[0.64, '#f59351'],
				[0.82, '#d96b3e'],
				[0.93, 'rgba(184,74,58,.5)'],
				[1, 'rgba(184,74,58,0)']
			]),
			transparent: true,
			depthWrite: false
		})
	);

	const core2 = new T.Sprite(
		new T.SpriteMaterial({
			map: mkGlow([
				[0, '#fffdf8'],
				[0.46, '#fff0d4'],
				[0.76, 'rgba(255,224,170,.4)'],
				[1, 'rgba(255,224,170,0)']
			]),
			transparent: true,
			depthWrite: false
		})
	);

	// horizon bloom
	halo.position.set(0, 0.24, -11.5);
	halo.scale.set(3.3, 2.9, 1);
	scene.add(halo);
	disc.position.set(0, 0.14, -11.4);
	disc.scale.set(1.4, 1.32, 1);
	scene.add(disc);
	core2.position.set(0, 0.17, -11.3);
	core2.scale.set(0.58, 0.54, 1);
	scene.add(core2);
	const bloom = new T.Sprite(
		new T.SpriteMaterial({
			map: mkGlow([
				[0, 'rgba(255,180,110,.42)'],
				[0.54, 'rgba(255,150,90,.08)'],
				[1, 'rgba(255,150,90,0)']
			]),
			transparent: true,
			depthWrite: false
		})
	);
	bloom.position.set(0, 0.42, -11.2);
	bloom.scale.set(13, 2.1, 1);
	scene.add(bloom);
	// sea — perlin wave shader, verbatim from the source (dusk colorway)
	const vert2 = 'uniform float uCurve; uniform float uFlat; uniform float uTime; uniform float uBigElev; uniform vec2 uBigFreq; uniform float uBigSpeed; uniform float uSmallElev; uniform float uSmallFreq; uniform float uSmallSpeed; uniform float uSmallIter; varying float vElevation; varying vec3 vNormal; varying vec3 vPosition;\nvec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}\nvec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}\nvec3 fade(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}\nfloat cnoise(vec3 P){vec3 Pi0=floor(P); vec3 Pi1=Pi0+vec3(1.0); Pi0=mod(Pi0,289.0); Pi1=mod(Pi1,289.0); vec3 Pf0=fract(P); vec3 Pf1=Pf0-vec3(1.0); vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x); vec4 iy=vec4(Pi0.yy,Pi1.yy); vec4 iz0=Pi0.zzzz; vec4 iz1=Pi1.zzzz; vec4 ixy=permute(permute(ix)+iy); vec4 ixy0=permute(ixy+iz0); vec4 ixy1=permute(ixy+iz1); vec4 gx0=ixy0/7.0; vec4 gy0=fract(floor(gx0)/7.0)-0.5; gx0=fract(gx0); vec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0); vec4 sz0=step(gz0,vec4(0.0)); gx0-=sz0*(step(0.0,gx0)-0.5); gy0-=sz0*(step(0.0,gy0)-0.5); vec4 gx1=ixy1/7.0; vec4 gy1=fract(floor(gx1)/7.0)-0.5; gx1=fract(gx1); vec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1); vec4 sz1=step(gz1,vec4(0.0)); gx1-=sz1*(step(0.0,gx1)-0.5); gy1-=sz1*(step(0.0,gy1)-0.5); vec3 g000=vec3(gx0.x,gy0.x,gz0.x); vec3 g100=vec3(gx0.y,gy0.y,gz0.y); vec3 g010=vec3(gx0.z,gy0.z,gz0.z); vec3 g110=vec3(gx0.w,gy0.w,gz0.w); vec3 g001=vec3(gx1.x,gy1.x,gz1.x); vec3 g101=vec3(gx1.y,gy1.y,gz1.y); vec3 g011=vec3(gx1.z,gy1.z,gz1.z); vec3 g111=vec3(gx1.w,gy1.w,gz1.w); vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110))); g000*=norm0.x; g010*=norm0.y; g100*=norm0.z; g110*=norm0.w; vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111))); g001*=norm1.x; g011*=norm1.y; g101*=norm1.z; g111*=norm1.w; float n000=dot(g000,Pf0); float n100=dot(g100,vec3(Pf1.x,Pf0.yz)); float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z)); float n110=dot(g110,vec3(Pf1.xy,Pf0.z)); float n001=dot(g001,vec3(Pf0.xy,Pf1.z)); float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z)); float n011=dot(g011,vec3(Pf0.x,Pf1.yz)); float n111=dot(g111,Pf1); vec3 f=fade(Pf0); vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),f.z); vec2 n_yz=mix(n_z.xy,n_z.zw,f.y); return 2.2*mix(n_yz.x,n_yz.y,f.x);}\nfloat waveElevation(vec3 p){ vec2 q = p.xz + vec2(-uTime*0.55, uTime*0.08); float e = cnoise(vec3(q.x*uBigFreq.x*0.45, q.y*uBigFreq.y*0.45, uTime*uBigSpeed*0.3)) * uBigElev * 1.4; e += cnoise(vec3(q.x*uBigFreq.x*0.16 + 7.3, q.y*uBigFreq.y*0.16, uTime*uBigSpeed*0.18)) * uBigElev * 0.9; for(float i=1.0;i<=3.0;i++){ e -= abs(cnoise(vec3(q*uSmallFreq*i, uTime*uSmallSpeed)) * uSmallElev / i); } return e; }\nvoid main(){ vec4 mp = modelMatrix * vec4(position,1.0); float shift=0.01; vec3 a = mp.xyz + vec3(shift,0.0,0.0); vec3 b = mp.xyz + vec3(0.0,0.0,-shift); float eRaw = waveElevation(mp.xyz); float ea = waveElevation(a); float eb = waveElevation(b); float hfade = 1.0 - uFlat*smoothstep(-5.0,-10.5,mp.z)*0.8; float e = eRaw * hfade; ea *= hfade; eb *= hfade; mp.y += e - pow(mp.x/14.0,2.0)*uCurve*smoothstep(-2.0,11.0,-mp.z); a.y += ea; b.y += eb; vec3 toA = normalize(a - mp.xyz); vec3 toB = normalize(b - mp.xyz); vNormal = cross(toA,toB); gl_Position = projectionMatrix * viewMatrix * mp; vElevation = eRaw; vPosition = mp.xyz; }';
	const frag2 = 'uniform vec3 uDepthColor; uniform vec3 uMidColor; uniform vec3 uSurfaceColor; uniform float uColorOffset; uniform float uColorMultiplier; uniform float uTime; varying float vElevation; varying vec3 vNormal; varying vec3 vPosition;\nvoid main(){ float m = (vElevation + uColorOffset) * uColorMultiplier; m = smoothstep(0.0,1.0,m); vec3 color = m < 0.5 ? mix(uDepthColor, uMidColor, smoothstep(0.0,0.5,m)) : mix(uMidColor, uSurfaceColor, smoothstep(0.5,1.0,m)); vec3 n = normalize(vNormal); vec3 ld = normalize(vec3(0.0,1.0,-0.7)); float diff = max(dot(n,ld),0.0); color *= (0.5 + 0.65*diff); float cg = 1.0 - smoothstep(0.0, 1.9, abs(vPosition.x)); vec3 cool = uMidColor * 0.82 + vec3(0.01,0.03,0.07); color = mix(cool, color, 0.42 + 0.58*cg); color += uSurfaceColor * pow(m,3.0) * 0.55 * cg;\n// fresnel sky reflection: grazing angles pick up dusk sky color (threejs-water idea)\nvec3 vd = normalize(cameraPosition - vPosition); float fres = pow(1.0 - max(dot(n, vd), 0.0), 3.0); color = mix(color, vec3(0.32,0.16,0.2), fres * 0.3);\n// specular sun glints: sharp highlight from the low sun direction\nvec3 sunDir = normalize(vec3(0.0, 0.16, -1.0)); vec3 hv = normalize(sunDir + vd); float spec = pow(max(dot(n, hv), 0.0), 60.0); float trail = 1.0 - smoothstep(0.0, 1.6, abs(vPosition.x)); color += vec3(1.0,0.72,0.42) * spec * (0.18 + 0.75 * trail);\nfloat horizonGlow = smoothstep(-6.0, -11.0, vPosition.z) * (1.0 - smoothstep(0.0, 2.6, abs(vPosition.x))); color += uSurfaceColor * horizonGlow * 0.9; float hb = smoothstep(-7.0, -11.6, vPosition.z); color = mix(color, uSurfaceColor, hb * (0.35 + 0.5*cg));\n// atmospheric haze: distance fades the water into warm fog regardless of trail\nfloat fogd = smoothstep(-4.0, -11.5, vPosition.z); color = mix(color, vec3(0.82,0.6,0.46), fogd * 0.32); float side = 1.0 - smoothstep(15.0, 17.5, abs(vPosition.x)); gl_FragColor = vec4(color, 0.97 * side); }';
	const seaMat = new T.ShaderMaterial({
		vertexShader: vert2,
		fragmentShader: frag2,
		transparent: true,
		uniforms: {
			uTime: { value: 0 },
			// wide tile/strip crops (nowing) get a near-flat, calm horizon; the tall
			// porthole keeps the full earth-curve art
			uCurve: { value: variants.nowing ? 0.9 : 1.7 },
			uFlat: { value: variants.nowing ? 1 : 0 },
			uBigElev: { value: 0.035 },
			uBigFreq: { value: new T.Vector2(3.2, 4.8) },
			uBigSpeed: { value: 0.7 },
			uSmallElev: { value: 0.032 },
			uSmallFreq: { value: 6.2 },
			uSmallSpeed: { value: 0.45 },
			uSmallIter: { value: 4 },
			uDepthColor: { value: new T.Color('#061a2a') },
			uMidColor: { value: new T.Color('#24444f') },
			uSurfaceColor: { value: new T.Color('#d99a4f') },
			uColorOffset: { value: 0.16 },
			uColorMultiplier: { value: 4.5 }
		}
	});
	const sea = new T.Mesh(new T.PlaneGeometry(36, 26, 240, 150), seaMat);
	sea.rotation.x = -Math.PI * 0.5;
	sea.position.z = -4; // far edge meets the sky plane — no gap at the horizon
	scene.add(sea);
	// curved horizon haze — a bowed band of warm fog where sea meets sky (earth curve + atmosphere)
	const hzCv = document.createElement('canvas');
	hzCv.width = 512;
	hzCv.height = 160;
	{
		const hg = hzCv.getContext('2d')!;
		// curved band: arc bows gently upward at center
		for (let k = 0; k < 3; k++) {
			hg.save();
			hg.beginPath();
			hg.ellipse(256, 400, 470, 330 - k * 10, 0, Math.PI * 1.15, Math.PI * 1.85);
			hg.lineWidth = 60 - k * 14;
			const grad = hg.createLinearGradient(0, 40, 0, 160);
			grad.addColorStop(0, 'rgba(226,160,110,0)');
			grad.addColorStop(0.5, 'rgba(230,170,125,' + (0.16 + k * 0.1) + ')');
			grad.addColorStop(1, 'rgba(214,150,120,' + (0.1 + k * 0.08) + ')');
			hg.strokeStyle = grad;
			hg.stroke();
			hg.restore();
		}
	}
	const hzTex = new T.CanvasTexture(hzCv);
	const haze = new T.Sprite(
		new T.SpriteMaterial({ map: hzTex, transparent: true, opacity: 0.9, depthWrite: false })
	);
	haze.position.set(0, 0.85, -11.1);
	haze.scale.set(30, 3.4, 1);
	scene.add(haze);
	scene.add(new T.AmbientLight(0xffe6c0, 0.6));
	const dl2 = new T.DirectionalLight(0xffd9a0, 1.25);
	dl2.position.set(-1, 2, 1.4);
	scene.add(dl2);
	// [wing] the passenger-window wing is the real A320 GLB (Mauro3D, CC-BY 4.0), cropped to
	// the starboard wing and lazy-loaded only for the wing-visible porthole (see loadWing).
	scene.add(cam);
	const wgrp = new T.Group();
	cam.add(wgrp);
	if (variants.nowing) {
		wgrp.visible = false;
		cam.zoom = variants.sunzoom ? 6.5 : 2.7;
		cam.position.y += variants.sunzoom ? 1.4 : 0.35;
		cam.updateProjectionMatrix();
	} else {
		// wing-visible porthole only: lazy-load the A320 GLB + GLTFLoader off the main path
		void loadWing(ctx, wgrp);
	}
	// near islands passing below the plane — flat blobs on the water, fast parallax for height cue
	const mkIsleTop = function (seed: number) {
		const icv = document.createElement('canvas');
		icv.width = icv.height = 128;
		const g = icv.getContext('2d')!;
		const rnd = function (n: number) {
			const v = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
			return v - Math.floor(v);
		};
		const cx = 64,
			cy = 64;
		const pts: [number, number][] = [];
		for (let a = 0; a < 12; a++) {
			const ang = (a / 12) * Math.PI * 2;
			const r = 26 + rnd(a) * 26;
			pts.push([cx + Math.cos(ang) * r * 1.4, cy + Math.sin(ang) * r * 0.8]);
		}
		g.beginPath();
		g.moveTo(pts[0][0], pts[0][1]);
		for (let a = 1; a <= 12; a++) {
			const p = pts[a % 12],
				q = pts[(a + 1) % 12];
			g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
		}
		g.closePath();
		g.fillStyle = '#b9a077';
		g.fill(); // sand rim
		g.save();
		g.clip();
		g.translate(cx, cy);
		g.scale(0.82, 0.78);
		g.translate(-cx, -cy);
		g.beginPath();
		g.moveTo(pts[0][0], pts[0][1]);
		for (let a = 1; a <= 12; a++) {
			const p = pts[a % 12],
				q = pts[(a + 1) % 12];
			g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
		}
		g.closePath();
		g.fillStyle = '#39412c';
		g.fill(); // vegetation
		for (let b = 0; b < 5; b++) {
			g.fillStyle = b % 2 ? '#2e3524' : '#465033';
			g.beginPath();
			g.ellipse(
				30 + rnd(b + 20) * 68,
				40 + rnd(b + 30) * 48,
				7 + rnd(b + 40) * 10,
				5 + rnd(b + 50) * 7,
				rnd(b) * 3,
				0,
				Math.PI * 2
			);
			g.fill();
		}
		g.restore();
		return new T.CanvasTexture(icv);
	};
	interface NearIsle {
		s: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
		lane: number;
		far: number;
		next: number;
		active: boolean;
		v: number;
		preseed?: number | null;
		born?: number;
	}
	const nearIsles: NearIsle[] = [];
	// 28 islands in fixed depth lanes, biased toward the foreground with a few mid-water
	for (let i = 0; i < 28; i++) {
		const m = new T.Mesh(
			new T.PlaneGeometry(1, 0.7),
			new T.MeshBasicMaterial({
				map: mkIsleTop(i * 3 + 1),
				transparent: true,
				opacity: 0,
				depthWrite: false
			})
		);
		m.rotation.x = -Math.PI / 2;
		m.visible = false;
		scene.add(m);
		const lane = -1.4 - Math.pow(i / 27, 1.55) * 6.4 + (rand() - 0.5) * 0.3; // dense near, sparser mid, none at the horizon
		const far = (-lane - 1.4) / 6.4; // 0 near .. 1 mid
		nearIsles.push({
			s: m,
			lane: lane,
			far: far,
			next: rand() * 18,
			active: false,
			v: (0.022 - far * 0.014) * (0.85 + rand() * 0.3)
		});
	}
	// seed ~half already mid-scene so the water starts populated
	nearIsles.forEach(function (o, i) {
		if (i % 2 === 0) {
			o.preseed = -10 + rand() * 18;
		}
	});

	return function (t: number) {
		seaMat.uniforms.uTime.value = t;
		const nv = wgrp.userData.navLight;
		if (nv) {
			const ph = t % 1.6;
			nv.material.opacity = ph < 0.12 ? 1 : ph < 0.24 ? 0.35 : 0.08;
		}
		// seesaw sway: very slight roll about the wing's own axis (offset from its base rot)
		if (wgrp.userData.baseRotZ != null)
			wgrp.rotation.z =
				wgrp.userData.baseRotZ + Math.sin(t * 0.4) * 0.009 + Math.sin(t * 0.17 + 2.1) * 0.005;
		const ct = wgrp.userData.contrail;
		const nv2 = wgrp.userData.navLight;
		if (ct && nv2) {
			const wp = ct.userData.v || (ct.userData.v = new T.Vector3());
			nv2.getWorldPosition(wp);
			cam.worldToLocal(wp);
			const dz = -wp.z;
			const sx = 0.55 * dz * (1 + Math.sin(t * 1.1) * 0.08);
			ct.position.set(wp.x + sx * 0.5 + 0.045 * dz, wp.y - 0.115 * dz, wp.z);
			ct.scale.set(sx, 0.06 * dz, 1);
			ct.material.opacity = 0.5 + Math.sin(t * 2.3) * 0.1;
		}
		if (t > shoot2.next) {
			const el = shoot2.t0 < 0 ? 0 : t - shoot2.t0;
			if (el < 1.0) {
				if (el < 0.04 && shoot2.t0 < 0) {
					shoot2.t0 = t;
					shoot2.m.position.set(-8 + rand() * 10, 10 + rand() * 7, -11.7);
				}
				shoot2.m.material.opacity = Math.sin((el / 1.0) * Math.PI) * 0.8;
				shoot2.m.position.x += 0.09;
				shoot2.m.position.y -= 0.02;
			} else {
				shoot2.m.material.opacity = 0;
				shoot2.t0 = -1;
				shoot2.next = t + 18 + rand() * 22;
			}
		}
		fitBackdrop();

		stM.opacity = 0.45 + Math.sin(t * 0.8) * 0.15;
		core2.material.opacity = 0.9 + Math.sin(t * 1.3) * 0.08;
		// passing clouds shade the wing: slow pseudo-noise dims the key light occasionally
		if (wgrp.userData.key) {
			const cn =
				Math.sin(t * 0.12) * 0.5 + Math.sin(t * 0.27 + 1.7) * 0.3 + Math.sin(t * 0.051 + 4.2) * 0.2;
			const shade = 1 - Math.max(0, cn - 0.1) * 0.6;
			wgrp.userData.key.intensity += (1.0 * shade - wgrp.userData.key.intensity) * 0.04;
			wgrp.userData.bounce.intensity +=
				(0.5 * (0.6 + 0.4 * shade) - wgrp.userData.bounce.intensity) * 0.04;
		}
		nearIsles.forEach(function (o) {
			if (!o.active) {
				if (t > o.next) {
					o.active = true;
					o.s.visible = true;
					o.born = t;
					const sx = o.preseed != null ? o.preseed : -10 - rand() * 3;
					o.preseed = null;
					o.s.position.set(sx, 0.05, o.lane);
					const sc = (1.5 - o.far * 1.1) * (0.8 + rand() * 0.5);
					o.s.scale.set(sc, sc * (0.75 + rand() * 0.4), 1);
					o.s.material.opacity = 0;
				}
				return;
			}
			o.s.position.x += o.v;
			// sit on the curved sea: apply the same earth-curvature drop as the water shader
			const cf2 = Math.min(1, Math.max(0, (-o.s.position.z + 2) / 13));
			o.s.position.y = 0.05 - Math.pow(o.s.position.x / 14, 2) * 1.7 * (cf2 * cf2 * (3 - 2 * cf2));
			const edge2 = Math.min(
				1,
				(o.s.position.x + 10) / 2.2,
				(10 - o.s.position.x) / 2.2,
				(t - (o.born || 0)) / 2.5
			);
			o.s.material.opacity = Math.max(0, Math.min(0.92 - o.far * 0.35, edge2));
			if (o.s.position.x > 10) {
				o.active = false;
				o.s.visible = false;
				o.next = t + 2 + rand() * 10;
			}
		});
	};
}
