// Firefly jar — verbatim port of the DC `kind === 'jar'` branch (L2846–2895).
//
// The seeded LCG below (seed=7, Lehmer 16807 % 2^31-1) drives grass-tuft placement AND
// all 14 fireflies' parameters — the layout is designed-by-seed, so the exact sequence
// is the art. Do NOT substitute ctx.rand or Math.random.
// Glass cylinder creation ORDER matters (transparency sorting with depthWrite:false).

import type * as THREE from 'three';
import type { SceneCtx, UpdateFn } from '../types';

export function buildJar(ctx: SceneCtx): UpdateFn | null {
	const { T, scene, spin } = ctx;

	const V = 0.095,
		SEG = 8;
	const grp = new T.Group();
	spin.add(grp);
	grp.position.y = -1.05;
	const glass = new T.MeshStandardMaterial({
		color: 0xcfe4ea,
		roughness: 0.15,
		transparent: true,
		opacity: 0.22,
		side: T.DoubleSide,
		depthWrite: false,
		flatShading: true
	});
	const zinc = new T.MeshStandardMaterial({
		color: 0xb8bcc0,
		metalness: 0.35,
		roughness: 0.45,
		flatShading: true
	});
	const soilM = new T.MeshStandardMaterial({ color: 0x2e2318, roughness: 0.95, flatShading: true });
	const grassM = new T.MeshStandardMaterial({
		color: 0x3d5a2a,
		roughness: 0.85,
		flatShading: true
	});
	const twigM = new T.MeshStandardMaterial({ color: 0x4a3a26, roughness: 0.9, flatShading: true });
	const cylAdd = (
		rt: number,
		rb: number,
		ht: number,
		y: number,
		mat: THREE.Material,
		open?: boolean
	) => {
		const m = new T.Mesh(new T.CylinderGeometry(rt, rb, ht, SEG, 1, !!open), mat);
		m.position.y = y;
		grp.add(m);
		return m;
	};
	cylAdd(7 * V, 7 * V, 16 * V, 8 * V, glass, true);
	cylAdd(7 * V, 7 * V, 0.5 * V, 0.25 * V, glass);
	cylAdd(5 * V, 7 * V, 2 * V, 17 * V, glass, true);
	cylAdd(5 * V, 5 * V, 2 * V, 19 * V, glass, true);
	cylAdd(5.6 * V, 5.6 * V, 2 * V, 21 * V, zinc);
	cylAdd(4.5 * V, 4.5 * V, 1 * V, 22.5 * V, zinc);
	cylAdd(6.8 * V, 6.8 * V, 1 * V, 1 * V, soilM);
	let seed = 7;
	const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
	const cube = new T.BoxGeometry(V, V, V);
	for (let i = 0; i < 10; i++) {
		const hh = 1 + Math.floor(rnd() * 4);
		const a = rnd() * Math.PI * 2,
			rr = rnd() * 4.5 * V;
		const x = Math.round((Math.cos(a) * rr) / V) * V,
			z = Math.round((Math.sin(a) * rr) / V) * V;
		for (let j = 0; j < hh; j++) {
			const b = new T.Mesh(cube, grassM);
			b.scale.setScalar(0.85 - j * 0.12);
			b.position.set(x, (1.5 + j) * V + V / 2, z);
			grp.add(b);
		}
	}
	for (let j = 0; j < 6; j++) {
		const b = new T.Mesh(cube, twigM);
		b.scale.setScalar(0.7);
		b.position.set((-3 + j) * V * 0.8, (2 + j * 0.9) * V, (1 - j * 0.4) * V);
		grp.add(b);
	}
	interface Fly {
		m: THREE.Mesh;
		mat: THREE.MeshStandardMaterial;
		rot: number;
		phase: number;
		period: number;
		pulse: number;
		wf: [number, number, number];
		wo: [number, number, number];
		rr: number;
		ry: number;
		yc: number;
	}
	const flies: Fly[] = [];
	const SF = V / 0.008;
	for (let i = 0; i < 14; i++) {
		const mat = new T.MeshStandardMaterial({
			color: 0xffd668,
			emissive: 0xffc23e,
			emissiveIntensity: 2,
			flatShading: true
		});
		const m = new T.Mesh(cube, mat);
		m.scale.setScalar(0.45 + rnd() * 0.4);
		grp.add(m);
		flies.push({
			m: m,
			mat: mat,
			rot: rnd() * Math.PI,
			phase: rnd() * 20,
			period: 2.2 + rnd() * 3,
			pulse: 0.8 + rnd() * 0.9,
			wf: [0.13 + rnd() * 0.18, 0.14 + rnd() * 0.18, 0.09 + rnd() * 0.16],
			wo: [rnd() * 9, rnd() * 9, rnd() * 9],
			rr: (0.012 + rnd() * 0.018) * SF,
			ry: (0.02 + rnd() * 0.028) * SF,
			yc: (0.05 + rnd() * 0.06) * SF
		});
	}
	const jarLight = new T.PointLight(0xffbe46, 0.5, 4, 2);
	jarLight.position.set(0, 9 * V, 0);
	grp.add(jarLight);
	const key = new T.DirectionalLight(0xc4d6f0, 1.0);
	key.position.set(2.5, 3, 3);
	scene.add(key);
	scene.add(new T.AmbientLight(0x3a4252, 1.1));
	const flick = (f: Fly, t: number) => {
		const c = ((t + f.phase) % f.period) / f.period;
		const w = f.pulse / f.period;
		if (c > w) return 0.22;
		return 0.22 + 0.78 * Math.pow(Math.sin((c / w) * Math.PI), 1.6);
	};
	return (t) => {
		flies.forEach((f) => {
			const a = t * f.wf[0] * Math.PI * 2 + f.wo[0];
			const rr = Math.min(f.rr + 0.012 * SF * Math.sin(t * f.wf[2] * Math.PI * 2 + f.wo[2]), 0.043 * SF);
			f.m.position.set(
				Math.cos(a) * rr,
				f.yc + f.ry * Math.sin(t * f.wf[1] * Math.PI * 2 + f.wo[1]),
				Math.sin(a) * rr
			);
			f.m.rotation.y = f.rot + t * 0.6;
			f.mat.emissiveIntensity = 0.3 + flick(f, t) * 4;
		});
		grp.rotation.x = Math.sin(t * 0.35) * 0.14;
	};
}
