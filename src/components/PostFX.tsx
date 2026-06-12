/**
 * PostFX.tsx
 * ----------
 * Minimal post-processing pipeline (Phase 1).
 *
 * Currently only a light vignette: it establishes the EffectComposer pipeline
 * that later phases extend (film grain, chromatic aberration, sanity-driven
 * distortion in Phase 4) and immediately pushes the image toward horror.
 */

import { EffectComposer, Vignette } from '@react-three/postprocessing';

export default function PostFX() {
  return (
    <EffectComposer>
      <Vignette eskil={false} offset={0.22} darkness={0.78} />
    </EffectComposer>
  );
}
