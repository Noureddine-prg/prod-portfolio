// axelog — splitting stump with axe (DC L2243-2269). Static build: ALL motion is the
// loop's spins table (auto-spin 0.004 + pointer-tilt 0.8), so this returns null.

import type { SceneCtx, UpdateFn } from '../types';

export function buildAxelog(ctx: SceneCtx): UpdateFn | null {
	const { T, scene, cam, spin } = ctx;

	cam.position.set(0, 0.85, 3.6);
	cam.lookAt(0, -0.05, 0);

	const wood = new T.MeshStandardMaterial({ color: '#5e402c', flatShading: true, roughness: 0.92 });
	const woodTop = new T.MeshStandardMaterial({
		color: '#c9a678',
		flatShading: true,
		roughness: 0.8
	});
	const stump = new T.Mesh(new T.CylinderGeometry(0.78, 0.88, 0.95, 11), [wood, woodTop, wood]);
	stump.position.y = -0.62;
	spin.add(stump);

	const ring = new T.Mesh(
		new T.TorusGeometry(0.52, 0.02, 6, 24),
		new T.MeshStandardMaterial({ color: '#a07d52', roughness: 0.9 })
	);
	ring.rotation.x = Math.PI / 2;
	ring.position.y = -0.144;
	spin.add(ring);

	// axe: head at group origin, handle rising from it — group sits above the rim so the
	// blade visibly bites the edge
	const axe = new T.Group();
	const handle = new T.Mesh(
		new T.CylinderGeometry(0.055, 0.078, 1.5, 7),
		new T.MeshStandardMaterial({ color: '#8a6a4a', flatShading: true, roughness: 0.85 })
	);
	handle.position.y = 0.72;
	axe.add(handle);
	const head = new T.Mesh(
		new T.BoxGeometry(0.55, 0.3, 0.13),
		new T.MeshStandardMaterial({
			color: '#b9bdc4',
			flatShading: true,
			metalness: 0.6,
			roughness: 0.35
		})
	);
	head.position.set(0.12, 0, 0);
	axe.add(head);
	const edge = new T.Mesh(
		new T.BoxGeometry(0.2, 0.4, 0.08),
		new T.MeshStandardMaterial({
			color: '#e3e6ea',
			flatShading: true,
			metalness: 0.7,
			roughness: 0.25
		})
	);
	edge.position.set(0.42, 0, 0);
	axe.add(edge);
	axe.rotation.z = -0.5;
	axe.position.set(0.42, 0.02, 0);
	spin.add(axe);

	spin.rotation.y = 0.5;

	const key = new T.DirectionalLight(0xffd6a0, 1.2);
	key.position.set(3, 3, 2);
	scene.add(key);
	const fill = new T.DirectionalLight(0x6a86ff, 0.5);
	fill.position.set(-2.5, 0.5, 1.5);
	scene.add(fill);
	scene.add(new T.AmbientLight(0x2a2020, 0.9));

	// chop-on-pop: expand.ts sets data-pop at Work click — the axe lifts, swings into
	// the wood with a stump shudder, and settles; resets when the flag clears.
	let popT: number | null = null;
	return (t) => {
		const popped = ctx.canvas.dataset.pop === '1';
		if (popped && popT == null) popT = t;
		if (!popped && popT != null) {
			popT = null;
			axe.rotation.z = -0.5;
			axe.position.y = 0.02;
			stump.position.y = 0;
		}
		if (popT == null) return;
		const k = Math.min(1, (t - popT) / 0.9);
		if (k < 0.45) {
			const e = 1 - Math.pow(1 - k / 0.45, 3);
			axe.rotation.z = -0.5 - e * 0.7; // lift into the air
			axe.position.y = 0.02 + e * 0.2;
		} else if (k < 0.72) {
			const e = Math.pow((k - 0.45) / 0.27, 2);
			axe.rotation.z = -1.2 + e * 0.7; // accelerate down, landing exactly at rest
			axe.position.y = 0.22 - e * 0.2;
		} else {
			axe.rotation.z = -0.5;
			axe.position.y = 0.02;
			const e = (k - 0.72) / 0.28;
			stump.position.y = Math.sin(e * Math.PI * 3) * (1 - e) * 0.02; // impact shudder
		}
	};
}
