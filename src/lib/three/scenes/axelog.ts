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
	// pendulum pivot at the handle grip: the head hangs below and sweeps a down-arc, blade
	// edge leading (plus a bite tilt at impact), instead of dropping head-first
	axe.updateMatrix();
	const grip = new T.Vector3(0, 1.47, 0).applyMatrix4(axe.matrix);
	const swingGrp = new T.Group();
	swingGrp.position.copy(grip);
	axe.position.sub(grip); // keep the world rest pose after reparenting under the grip
	swingGrp.add(axe);
	spin.add(swingGrp);

	spin.rotation.y = 0.5;

	const key = new T.DirectionalLight(0xffd6a0, 1.2);
	key.position.set(3, 3, 2);
	scene.add(key);
	const fill = new T.DirectionalLight(0x6a86ff, 0.5);
	fill.position.set(-2.5, 0.5, 1.5);
	scene.add(fill);
	scene.add(new T.AmbientLight(0x2a2020, 0.9));

	// chop-on-pop (data-pop at Work click): the axe cocks up to a horizontal-right windup, then
	// swings a clockwise quarter-arc down into the log blade-first, and settles to the exact rest.
	const STUMP_Y0 = -0.62;
	const AXE_RZ0 = -0.5;
	const COCK = 1.5; // windup angle (rad) about the grip — head up-and-back, stays in frame
	const BITE = -0.3; // extra blade-forward tilt at impact so the sharp edge visibly leads in
	let popT: number | null = null;
	let heldSpin = 0;
	return (t) => {
		const popped = ctx.canvas.dataset.pop === '1';
		if (popped && popT == null) {
			popT = t;
			heldSpin = spin.rotation.y; // freeze the view for a clean, readable strike
		}
		if (!popped && popT != null) {
			popT = null;
			swingGrp.rotation.z = 0;
			axe.rotation.z = AXE_RZ0;
			stump.position.y = STUMP_Y0;
		}
		if (popT == null) return;
		const k = Math.min(1, (t - popT) / 0.9);
		const KW = 0.4,
			KI = 0.82; // windup apex, impact
		// hang at the cocked apex, then ACCELERATE the head down through the arc into the bite
		const sw =
			k < KW
				? Math.sin((k / KW) * (Math.PI / 2))
				: k < KI
					? 1 - Math.pow((k - KW) / (KI - KW), 2)
					: 0;
		const u = (k - KI) / (1 - KI);
		const rec = k >= KI ? Math.sin(u * Math.PI * 3) * (1 - u) : 0; // decaying impact recoil, 0 at k=1
		// bite tilt peaks as the edge drives in (late downswing / impact), 0 at apex and k=1
		const bite = k < KW ? 0 : k < KI ? Math.pow((k - KW) / (KI - KW), 2) : 1 - u;
		swingGrp.rotation.z = sw * COCK + rec * 0.04;
		axe.rotation.z = AXE_RZ0 + BITE * bite;
		stump.position.y = STUMP_Y0 + rec * 0.03; // impact shudder, offset from REST y
		spin.rotation.y = heldSpin; // C: hold the auto-spin steady through the chop
	};
}
