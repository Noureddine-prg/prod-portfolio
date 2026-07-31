// Flame scene — verbatim port of the DC `kind === 'flame'` branch (L2822-2845).
// Lives on the Contact EXPANDED card; the renderer's alpha compositing (build.ts) is what
// sits the additive flame over the card — NO lights, NO glow sprite (shader is self-lit).
// GLSL + cone factory come from shared.ts (was window.__DC_* in the DC file).

import { mkFlame } from './shared';
import type { SceneCtx, UpdateFn } from '../types';

export function buildFlame(ctx: SceneCtx): UpdateFn | null {
	const { T, cam, spin, rand } = ctx;
	cam.position.set(0, 0.72, 2.3);
	cam.lookAt(0, 0.62, 0);
	const fA = mkFlame(T, spin, 0.44, 1.0, 1.0, 0.58);
	const fB = mkFlame(T, spin, 0.25, 0.64, 0.7, 0.4);
	const en2 = 22,
		eg2 = new T.BufferGeometry(),
		ep2 = new Float32Array(en2 * 3),
		ev2: number[] = [];
	for (let i = 0; i < en2; i++) {
		ep2[i * 3] = (rand() - 0.5) * 0.3;
		ep2[i * 3 + 1] = rand() * 1.7;
		ep2[i * 3 + 2] = (rand() - 0.5) * 0.3;
		ev2.push(0.004 + rand() * 0.009);
	}
	// held directly (not via eg2.attributes.position) so TS doesn't widen to GLBufferAttribute
	const eAttr = new T.BufferAttribute(ep2, 3);
	eg2.setAttribute('position', eAttr);
	spin.add(
		new T.Points(
			eg2,
			new T.PointsMaterial({
				color: 0xff9d4a,
				size: 0.036,
				transparent: true,
				opacity: 0.9,
				blending: T.AdditiveBlending,
				depthWrite: false
			})
		)
	);
	return (t) => {
		(fA.material as InstanceType<typeof T.ShaderMaterial>).uniforms.uTime.value = t;
		(fB.material as InstanceType<typeof T.ShaderMaterial>).uniforms.uTime.value = t * 1.15 + 3;
		const pa = eAttr.array as Float32Array;
		for (let i = 0; i < en2; i++) {
			pa[i * 3 + 1] += ev2[i];
			if (pa[i * 3 + 1] > 1.7) {
				pa[i * 3 + 1] = 0.1;
				pa[i * 3] = (rand() - 0.5) * 0.3;
				pa[i * 3 + 2] = (rand() - 0.5) * 0.3;
			}
		}
		eAttr.needsUpdate = true;
	};
}
