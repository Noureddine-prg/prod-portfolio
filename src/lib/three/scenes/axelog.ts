// axelog — splitting stump with axe (DC L2243-2269). The axe rests bit-down in the stump;
// the view sways gently about the authored angle (no loop spin) and a Work click plays a
// chop that always reads from that angle.

import type * as THREE from 'three';
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

	// axe: head at group origin, handle rising from it, bit at local +x
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
	// bit: a wedge that flares along the handle axis and thins to a cutting edge at +x
	const BIT_LEN = 0.26;
	const BIT_X = 0.43; // centre; the cutting edge sits at BIT_X + BIT_LEN / 2
	const bitGeo = new T.BoxGeometry(BIT_LEN, 0.34, 0.13);
	const bp = bitGeo.attributes.position as THREE.BufferAttribute;
	for (let i = 0; i < bp.count; i++) {
		if (bp.getX(i) > 0) {
			bp.setY(i, bp.getY(i) * 1.35);
			bp.setZ(i, bp.getZ(i) * 0.08);
		}
	}
	bitGeo.computeVertexNormals();
	const edge = new T.Mesh(
		bitGeo,
		new T.MeshStandardMaterial({
			color: '#e3e6ea',
			flatShading: true,
			metalness: 0.7,
			roughness: 0.25
		})
	);
	edge.position.set(BIT_X, 0, 0);
	axe.add(edge);

	// Rest pose: the bit points down into the stump (handle rising up-right at ~36°) and
	// the whole cutting edge, flare included, sits just below the top face.
	const AXE_RZ0 = -0.95;
	const STUMP_TOP = stump.position.y + 0.95 / 2;
	const tipLocal = new T.Vector3(BIT_X + BIT_LEN / 2, 0, 0);
	const flare = new T.Vector3(0, (0.34 * 1.35) / 2, 0); // half the edge line
	const rot = new T.Matrix4().makeRotationZ(AXE_RZ0);
	const tipOff = tipLocal.clone().applyMatrix4(rot);
	const flareOff = flare.clone().applyMatrix4(rot);
	const tipWorld = new T.Vector3(0.5, STUMP_TOP - Math.abs(flareOff.y) - 0.012, 0.2); // bites the front-right rim
	axe.rotation.z = AXE_RZ0;
	axe.position.copy(tipWorld).sub(tipOff);

	// swing pivot at the handle grip
	axe.updateMatrix();
	const grip = new T.Vector3(0, 1.47, 0).applyMatrix4(axe.matrix);
	const swingGrp = new T.Group();
	swingGrp.position.copy(grip);
	axe.position.sub(grip); // keep the world rest pose after reparenting under the grip
	swingGrp.add(axe);
	spin.add(swingGrp);

	const VIEW_Y = 0.5;
	spin.rotation.y = VIEW_Y;

	const key = new T.DirectionalLight(0xffd6a0, 1.2);
	key.position.set(3, 3, 2);
	scene.add(key);
	const fill = new T.DirectionalLight(0x6a86ff, 0.5);
	fill.position.set(-2.5, 0.5, 1.5);
	scene.add(fill);
	scene.add(new T.AmbientLight(0x2a2020, 0.9));

	// Chop-on-pop (data-pop at Work click): pull the bit out and raise the head (clockwise
	// about the grip, plus a lift), hang, then strike counter-clockwise. At rest the head's
	// path tangent equals the bit direction, so the cutting edge leads into the wood.
	const STUMP_Y0 = stump.position.y;
	const GRIP_Y0 = grip.y;
	const COCK = -0.5; // windup about the grip; keeps the raised head in frame
	const LIFT = 0.28;
	const BITE = 0.045; // overshoot past rest at impact, decays back to the rest pose
	const DUR = 0.85;
	const SWAY_AMP = 0.3;
	const SWAY_FREQ = 0.3;
	const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
	let popT: number | null = null;
	let spinFrom = VIEW_Y;
	let swayIn = 1; // sway weight; ramps back in after a chop so the view never jumps

	return (t, dt) => {
		const popped = ctx.canvas.dataset.pop === '1';
		if (popped && popT == null) {
			popT = t;
			spinFrom = spin.rotation.y;
		}
		if (!popped && popT != null) {
			popT = null;
			swingGrp.rotation.z = 0;
			swingGrp.position.y = GRIP_Y0;
			stump.position.y = STUMP_Y0;
			swayIn = 0;
		}

		if (popT == null) {
			swayIn = Math.min(1, swayIn + dt * 0.8);
			spin.rotation.y = VIEW_Y + Math.sin(t * SWAY_FREQ) * SWAY_AMP * swayIn;
			return;
		}

		const k = Math.min(1, (t - popT) / DUR);
		const KW = 0.36, // windup done
			KH = 0.46, // hang ends, strike begins
			KI = 0.6; // impact
		let r: number, lift: number, shud = 0;
		if (k < KW) {
			const e = easeOut(k / KW);
			r = COCK * e;
			lift = LIFT * e;
		} else if (k < KH) {
			const h = (k - KW) / (KH - KW);
			r = COCK * (1 + 0.04 * Math.sin(h * Math.PI));
			lift = LIFT;
		} else if (k < KI) {
			const s = Math.pow((k - KH) / (KI - KH), 3); // accelerate into the strike
			r = COCK * (1 - s);
			lift = LIFT * (1 - s);
		} else {
			const u = (k - KI) / (1 - KI);
			shud = Math.sin(u * Math.PI * 3) * (1 - u);
			r = BITE * Math.pow(1 - u, 2) + shud * 0.02;
			lift = 0;
		}
		const dip = Math.abs(shud) * 0.025; // impact shudder; the axe rides it so the bit stays buried
		swingGrp.rotation.z = r;
		swingGrp.position.y = GRIP_Y0 + lift - dip;
		stump.position.y = STUMP_Y0 - dip;
		// ease the view to the authored angle during the windup so the arc always reads
		spin.rotation.y = spinFrom + (VIEW_Y - spinFrom) * easeOut(Math.min(1, k / KW));
	};
}
