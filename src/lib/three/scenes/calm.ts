// Calm/ocean scene — sunset sea + airplane-window wing, ported verbatim from the DC
// `kind === 'calm'` branch (Bento Portfolio.dc.html L2270–2821, wing L2411–2617).
// Everything hangs off `scene` (not `spin`): the DC builder parents content to the scene
// and the wing/contrail to the camera; spins.calm = 0 in the loop table.
/* eslint-disable prefer-template */

import type * as THREE from 'three';
import type { SceneCtx, UpdateFn } from '../types';

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
	// sunset cloud layer — fbm shader emulating volumetric clouds lit from within by the low sun
	const cloudFrag = 'uniform float uTime; varying vec2 vUv;\n' +
		'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }\n' +
		'float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }\n' +
		'float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<6;i++){ v+=a*noise(p); p=p*2.0+vec2(1.7,9.2); a*=0.5; } return v; }\n' +
		'void main(){\n' +
		'  vec2 uv = vUv; vec2 sunP = vec2(0.5, 0.135);\n' +
		'  // squash y near horizon for perspective: distant band of small clouds, bigger overhead\n' +
		'  float persp = mix(6.0, 1.4, uv.y);\n' +
		'  vec2 p = vec2(uv.x*7.0 - uTime*0.022, uv.y*persp*3.4);\n' +
		'  float base = fbm(p);\n' +
		'  float detail = fbm(p*2.6 - vec2(uTime*0.03, 0.0));\n' +
		'  float d = base + detail*0.42;\n' +
		'  // sparse clusters: large-scale mask gates where cloud groups form at all\n' +
		'  float cluster = fbm(vec2(uv.x*1.6 - uTime*0.009, uv.y*2.2));\n' +
		'  float clusterMask = smoothstep(0.3, 0.5, cluster);\n' +
		'  // crisp cumulus: hard threshold, big thick bodies\n' +
		'  float thr = 0.56;\n' +
		'  float cov = smoothstep(thr, thr+0.13, d) * clusterMask;\n' +
		'  cov = min(cov*1.4, 1.0);\n' +
		'  // where clouds live: from below the horizon line (under the wing) up to mid-sky\n' +
		'  float zone = 1.0 - smoothstep(0.42, 0.72, uv.y);\n' +
		'  cov *= zone;\n' +
		'  if (cov < 0.01) discard;\n' +
		'  float sd = distance(vec2(uv.x, uv.y*1.9), vec2(sunP.x, sunP.y*1.9));\n' +
		'  // top-lit shading: sample density slightly above — lighter tops, shaded bases\n' +
		'  float above = fbm(p + vec2(0.0, 0.34)) + fbm((p + vec2(0.0,0.34))*2.6 - vec2(uTime*0.03, 0.0))*0.42;\n' +
		'  float grad2 = clamp((d - above)*3.8 + 0.5, 0.0, 1.0);\n' +
		'  grad2 = grad2*grad2*(3.0-2.0*grad2);\n' +
		'  vec3 lit = mix(vec3(0.98,0.82,0.66), vec3(1.0,0.66,0.42), clamp(sd*2.2,0.0,1.0));\n' +
		'  vec3 shade = vec3(0.33,0.2,0.26);\n' +
		'  vec3 col = mix(shade, lit, grad2);\n' +
		'  col += vec3(1.0,0.95,0.85) * pow(grad2, 3.0) * 0.35;\n' +
		'  col += vec3(1.0,0.72,0.45) * exp(-sd*4.5) * 0.28 * grad2;\n' +
		'  gl_FragColor = vec4(col, cov*0.9);\n' +
		'}';
	const cloudMat = new T.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		vertexShader:
			'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
		fragmentShader: cloudFrag,
		uniforms: { uTime: { value: 0 } }
	});
	// (cloud decks removed — pending rework)

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
	const vert2 = 'uniform float uTime; uniform float uBigElev; uniform vec2 uBigFreq; uniform float uBigSpeed; uniform float uSmallElev; uniform float uSmallFreq; uniform float uSmallSpeed; uniform float uSmallIter; varying float vElevation; varying vec3 vNormal; varying vec3 vPosition;\nvec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}\nvec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}\nvec3 fade(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}\nfloat cnoise(vec3 P){vec3 Pi0=floor(P); vec3 Pi1=Pi0+vec3(1.0); Pi0=mod(Pi0,289.0); Pi1=mod(Pi1,289.0); vec3 Pf0=fract(P); vec3 Pf1=Pf0-vec3(1.0); vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x); vec4 iy=vec4(Pi0.yy,Pi1.yy); vec4 iz0=Pi0.zzzz; vec4 iz1=Pi1.zzzz; vec4 ixy=permute(permute(ix)+iy); vec4 ixy0=permute(ixy+iz0); vec4 ixy1=permute(ixy+iz1); vec4 gx0=ixy0/7.0; vec4 gy0=fract(floor(gx0)/7.0)-0.5; gx0=fract(gx0); vec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0); vec4 sz0=step(gz0,vec4(0.0)); gx0-=sz0*(step(0.0,gx0)-0.5); gy0-=sz0*(step(0.0,gy0)-0.5); vec4 gx1=ixy1/7.0; vec4 gy1=fract(floor(gx1)/7.0)-0.5; gx1=fract(gx1); vec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1); vec4 sz1=step(gz1,vec4(0.0)); gx1-=sz1*(step(0.0,gx1)-0.5); gy1-=sz1*(step(0.0,gy1)-0.5); vec3 g000=vec3(gx0.x,gy0.x,gz0.x); vec3 g100=vec3(gx0.y,gy0.y,gz0.y); vec3 g010=vec3(gx0.z,gy0.z,gz0.z); vec3 g110=vec3(gx0.w,gy0.w,gz0.w); vec3 g001=vec3(gx1.x,gy1.x,gz1.x); vec3 g101=vec3(gx1.y,gy1.y,gz1.y); vec3 g011=vec3(gx1.z,gy1.z,gz1.z); vec3 g111=vec3(gx1.w,gy1.w,gz1.w); vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110))); g000*=norm0.x; g010*=norm0.y; g100*=norm0.z; g110*=norm0.w; vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111))); g001*=norm1.x; g011*=norm1.y; g101*=norm1.z; g111*=norm1.w; float n000=dot(g000,Pf0); float n100=dot(g100,vec3(Pf1.x,Pf0.yz)); float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z)); float n110=dot(g110,vec3(Pf1.xy,Pf0.z)); float n001=dot(g001,vec3(Pf0.xy,Pf1.z)); float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z)); float n011=dot(g011,vec3(Pf0.x,Pf1.yz)); float n111=dot(g111,Pf1); vec3 f=fade(Pf0); vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),f.z); vec2 n_yz=mix(n_z.xy,n_z.zw,f.y); return 2.2*mix(n_yz.x,n_yz.y,f.x);}\nfloat waveElevation(vec3 p){ vec2 q = p.xz + vec2(-uTime*0.55, uTime*0.08); float e = cnoise(vec3(q.x*uBigFreq.x*0.45, q.y*uBigFreq.y*0.45, uTime*uBigSpeed*0.3)) * uBigElev * 1.4; e += cnoise(vec3(q.x*uBigFreq.x*0.16 + 7.3, q.y*uBigFreq.y*0.16, uTime*uBigSpeed*0.18)) * uBigElev * 0.9; for(float i=1.0;i<=3.0;i++){ e -= abs(cnoise(vec3(q*uSmallFreq*i, uTime*uSmallSpeed)) * uSmallElev / i); } return e; }\nvoid main(){ vec4 mp = modelMatrix * vec4(position,1.0); float shift=0.01; vec3 a = mp.xyz + vec3(shift,0.0,0.0); vec3 b = mp.xyz + vec3(0.0,0.0,-shift); float e = waveElevation(mp.xyz); float ea = waveElevation(a); float eb = waveElevation(b); mp.y += e - pow(mp.x/14.0,2.0)*1.7*smoothstep(-2.0,11.0,-mp.z); a.y += ea; b.y += eb; vec3 toA = normalize(a - mp.xyz); vec3 toB = normalize(b - mp.xyz); vNormal = cross(toA,toB); gl_Position = projectionMatrix * viewMatrix * mp; vElevation = e; vPosition = mp.xyz; }';
	const frag2 = 'uniform vec3 uDepthColor; uniform vec3 uMidColor; uniform vec3 uSurfaceColor; uniform float uColorOffset; uniform float uColorMultiplier; uniform float uTime; varying float vElevation; varying vec3 vNormal; varying vec3 vPosition;\nvoid main(){ float m = (vElevation + uColorOffset) * uColorMultiplier; m = smoothstep(0.0,1.0,m); vec3 color = m < 0.5 ? mix(uDepthColor, uMidColor, smoothstep(0.0,0.5,m)) : mix(uMidColor, uSurfaceColor, smoothstep(0.5,1.0,m)); vec3 n = normalize(vNormal); vec3 ld = normalize(vec3(0.0,1.0,-0.7)); float diff = max(dot(n,ld),0.0); color *= (0.5 + 0.65*diff); float cg = 1.0 - smoothstep(0.0, 1.9, abs(vPosition.x)); vec3 cool = uMidColor * 0.82 + vec3(0.01,0.03,0.07); color = mix(cool, color, 0.42 + 0.58*cg); color += uSurfaceColor * pow(m,3.0) * 0.55 * cg;\n// fresnel sky reflection: grazing angles pick up dusk sky color (threejs-water idea)\nvec3 vd = normalize(cameraPosition - vPosition); float fres = pow(1.0 - max(dot(n, vd), 0.0), 3.0); color = mix(color, vec3(0.32,0.16,0.2), fres * 0.3);\n// specular sun glints: sharp highlight from the low sun direction\nvec3 sunDir = normalize(vec3(0.0, 0.16, -1.0)); vec3 hv = normalize(sunDir + vd); float spec = pow(max(dot(n, hv), 0.0), 60.0); float trail = 1.0 - smoothstep(0.0, 1.6, abs(vPosition.x)); color += vec3(1.0,0.72,0.42) * spec * (0.18 + 0.75 * trail);\nfloat horizonGlow = smoothstep(-6.0, -11.0, vPosition.z) * (1.0 - smoothstep(0.0, 2.6, abs(vPosition.x))); color += uSurfaceColor * horizonGlow * 0.9; float hb = smoothstep(-7.0, -11.6, vPosition.z); color = mix(color, uSurfaceColor, hb * (0.35 + 0.5*cg));\n// atmospheric haze: distance fades the water into warm fog regardless of trail\nfloat fogd = smoothstep(-4.0, -11.5, vPosition.z); color = mix(color, vec3(0.82,0.6,0.46), fogd * 0.32); float side = 1.0 - smoothstep(15.0, 17.5, abs(vPosition.x)); gl_FragColor = vec4(color, 0.97 * side); }';
	const seaMat = new T.ShaderMaterial({
		vertexShader: vert2,
		fragmentShader: frag2,
		transparent: true,
		uniforms: {
			uTime: { value: 0 },
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
	// [wing] low-poly 3D wing + fairings + winglet — replaces the SVG overlay.
	// Screen-mapped: every vertex is placed on the camera ray of its old SVG coord,
	// so silhouette/angle/width match the approved 2D wing exactly, but it's real
	// faceted geometry shaded by the scene lights (voxel style like water/campfire).
	scene.add(cam);
	const wgrp = new T.Group();
	cam.add(wgrp);
	if (variants.nowing) {
		wgrp.visible = false;
		cam.zoom = variants.sunzoom ? 6.5 : 2.7;
		cam.position.y += variants.sunzoom ? 1.4 : 0.35;
		cam.updateProjectionMatrix();
	}
	{
		const vhW = Math.tan((cam.fov * Math.PI) / 360);
		const SP = (sx: number, sy: number, d: number) =>
			new T.Vector3((sx / 100 - 1) * vhW * cam.aspect * d, (1 - sy / 160) * vhW * d, -d);
		const bez = (p0: number[], p1: number[], p2: number[], p3: number[], t: number) => {
			const u = 1 - t;
			return [
				u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
				u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
			];
		};
		const LE0 = (t: number) => bez([-40, 168], [30, 159], [100, 155], [147, 151], t); // near-straight, slight sweep
		const TE0 = (t: number) => bez([5, 320], [38, 238], [95, 178], [153.5, 156], t); // fast taper at root, slender outboard — like a 787 wing
		// boomerang bow: both edges sag aft mid-span, zero at root crop + winglet seat (endpoints preserved)
		const sag = (t: number) => Math.sin((Math.PI * Math.max(0, Math.min(t, 0.7))) / 0.7) * 6;
		const LE = (t: number) => {
			const p = LE0(t);
			return [p[0], p[1] - sag(t)];
		};
		const TE = (t: number) => {
			const p = TE0(t);
			return [p[0], p[1] - sag(t) * 1.2];
		};
		const rndW = (i: number) => {
			const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
			return v - Math.floor(v);
		};
		const dAt = (t: number) => 6 + 8 * t;
		const posA: number[] = [],
			colA: number[] = [];
		const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, col: THREE.Color) => {
			posA.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
			for (let v = 0; v < 3; v++) colA.push(col.r, col.g, col.b);
		};
		const baseC = new T.Color('#b2b6bd'),
			tipWarm = new T.Color('#c4a67d'),
			flapC = new T.Color('#8f352c'),
			lipC = new T.Color('#2e3136');
		const litC = new T.Color('#212428');
		const NSEG = 10;
		const SPAN = 0.7;
		const ck = (t: number) => 1 - 0.52 * Math.max(0, Math.min(1, (t / SPAN - 0.5) / 0.5));
		const pinchTE = (t: number) => {
			const le = LE(t),
				te = TE(t),
				k = ck(t);
			return [le[0] + (te[0] - le[0]) * k, le[1] + (te[1] - le[1]) * k];
		};
		for (let i = 0; i < NSEG; i++) {
			const t0 = (i / NSEG) * SPAN,
				t1 = ((i + 1) / NSEG) * SPAN;
			const le0 = LE(t0),
				le1 = LE(t1),
				te0 = pinchTE(t0),
				te1 = pinchTE(t1);
			const mid = (a: number[], b: number[], f: number) => [
				a[0] + (b[0] - a[0]) * f,
				a[1] + (b[1] - a[1]) * f
			];
			const m0 = mid(le0, te0, 0.88),
				m1 = mid(le1, te1, 0.88);
			const d0 = dAt(t0),
				d1 = dAt(t1);
			const jb = (bi: number, k: number) => (bi === NSEG ? 0 : (rndW(bi * 4 + k) - 0.5) * 0.18); // per-boundary jitter — shared edges match, no cracks; zero at tip so the winglet seats flush
			const A = SP(le0[0], le0[1], d0 + jb(i, 0)),
				B = SP(le1[0], le1[1], d1 + jb(i + 1, 0));
			const C0 = SP(m0[0], m0[1], d0 + jb(i, 2)),
				D = SP(m1[0], m1[1], d1 + jb(i + 1, 2));
			const E = SP(te0[0], te0[1], d0 + jb(i, 0) * 0.5),
				F = SP(te1[0], te1[1], d1 + jb(i + 1, 0) * 0.5);
			const warm = t0 * t0;
			const shade = 0.94 + rndW(i * 9 + 2) * 0.11;
			const cMain = baseC.clone().lerp(tipWarm, warm * 0.85).multiplyScalar(shade);
			pushTri(A, C0, B, cMain);
			pushTri(B, C0, D, cMain.clone().multiplyScalar(0.95));
			// panel seam: faint darker strip along this segment boundary (every other rib)
			if (i > 0 && i % 2 === 0) {
				const sw = 0.55;
				const les = mid(le0, [le1[0], le1[1]], 0.06),
					mes = mid(m0, m1, 0.06);
				const A2 = SP(les[0], les[1] + sw, d0 + jb(i, 0) + 0.01),
					C2 = SP(mes[0], mes[1] + sw, d0 + jb(i, 2) + 0.01);
				const seamC = cMain.clone().multiplyScalar(0.82);
				pushTri(A, A2, C0, seamC);
				pushTri(C0, A2, C2, seamC);
			}
			const cF = flapC
				.clone()
				.lerp(new T.Color('#6e2a24'), warm)
				.multiplyScalar(0.97 + rndW(i * 7) * 0.06);
			// flap separation groove: crisp dark line where flap meets the main panel
			const gv0 = SP(m0[0], m0[1] + 0.5, d0 + jb(i, 2) - 0.015),
				gv1 = SP(m1[0], m1[1] + 0.5, d1 + jb(i + 1, 2) - 0.015);
			const grooveC = new T.Color('#3a3d42');
			pushTri(C0, gv0, D, grooveC);
			pushTri(D, gv0, gv1, grooveC);
			pushTri(C0, E, D, cF);
			pushTri(D, E, F, cF.clone().multiplyScalar(0.96));
			// sunlit leading-edge facet strip
			const L0b = SP(le0[0] + 0.3, le0[1] + 3.4, d0 + jb(i, 0) + 0.04),
				L1b = SP(le1[0] + 0.3, le1[1] + 3.4, d1 + jb(i + 1, 0) + 0.04);
			pushTri(A, L0b, B, litC);
			pushTri(B, L0b, L1b, litC.clone().multiplyScalar(0.94));
			// thickness lip under the trailing edge (deep at root, thin at tip)
			const lp0 = (1 - t0) * 3.5 + 1.2,
				lp1 = (1 - t1) * 3.5 + 1.2;
			const E2 = SP(te0[0] + lp0 * 0.22, te0[1] + lp0, d0),
				F2 = SP(te1[0] + lp1 * 0.22, te1[1] + lp1, d1);
			pushTri(E, E2, F, lipC);
			pushTri(F, E2, F2, lipC.clone().multiplyScalar(1.18));
			// (red top-surface stripe removed)
		}
		// (no root/body fill — wing enters cropped by the window edge)
		// upturned winglet with red-painted tip
		const wl = (f: number, e2: number) => {
			const bx = e2 ? 100.4 : 99.1,
				by = e2 ? 169.6 : 154.7,
				tx = e2 ? 136 : 131,
				ty = e2 ? 160 : 150;
			return SP(bx + (tx - bx) * f, by + (ty - by) * f, 11.6 + f * 0.6);
		};
		const wlG = new T.Color('#a4a2a8'),
			wlR = new T.Color('#8f352c');
		pushTri(wl(0, 0), wl(0, 1), wl(0.38, 0), wlG);
		pushTri(wl(0.38, 0), wl(0, 1), wl(0.38, 1), wlG.clone().multiplyScalar(0.93));
		pushTri(wl(0.38, 0), wl(0.38, 1), wl(1, 0), wlR);
		pushTri(wl(1, 0), wl(0.38, 1), wl(1, 1), wlR.clone().multiplyScalar(0.88));
		// --- surface detail kit ---
		const cp = (tt: number, ff: number) => {
			const le = LE(tt),
				te = pinchTE(tt);
			return [le[0] + (te[0] - le[0]) * ff, le[1] + (te[1] - le[1]) * ff];
		};
		const quad = (
			a: THREE.Vector3,
			b: THREE.Vector3,
			c: THREE.Vector3,
			d2: THREE.Vector3,
			col: THREE.Color
		) => {
			pushTri(a, b, d2, col);
			pushTri(d2, b, c, col.clone().multiplyScalar(0.97));
		};
		// outlined actuator panels (spoilers mid-chord, aileron near tip)
		const panel = (t0: number, t1: number, f0: number, f1: number) => {
			const P = (tt: number, ff: number, dd: number) => {
				const p = cp(tt, ff);
				return SP(p[0], p[1], dAt(tt) + dd);
			};
			const warm = t0 * t0;
			const rim = baseC.clone().lerp(tipWarm, warm * 0.85).multiplyScalar(0.74);
			const face = baseC.clone().lerp(tipWarm, warm * 0.85).multiplyScalar(1.0);
			quad(P(t0, f0, 0.05), P(t0, f1, 0.05), P(t1, f1, 0.05), P(t1, f0, 0.05), rim);
			const g = 0.16;
			const ti = (t1 - t0) * 0.12;
			quad(
				P(t0 + ti, f0 + (f1 - f0) * g, 0.09),
				P(t0 + ti, f1 - (f1 - f0) * g, 0.09),
				P(t1 - ti, f1 - (f1 - f0) * g, 0.09),
				P(t1 - ti, f0 + (f1 - f0) * g, 0.09),
				face
			);
		};
		panel(0.17, 0.29, 0.44, 0.66);
		panel(0.33, 0.45, 0.46, 0.68);
		panel(0.6, 0.685, 0.58, 0.93);
		// flap linework between the two track fairings
		panel(0.44, 0.58, 0.72, 0.97);
		// vortex generators: small raised fins in a row behind the leading edge
		const vgC = new T.Color('#71767e');
		for (let k = 0; k < 7; k++) {
			const tt = 0.1 + k * 0.062;
			const b = cp(tt, 0.15),
				b2 = cp(tt + 0.016, 0.16),
				d = dAt(tt);
			pushTri(
				SP(b[0], b[1], d + 0.02),
				SP(b2[0], b2[1], d + 0.02),
				SP((b[0] + b2[0]) / 2, (b[1] + b2[1]) / 2, d + 0.5),
				vgC.clone().multiplyScalar(0.92 + rndW(k * 3) * 0.14)
			);
		}
		// static discharge wicks trailing off the back edge
		const wickC = new T.Color('#26282c');
		[0.24, 0.44, 0.62].forEach((tt) => {
			const le = LE(tt),
				te = pinchTE(tt);
			const dx = te[0] - le[0],
				dy = te[1] - le[1],
				L = Math.hypot(dx, dy),
				ux = dx / L,
				uy = dy / L;
			const d = dAt(tt);
			pushTri(
				SP(te[0] - uy * 0.35, te[1] + ux * 0.35, d + 0.01),
				SP(te[0] + uy * 0.35, te[1] - ux * 0.35, d + 0.01),
				SP(te[0] + ux * 6.0, te[1] + uy * 6.0, d + 0.01),
				wickC
			);
		});
		// root walkway band (dark anti-slip strip, cropped by the window)
		{
			const P = (tt: number, ff: number) => {
				const p = cp(tt, ff);
				return SP(p[0], p[1], dAt(tt) + 0.04);
			};
			quad(
				P(0.02, 0.08),
				P(0.02, 0.9),
				P(0.075, 0.9),
				P(0.075, 0.08),
				new T.Color('#7b7f87').multiplyScalar(0.82)
			);
		}
		const wgeo = new T.BufferGeometry();
		wgeo.setAttribute('position', new T.Float32BufferAttribute(posA, 3));
		wgeo.setAttribute('color', new T.Float32BufferAttribute(colA, 3));
		wgeo.computeVertexNormals();
		const wmat = new T.MeshStandardMaterial({
			vertexColors: true,
			flatShading: true,
			roughness: 0.62,
			metalness: 0.28,
			side: T.DoubleSide,
			transparent: true,
			opacity: 1
		});
		wgrp.add(new T.Mesh(wgeo, wmat));
		// cloud shadows sweeping the wing: duplicate wing surface with drifting noise-alpha dark shader
		const shadMat = new T.ShaderMaterial({
			transparent: true,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: -1,
			polygonOffsetUnits: -1,
			side: T.DoubleSide,
			vertexShader:
				'varying vec3 vW; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }',
			fragmentShader: 'uniform float uT; varying vec3 vW;\n' +
				'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }\n' +
				'float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }\n' +
				'void main(){ vec2 q=vec2(vW.x+vW.z*0.4, vW.y)*vec2(0.5,0.85); q.x-=uT*0.16;\n' +
				'  float d=n2(q)*0.6+n2(q*2.3+vec2(5.0,2.0))*0.4;\n' +
				'  float s=smoothstep(0.46,0.72,d);\n' +
				'  gl_FragColor=vec4(vec3(0.06,0.05,0.10), s*0.34); }',
			uniforms: { uT: { value: 0 } }
		});
		wgrp.add(new T.Mesh(wgeo, shadMat));
		wgrp.userData.cloudShadow = shadMat;
		const navP = wl(1, 0.5);
		const navCv = document.createElement('canvas');
		navCv.width = navCv.height = 64;
		const ng = navCv.getContext('2d')!;
		const ngr = ng.createRadialGradient(32, 32, 0, 32, 32, 32);
		ngr.addColorStop(0, 'rgba(255,200,130,1)');
		ngr.addColorStop(0.35, 'rgba(255,150,80,0.55)');
		ngr.addColorStop(1, 'rgba(255,150,80,0)');
		ng.fillStyle = ngr;
		ng.fillRect(0, 0, 64, 64);
		const navTex = new T.CanvasTexture(navCv);
		const navLight = new T.Sprite(
			new T.SpriteMaterial({
				map: navTex,
				color: 0xffb36b,
				transparent: true,
				depthWrite: false,
				depthTest: false,
				blending: T.AdditiveBlending
			})
		);
		navLight.position.copy(navP);
		navLight.scale.setScalar(0.14);
		navLight.renderOrder = 30;
		wgrp.add(navLight);
		wgrp.userData.navLight = navLight;
		// specular glint sweeping along the leading edge (~10s cycle)
		{
			const gCv = document.createElement('canvas');
			gCv.width = 128;
			gCv.height = 32;
			const gg = gCv.getContext('2d')!;
			const ggr = gg.createRadialGradient(64, 16, 0, 64, 16, 60);
			ggr.addColorStop(0, 'rgba(255,240,215,0.95)');
			ggr.addColorStop(0.3, 'rgba(255,220,175,0.4)');
			ggr.addColorStop(1, 'rgba(255,220,175,0)');
			gg.fillStyle = ggr;
			gg.fillRect(0, 0, 128, 32);
			const glint = new T.Sprite(
				new T.SpriteMaterial({
					map: new T.CanvasTexture(gCv),
					transparent: true,
					depthWrite: false,
					depthTest: false,
					blending: T.AdditiveBlending,
					opacity: 0
				})
			);
			glint.renderOrder = 29;
			wgrp.add(glint);
			wgrp.userData.glint = { spr: glint, LE, SP, SPAN };
		}
		// contrail wisp streaming right off the winglet tip
		{
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
		}
		// flap track fairings: low-poly canoe pods sunk half behind the wing (top half occluded)
		const podAt = (t: number, len: number, rad: number, inset: number, ang: number) => {
			const te = pinchTE(t),
				d = dAt(t) + 0.3;
			const ky = (2 * vhW * d) / 320;
			const g = new T.CylinderGeometry(rad * 0.6 * ky, rad * ky, len * ky, 6, 2).toNonIndexed();
			const pp = g.attributes.position as THREE.BufferAttribute,
				cc = new Float32Array(pp.count * 3);
			const podC = new T.Color('#6e6b66'),
				warmC = new T.Color('#a87f52'),
				redC = new T.Color('#a33c33');
			for (let f = 0; f < pp.count; f += 3) {
				let cx = 0,
					cy = 0;
				for (let v = 0; v < 3; v++) {
					cx += pp.getX(f + v);
					cy += pp.getY(f + v);
				}
				cx /= 3;
				cy /= 3;
				let c = podC.clone().multiplyScalar(0.9 + rndW(f + t * 90) * 0.2);
				if (cx < -rad * ky * 0.3) c = c.lerp(warmC, 0.22); // underside catches ocean bounce
				if (cy < -len * ky * 0.42) c = redC.clone().multiplyScalar(0.88 + rndW(f) * 0.18); // red tail
				for (let v = 0; v < 3; v++) {
					cc[(f + v) * 3] = c.r;
					cc[(f + v) * 3 + 1] = c.g;
					cc[(f + v) * 3 + 2] = c.b;
				}
			}
			g.setAttribute('color', new T.BufferAttribute(cc, 3));
			const m = new T.Mesh(g, wmat);
			m.position.copy(SP(te[0] - rad * 0.38 - (inset || 0) * 0.3, te[1] + rad * 0.3, d + 0.4));
			m.scale.setScalar(0.8);
			m.rotation.set(-0.15, 0, ang || -2.91);
			// then force the pod's world axis perfectly screen-horizontal (compensates group yaw+roll)
			const qw = new T.Quaternion().setFromEuler(new T.Euler(0, -0.52, Math.PI / 4 + 0.55));
			m.quaternion.copy(
				qw.invert().multiply(new T.Quaternion().setFromEuler(new T.Euler(0, 0, -Math.PI / 2)))
			);
			wgrp.add(m);
			return m;
		};
		podAt(0.42, 40, 9.5, 0, -3.08);
		const podOuter = podAt(0.6, 30, 7.5, 0, -2.91);
		// slightly opaque windstream trailing from the outer fairing (screen-right, with the airflow)
		const wsMat = new T.SpriteMaterial({
			map: navTex,
			color: 0xf2ede4,
			transparent: true,
			opacity: 0.16,
			depthWrite: false
		});
		const ws = new T.Sprite(wsMat);
		ws.position.copy(podOuter.position).add(new T.Vector3(0.234, -0.972, 0).multiplyScalar(1.15));
		ws.scale.set(2.6, 0.16, 1);
		ws.renderOrder = 22;
		wgrp.add(ws);
		wgrp.userData.windstream = ws;
		// key light travelling with the camera so the top surface reads light metallic
		const wKey = new T.DirectionalLight(0xfff0d8, 1.0);
		wKey.position.set(0, 3, 2);
		cam.add(wKey);
		// warm bounce light from the sea below
		const bounce = new T.DirectionalLight(0xe8a05f, 0.5);
		bounce.position.set(0.5, -3, 2.5);
		scene.add(bounce);
		wgrp.userData.key = wKey;
		wgrp.userData.bounce = bounce;
		// rotate the entire wing 45° left (CCW) about its own centroid, in the screen plane
		let wcx = 0,
			wcy = 0,
			wcz = 0;
		for (let i = 0; i < posA.length; i += 3) {
			wcx += posA[i];
			wcy += posA[i + 1];
			wcz += posA[i + 2];
		}
		const nWP = posA.length / 3;
		const wCen = new T.Vector3(wcx / nWP, wcy / nWP, wcz / nWP);
		wgrp.children.forEach((ch) => ch.position.sub(wCen));
		wgrp.position.copy(wCen);
		wgrp.position.x = -1.15;
		wgrp.position.y -= 2.15;
		wgrp.scale.setScalar(1.32);
		wgrp.rotation.z = Math.PI / 4 + 0.55;
		wgrp.rotation.y = -0.52 - 0.087; // root swung slightly left/up; +5deg yaw right
		// wing always paints over nearby clouds: draw last, opaque, on top of transparent layers
		wgrp.traverse((ch) => {
			if ((ch as THREE.Mesh).isMesh) {
				const mesh = ch as THREE.Mesh;
				mesh.renderOrder = 20;
				const mat = mesh.material as THREE.Material;
				if (mat && !mat.transparent) {
					mat.transparent = true;
					mat.opacity = 1;
				}
			}
		});
	}
	// Dead code from the DC branch omitted (never invoked / never populated): clouds2 (L2618),
	// rockTex2/rockMat2/mkRock2 (L2619–2642), folMat2/trunkMat2/mkTier2/mkTree2 (L2644–2669),
	// horizon-isles mkIsle/isles with the `for (let i = 0; i < 0; i++)` spawn loop (L2670–2712),
	// and their update blocks (clouds2.forEach / isles.forEach, L2789–2807).

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
		// seesaw sway: very slight roll about the wing's own axis
		wgrp.rotation.z = Math.PI / 4 + 0.55 + Math.sin(t * 0.4) * 0.009 + Math.sin(t * 0.17 + 2.1) * 0.005;
		const gl = wgrp.userData.glint;
		if (gl) {
			const gp = (t % 10) / 10;
			const vis = gp < 0.35 ? Math.sin((gp / 0.35) * Math.PI) : 0;
			gl.spr.material.opacity = vis * 0.55;
			const gt = Math.min(gl.SPAN, (gp / 0.35) * gl.SPAN);
			const p = gl.LE(gt);
			gl.spr.position.copy(gl.SP(p[0] + 0.5, p[1] + 1.5, 6 + 8 * gt - 0.4));
			const sc = 0.5 + gt * 0.4;
			gl.spr.scale.set(sc, sc * 0.28, 1);
		}
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
		const ws2 = wgrp.userData.windstream;
		if (ws2) {
			ws2.material.opacity = 0.13 + Math.sin(t * 1.7) * 0.05;
			ws2.scale.x = 2.6 + Math.sin(t * 0.9) * 0.3;
		}
		cloudMat.uniforms.uTime.value = t;
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
			if (wgrp.userData.cloudShadow) wgrp.userData.cloudShadow.uniforms.uT.value = t;
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
