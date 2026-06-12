/**
 * App.tsx — application root: fullscreen R3F canvas (keyed by runId so every
 * new run remounts the whole scene) + HUD + full-screen overlays.
 */

import { Canvas } from '@react-three/fiber';
import { useGameStore } from './state/gameStore';
import Experience from './components/Experience';
import HUD from './components/ui/HUD';
import Overlays from './components/ui/Overlays';
import './App.css';

export default function App() {
  const runId = useGameStore((s) => s.runId);
  return (
    <div className="app-root">
      <Canvas
        key={runId}
        camera={{ fov: 75, near: 0.05, far: 60 }}
        gl={{ antialias: true }}
        dpr={[1, 1.75]}
      >
        <Experience />
      </Canvas>
      <HUD />
      <Overlays />
    </div>
  );
}
