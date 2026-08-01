// Envelope scene — verbatim port of the DC `kind === 'envelope'` branch (L2921–2971).
// Contact card: kraft paper envelope with wax seal. `clean` variant (tile) is pristine;
// without it (expanded) the corners are charred with pulsing embers + a flickering fire
// point light. NO flame mesh here — the burning look on the expanded card comes from the
// separate flame canvas layered at z2.

import type * as THREE from 'three';
import type { SceneCtx, UpdateFn } from '../types';

type EmberMesh = THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;

export function buildEnvelope(ctx: SceneCtx): UpdateFn | null {
	const { T, scene, spin } = ctx;

	const grp = new T.Group();
	spin.add(grp);
	const paper = new T.MeshStandardMaterial({
		color: 0xe8dcc4,
		roughness: 0.85,
		metalness: 0,
		flatShading: true
	});
	const paperDark = new T.MeshStandardMaterial({ color: 0xd2c2a4, roughness: 0.9, flatShading: true });
	grp.add(new T.Mesh(new T.BoxGeometry(2.3, 1.5, 0.09), paper));
	const xo = { depth: 0.05, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.012, bevelSegments: 1 };
	const tri = (pts: [number, number][], mat: THREE.Material, z: number) => {
		const s = new T.Shape();
		s.moveTo(pts[0][0], pts[0][1]);
		s.lineTo(pts[1][0], pts[1][1]);
		s.lineTo(pts[2][0], pts[2][1]);
		const m = new T.Mesh(new T.ExtrudeGeometry(s, xo), mat);
		m.position.z = z;
		grp.add(m);
		return m;
	};
	const W = 1.15,
		H = 0.75;
	// top flap hinged at its top edge so it can swing open on data-pop
	const flapPivot = new T.Group();
	flapPivot.position.y = H;
	grp.add(flapPivot);
	{
		const s = new T.Shape();
		s.moveTo(-W, 0);
		s.lineTo(W, 0);
		s.lineTo(0, 0.06 - H);
		const m = new T.Mesh(new T.ExtrudeGeometry(s, xo), paperDark);
		m.position.z = 0.045;
		flapPivot.add(m);
	}
	tri([[-W, -H], [W, -H], [0, -0.06]], paper, 0.065);
	tri([[-W, H], [-W, -H], [-0.10, 0]], paper, 0.055);
	tri([[W, H], [W, -H], [0.10, 0]], paper, 0.055);
	const seal = new T.Mesh(
		new T.CylinderGeometry(0.17, 0.19, 0.07, 9),
		new T.MeshStandardMaterial({ color: 0xc85a44, roughness: 0.55, flatShading: true })
	);
	seal.rotation.x = Math.PI / 2;
	seal.position.set(0, 0, 0.15);
	const sealGrp = new T.Group();
	sealGrp.add(seal);
	grp.add(sealGrp);
	const emboss = new T.Mesh(
		new T.CylinderGeometry(0.09, 0.10, 0.03, 9),
		new T.MeshStandardMaterial({ color: 0xa8452f, roughness: 0.5, flatShading: true })
	);
	emboss.rotation.x = Math.PI / 2;
	emboss.position.set(0, 0, 0.19);
	sealGrp.add(emboss);
	// (address lines removed)
	const clean = ctx.variants.clean;
	const embers: EmberMesh[] = [];
	if (!clean) {
		// burnt top-right corner: charred jagged overlay + ember rim (flame lives on the
		// separate flame canvas, not here)
		const ch = new T.Shape();
		ch.moveTo(0.62, 0.78);
		ch.lineTo(1.18, 0.78);
		ch.lineTo(1.18, 0.30);
		ch.lineTo(1.04, 0.35);
		ch.lineTo(0.99, 0.50);
		ch.lineTo(0.86, 0.45);
		ch.lineTo(0.80, 0.60);
		ch.lineTo(0.69, 0.57);
		ch.lineTo(0.62, 0.78);
		const charMesh = new T.Mesh(
			new T.ExtrudeGeometry(ch, { depth: 0.13, bevelEnabled: false }),
			new T.MeshStandardMaterial({ color: 0x171009, roughness: 1, flatShading: true })
		);
		charMesh.position.z = 0.01;
		grp.add(charMesh);
		(
			[
				[1.04, 0.35],
				[0.99, 0.50],
				[0.86, 0.45],
				[0.80, 0.60],
				[0.69, 0.57]
			] as [number, number][]
		).forEach((p) => {
			const e = new T.Mesh(
				new T.SphereGeometry(0.02, 6, 5),
				new T.MeshBasicMaterial({ color: 0xff7d2e })
			);
			e.position.set(p[0], p[1], 0.145);
			grp.add(e);
			embers.push(e);
		});
		// extra charring: bottom-left scorch + right-edge nibble
		const ch2 = new T.Shape();
		ch2.moveTo(-1.18, -0.78);
		ch2.lineTo(-0.72, -0.78);
		ch2.lineTo(-0.80, -0.62);
		ch2.lineTo(-0.94, -0.68);
		ch2.lineTo(-1.02, -0.55);
		ch2.lineTo(-1.18, -0.60);
		ch2.lineTo(-1.18, -0.78);
		const charMesh2 = new T.Mesh(
			new T.ExtrudeGeometry(ch2, { depth: 0.13, bevelEnabled: false }),
			new T.MeshStandardMaterial({ color: 0x171009, roughness: 1, flatShading: true })
		);
		charMesh2.position.z = 0.01;
		grp.add(charMesh2);
		const ch3 = new T.Shape();
		ch3.moveTo(1.18, -0.12);
		ch3.lineTo(1.18, -0.42);
		ch3.lineTo(1.06, -0.35);
		ch3.lineTo(1.10, -0.22);
		ch3.lineTo(1.02, -0.18);
		ch3.lineTo(1.18, -0.12);
		const charMesh3 = new T.Mesh(
			new T.ExtrudeGeometry(ch3, { depth: 0.13, bevelEnabled: false }),
			new T.MeshStandardMaterial({ color: 0x1c130b, roughness: 1, flatShading: true })
		);
		charMesh3.position.z = 0.01;
		grp.add(charMesh3);
		const ch4 = new T.Shape();
		ch4.moveTo(-0.34, -0.78);
		ch4.lineTo(0.36, -0.78);
		ch4.lineTo(0.28, -0.60);
		ch4.lineTo(0.12, -0.66);
		ch4.lineTo(-0.02, -0.55);
		ch4.lineTo(-0.16, -0.64);
		ch4.lineTo(-0.26, -0.58);
		ch4.lineTo(-0.34, -0.78);
		const charMesh4 = new T.Mesh(
			new T.ExtrudeGeometry(ch4, { depth: 0.14, bevelEnabled: false }),
			new T.MeshStandardMaterial({ color: 0x140d07, roughness: 1, flatShading: true })
		);
		charMesh4.position.z = 0.01;
		grp.add(charMesh4);
		(
			[
				[0.28, -0.60],
				[0.12, -0.66],
				[-0.02, -0.55],
				[-0.16, -0.64],
				[-0.26, -0.58]
			] as [number, number][]
		).forEach((p) => {
			const e = new T.Mesh(
				new T.SphereGeometry(0.018, 6, 5),
				new T.MeshBasicMaterial({ color: 0xff7d2e })
			);
			e.position.set(p[0], p[1], 0.15);
			grp.add(e);
			embers.push(e);
		});
		(
			[
				[-0.72, -0.78],
				[-0.80, -0.62],
				[-1.02, -0.55],
				[1.06, -0.35],
				[1.10, -0.22]
			] as [number, number][]
		).forEach((p) => {
			const e = new T.Mesh(
				new T.SphereGeometry(0.016, 6, 5),
				new T.MeshBasicMaterial({ color: 0xd85e20 })
			);
			e.position.set(p[0], p[1], 0.145);
			grp.add(e);
			embers.push(e);
		});
	}
	grp.rotation.x = -0.1;
	const key = new T.DirectionalLight(0xffd9a8, 1.1);
	key.position.set(2.5, 3, 3);
	scene.add(key);
	const fill = new T.DirectionalLight(0x8a6a55, 0.45);
	fill.position.set(-3, -1, 2);
	scene.add(fill);
	scene.add(new T.AmbientLight(0x4a3c34, 1.0));
	const fireP = new T.PointLight(0xff8c3a, clean ? 0 : 0.9, 2.2);
	fireP.position.set(1.06, 0.88, 0.3);
	grp.add(fireP);
	// seal pop + flap open: expand.ts sets data-pop at click; resets when cleared
	let popT: number | null = null;
	return (t) => {
		const popped = ctx.canvas.dataset.pop === '1';
		if (popped && popT == null) popT = t;
		if (!popped && popT != null) {
			popT = null;
			sealGrp.position.set(0, 0, 0);
			sealGrp.rotation.set(0, 0, 0);
			flapPivot.rotation.x = 0;
		}
		if (popT != null) {
			const k = Math.min(1, (t - popT) / 0.7);
			const e = 1 - Math.pow(1 - k, 3);
			const hop = Math.sin(Math.min(1, k * 1.2) * Math.PI) * 0.5;
			sealGrp.position.z = e * 1.0;
			sealGrp.position.y = -e * 0.55 + hop;
			sealGrp.rotation.x = e * 2.4;
			flapPivot.rotation.x = -e * 2.1;
		}
		grp.position.y = Math.sin(t * 0.5) * 0.09;
		grp.rotation.y = Math.sin(t * 0.23) * 0.3;
		grp.rotation.z = Math.sin(t * 0.31) * 0.05;
		const f = 0.82 + Math.sin(t * 11) * 0.16 + Math.sin(t * 23 + 1.7) * 0.09;
		fireP.intensity = 0.3 + f * 0.35;
		embers.forEach((e, i) => {
			const k = 0.5 + 0.5 * Math.sin(t * 7 + i * 2.1);
			e.material.color.setRGB(1, 0.35 + 0.25 * k, 0.08 + 0.1 * k);
		});
	};
}
