/**
 * PostFX.tsx — stress-driven post processing: vignette closes in,
 * film grain rises with stress (GDD §5 visual tiers).
 */

import { EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useGameStore } from '../state/gameStore';

export default function PostFX() {
  // coarse-grained selector → re-render only when the tier moves
  const tier = useGameStore((s) => Math.round(s.stress / 10));
  const v = Math.min(1, tier / 10);
  return (
    <EffectComposer>
      <Vignette eskil={false} offset={0.34 - v * 0.14} darkness={0.52 + v * 0.55} />
      <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.06 + v * 0.22} />
    </EffectComposer>
  );
}
