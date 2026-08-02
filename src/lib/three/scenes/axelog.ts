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

	// chop-on-pop (data-pop at Work click): axe arcs up and chops back down. All REST +
	// offset, every offset exactly 0 at k=1/idle, so it lands pixel-exact — no clip.
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
		const KW = 0.38,
			KI = 0.8; // windup apex, impact
		// windup→chop shape: ease up to the cocked apex, then accelerate down into the bite
		const swing =
			k < KW
				? Math.sin((k / KW) * (Math.PI / 2))
				: k < KI
					? Math.pow(1 - (k - KW) / (KI - KW), 2)
					: 0;
		const arc = k < KI ? Math.sin(Math.PI * (k / KI)) : 0; // head arcs back over the windup, home by impact
		const u = (k - KI) / (1 - KI);
		const rec = k >= KI ? Math.sin(u * Math.PI * 3) * (1 - u) : 0; // decaying impact recoil, 0 at k=1
		axe.position.x = AXE_X0 - arc * 0.28;
		axe.position.y = AXE_Y0 + swing * 0.5 + rec * 0.03;
		axe.rotation.z = AXE_RZ0 + swing * 1.1 - rec * 0.06; // cock back, then chop through onto the bite
		stump.position.y = STUMP_Y0 + rec * 0.03; // impact shudder, offset from REST y
	};
}
