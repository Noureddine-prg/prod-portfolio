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

	// chop-on-pop: expand.ts sets data-pop at Work click — the axe lifts, sweeps a
	// parabolic arc, and chops back down onto its embedded pose with a stump shudder.
	// Everything is REST + offset where every offset is exactly 0 at k=1 and when idle,
	// so re-entry lands pixel-exact on the pre-chop frame and can never clip.
	const AXE_X0 = 0.42,
		AXE_Y0 = 0.02,
		AXE_RZ0 = -0.5,
		STUMP_Y0 = -0.62;
	let popT: number | null = null;
	return (t) => {
		const popped = ctx.canvas.dataset.pop === '1';
		if (popped && popT == null) popT = t;
		if (!popped && popT != null) {
			popT = null;
			axe.position.set(AXE_X0, AXE_Y0, 0);
			axe.rotation.z = AXE_RZ0;
			stump.position.y = STUMP_Y0;
		}
		if (popT == null) return;
		const k = Math.min(1, (t - popT) / 0.9);
		// arc height: ease up to an apex near 40%, then quadratic ease back to 0 at k=1
		const lift = k < 0.4 ? Math.sin((k / 0.4) * (Math.PI / 2)) : Math.pow(1 - (k - 0.4) / 0.6, 2);
		// x sweep: a clean parabola peaking mid-flight, zero at both ends
		const sweep = Math.sin(Math.PI * k);
		axe.position.x = AXE_X0 + sweep * 0.2; // out on the way up, back home on the way down
		axe.position.y = AXE_Y0 + lift * 0.45; // same max height as before
		axe.rotation.z = AXE_RZ0 + lift * 0.5; // cocks upright at apex, rolls back onto the bite
		// landing shudder, offset from the stump's REST y (not absolute — that was slamming
		// the log up into the blade and reading as a clip)
		const e = (k - 0.78) / 0.22;
		stump.position.y = STUMP_Y0 + (k >= 0.78 ? Math.sin(e * Math.PI * 3) * (1 - e) * 0.02 : 0);
	};
}
