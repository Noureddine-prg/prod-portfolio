// Calm/ocean scene — sunset sea + sky, verbatim port of the DC `kind === 'calm'`.
// Everything parents to `scene`. spins.calm = 0.
/* eslint-disable prefer-template */

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
	// (no `skyClouds` deck here, so the DC's deck rescale is omitted)
	const fitBackdrop = () => {
		const need = (Math.tan((cam.fov * Math.PI) / 360) / cam.zoom) * cam.aspect * 13 * 2.35;
		const s = Math.max(1, need / 34);
		sky.scale.set(s, 1, 1);
		sea.scale.x = Math.max(1, s * 0.95);
	};
	let fitAspect = 0,
		fitZoom = 0;
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
	// tile/strip variants (nowing) zoom the camera in on the sun; the porthole keeps the wide view
	if (variants.nowing) {
		cam.zoom = variants.sunzoom ? 6.5 : 2.7;
		cam.position.y += variants.sunzoom ? 1.4 : 0.35;
		cam.updateProjectionMatrix();
	}
	return function (t: number, dt: number) {
		seaMat.uniforms.uTime.value = t;
		if (t > shoot2.next) {
			const el = shoot2.t0 < 0 ? 0 : t - shoot2.t0;
			if (el < 1.0) {
				if (el < 0.04 && shoot2.t0 < 0) {
					shoot2.t0 = t;
					shoot2.m.position.set(-8 + rand() * 10, 10 + rand() * 7, -11.7);
				}
				shoot2.m.material.opacity = Math.sin((el / 1.0) * Math.PI) * 0.8;
				shoot2.m.position.x += 0.09 * dt * 60;
				shoot2.m.position.y -= 0.02 * dt * 60;
			} else {
				shoot2.m.material.opacity = 0;
				shoot2.t0 = -1;
				shoot2.next = t + 18 + rand() * 22;
			}
		}
		if (cam.aspect !== fitAspect || cam.zoom !== fitZoom) {
			fitAspect = cam.aspect;
			fitZoom = cam.zoom;
			fitBackdrop();
		}

		stM.opacity = 0.45 + Math.sin(t * 0.8) * 0.15;
		core2.material.opacity = 0.9 + Math.sin(t * 1.3) * 0.08;
	};
}
