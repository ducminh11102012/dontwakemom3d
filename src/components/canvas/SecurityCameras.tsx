/**
 * SecurityCameras.tsx — the CCTV system (v1.5).
 *
 * Each security camera owns a small off-screen render target. Every frame we
 * re-render the live scene from a couple of those cameras (round-robin, so the
 * cost is spread out and the feeds get a chunky, low-fps "security cam" feel)
 * and paint the results onto a bank of monitors in the upstairs Security Room.
 *
 * Because we render the real scene, Mom — and anything else — shows up on the
 * monitors whenever she steps into a camera's view. The blind spots are
 * physical: narrow FOVs, corner mounts, and rooms with no camera at all.
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LEVEL_Y } from '../../game/house';
import { SECURITY_CAMS, type SecurityCam } from '../../game/cameras';
import { useGameStore } from '../../state/gameStore';

const FEED_W = 256;
const FEED_H = 192;

// ── monitor bank layout (west wall of the upstairs Security Room) ────────────
const WALL_X = 0.24; // just proud of the exterior wall at x=0
const SCREEN_W = 0.56; // along the wall (Z)
const SCREEN_H = 0.42;
const COL_Z = [1.25, 1.95, 2.65]; // three columns
const ROW_Y = [LEVEL_Y + 1.72, LEVEL_Y + 1.24]; // two rows (upstairs floor + height)

interface Feed {
  def: SecurityCam;
  rt: THREE.WebGLRenderTarget;
  cam: THREE.PerspectiveCamera;
  /** base look direction (unit) for the panning sweep */
  baseDir: THREE.Vector3;
  panAmp: number; // radians
  panSpeed: number;
  panPhase: number;
}

const DEG = Math.PI / 180;
/** night-vision boost: feeds render brighter than the (very dark) live view */
const FEED_EXPOSURE = 2.4;
const _panTarget = new THREE.Vector3();

// ── text labels baked to small canvas textures ───────────────────────────────

function makeLabelTexture(text: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 36;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#0a120c';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#5fe89a';
  ctx.font = 'bold 20px monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 8, cv.height / 2 + 1);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeNoSignalTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = FEED_W;
  cv.height = FEED_H;
  const ctx = cv.getContext('2d')!;
  // grey static speckle
  const img = ctx.createImageData(cv.width, cv.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 30 + Math.random() * 70;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, cv.height / 2 - 22, cv.width, 44);
  ctx.fillStyle = '#c4c8cc';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NO SIGNAL', cv.width / 2, cv.height / 2 + 9);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── one monitor (screen + green CCTV glaze + bezel + label + REC dot) ─────────

function Monitor({
  map,
  z,
  y,
  label,
  live,
}: {
  map: THREE.Texture;
  z: number;
  y: number;
  label: string;
  live: boolean;
}) {
  const labelTex = useMemo(() => makeLabelTexture(label), [label]);
  useEffect(() => () => labelTex.dispose(), [labelTex]);
  const recRef = useRef<THREE.Mesh>(null);

  // blinking REC light on live feeds
  useFrame(({ clock }) => {
    if (recRef.current) recRef.current.visible = live && Math.sin(clock.elapsedTime * 4) > 0;
  });

  return (
    <group position={[WALL_X, y, z]} rotation={[0, Math.PI / 2, 0]}>
      {/* bezel */}
      <mesh position={[0, 0, -0.012]}>
        <boxGeometry args={[SCREEN_W + 0.06, SCREEN_H + 0.12, 0.05]} />
        <meshStandardMaterial color="#0c0d10" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* the live feed */}
      <mesh>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
      {/* green CCTV glaze (additive, subtle) */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial
          color="#3bff86"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* label strip under the screen */}
      <mesh position={[0, -SCREEN_H / 2 - 0.04, 0.001]}>
        <planeGeometry args={[SCREEN_W, 0.07]} />
        <meshBasicMaterial map={labelTex} toneMapped={false} />
      </mesh>
      {/* REC light */}
      <mesh ref={recRef} position={[SCREEN_W / 2 - 0.05, SCREEN_H / 2 - 0.05, 0.004]}>
        <circleGeometry args={[0.012, 10]} />
        <meshBasicMaterial color="#ff3b3b" toneMapped={false} />
      </mesh>
    </group>
  );
}

// ── the physical camera dotted around the watched rooms ───────────────────────

function CamProp({ def }: { def: SecurityCam }) {
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    // Aim the lens (built on +Z) at the target. Matrix4.lookAt(eye, target)
    // gives a -Z look direction, so we swap eye/target to get +Z → target —
    // computed straight from the literal coords, no reliance on matrixWorld.
    const m = new THREE.Matrix4().lookAt(
      new THREE.Vector3(def.look[0], def.look[1], def.look[2]),
      new THREE.Vector3(def.pos[0], def.pos[1], def.pos[2]),
      g.up,
    );
    g.quaternion.setFromRotationMatrix(m);
  }, [def]);

  return (
    <group ref={ref} position={def.pos}>
      {/* housing */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[0.13, 0.1, 0.2]} />
        <meshStandardMaterial color="#1b1e22" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* lens */}
      <mesh position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.05, 0.07, 14]} />
        <meshStandardMaterial color="#0a0b0d" roughness={0.25} metalness={0.6} />
      </mesh>
      {/* glass glint */}
      <mesh position={[0, 0, 0.146]}>
        <circleGeometry args={[0.035, 14]} />
        <meshStandardMaterial color="#16313a" roughness={0.1} metalness={0.9} />
      </mesh>
      {/* live LED */}
      <mesh position={[0.05, 0.04, 0.05]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshBasicMaterial color="#ff4040" toneMapped={false} />
      </mesh>
      <pointLight position={[0.05, 0.04, 0.1]} intensity={0.18} distance={0.7} color="#ff5a5a" decay={2} />
      {/* short ceiling mount */}
      <mesh position={[0, 0.12, -0.04]}>
        <boxGeometry args={[0.03, 0.16, 0.03]} />
        <meshStandardMaterial color="#15171a" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ── glow cast by the monitor wall (the credenza below is real furniture) ──────

function SecurityGlow() {
  const y0 = LEVEL_Y; // upstairs floor
  return (
    <group>
      <pointLight position={[0.95, y0 + 1.5, 1.95]} intensity={1.8} distance={3.6} color="#4affa0" decay={2} />
      <pointLight position={[1.0, y0 + 1.1, 2.6]} intensity={0.7} distance={2.4} color="#3affa0" decay={2} />
    </group>
  );
}

// ── main ───────────────────────────────────────────────────────────────────

export default function SecurityCameras() {
  const monitorsRef = useRef<THREE.Group>(null);

  const feeds = useMemo<Feed[]>(
    () =>
      SECURITY_CAMS.map((def) => {
        const rt = new THREE.WebGLRenderTarget(FEED_W, FEED_H, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          depthBuffer: true,
        });
        // NOTE: leave the target texture in the default (linear) color space.
        // Flagging it sRGB made the renderer's output get decoded a second
        // time on read, crushing the already-dark feeds to pure black.
        const cam = new THREE.PerspectiveCamera(def.fov, FEED_W / FEED_H, 0.1, 45);
        cam.position.set(def.pos[0], def.pos[1], def.pos[2]);
        cam.lookAt(def.look[0], def.look[1], def.look[2]);
        const baseDir = new THREE.Vector3(
          def.look[0] - def.pos[0],
          def.look[1] - def.pos[1],
          def.look[2] - def.pos[2],
        ).normalize();
        return {
          def,
          rt,
          cam,
          baseDir,
          panAmp: (def.panDeg ?? 0) * DEG,
          panSpeed: def.panSpeed ?? 0,
          panPhase: def.panPhase ?? 0,
        };
      }),
    [],
  );

  const noSignal = useMemo(() => makeNoSignalTexture(), []);

  // Greenish "IR illuminator" lights that live permanently in the scene at
  // intensity 0 (so they never affect the real first-person view and never
  // trigger a shader recompile). We pulse their intensity up only for the
  // duration of the feed render, so the dark night-time rooms are bright
  // enough to read on the monitors instead of crushing to black.
  const nvHemiRef = useRef<THREE.HemisphereLight>(null);
  const nvAmbRef = useRef<THREE.AmbientLight>(null);

  useEffect(
    () => () => {
      feeds.forEach((f) => f.rt.dispose());
      noSignal.dispose();
    },
    [feeds, noSignal],
  );

  // Re-render the feeds into their off-screen targets. We run at a negative
  // priority so this happens before PostFX's EffectComposer (priority 1) takes
  // over the render loop. We fully reset the renderer state (autoClear,
  // scissor, viewport) the composer leaves behind, otherwise the off-screen
  // passes never actually draw the scene and read back black.
  useFrame((state) => {
    const phase = useGameStore.getState().gamePhase;
    if (phase !== 'playing' && phase !== 'phone') return;
    const { gl, scene } = state;
    const t = state.clock.elapsedTime;

    const prevAutoClear = gl.autoClear;
    const prevExposure = gl.toneMappingExposure;
    const prevScissor = gl.getScissorTest();
    gl.autoClear = true;
    gl.setScissorTest(false);
    gl.toneMappingExposure = FEED_EXPOSURE; // brighten feeds (night vision)
    // hide the monitors so a camera can never film its own live feed
    // (would be a texture read/write feedback loop)
    const monitors = monitorsRef.current;
    if (monitors) monitors.visible = false;
    // night-vision fill: lit only for the feed render, zeroed before main view
    if (nvHemiRef.current) nvHemiRef.current.intensity = 2.6;
    if (nvAmbRef.current) nvAmbRef.current.intensity = 1.0;

    for (const f of feeds) {
      // aim the (optionally) panning camera, then make sure its matrices are
      // current before we render through it
      if (f.panAmp > 0) {
        const ang = f.panAmp * Math.sin(t * f.panSpeed + f.panPhase);
        const d = f.baseDir;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        _panTarget.set(
          f.cam.position.x + d.x * cos + d.z * sin,
          f.cam.position.y + d.y,
          f.cam.position.z - d.x * sin + d.z * cos,
        );
        f.cam.lookAt(_panTarget);
      }
      f.cam.updateMatrixWorld(true);

      gl.setRenderTarget(f.rt);
      gl.setViewport(0, 0, FEED_W, FEED_H);
      gl.clear();
      gl.render(scene, f.cam);
    }

    if (nvHemiRef.current) nvHemiRef.current.intensity = 0;
    if (nvAmbRef.current) nvAmbRef.current.intensity = 0;
    gl.setRenderTarget(null);
    gl.setScissorTest(prevScissor);
    gl.autoClear = prevAutoClear;
    gl.toneMappingExposure = prevExposure;
    if (monitors) monitors.visible = true;
  }, -1);

  // monitor grid: 5 live feeds fill the first five cells, the 6th is offline
  const cells = [
    { z: COL_Z[0], y: ROW_Y[0] },
    { z: COL_Z[1], y: ROW_Y[0] },
    { z: COL_Z[2], y: ROW_Y[0] },
    { z: COL_Z[0], y: ROW_Y[1] },
    { z: COL_Z[1], y: ROW_Y[1] },
    { z: COL_Z[2], y: ROW_Y[1] },
  ];

  return (
    <group>
      {/* night-vision fill lights — kept at intensity 0, pulsed during feed render */}
      <hemisphereLight ref={nvHemiRef} args={['#9bffc4', '#0a1810', 0]} />
      <ambientLight ref={nvAmbRef} color="#bfffd6" intensity={0} />
      <SecurityGlow />
      <group ref={monitorsRef}>
        {feeds.map((f, i) => (
          <Monitor key={f.def.id} map={f.rt.texture} z={cells[i].z} y={cells[i].y} label={f.def.label} live />
        ))}
        {/* 6th screen: no camera here → offline */}
        <Monitor map={noSignal} z={cells[5].z} y={cells[5].y} label="CAM 6 · OFFLINE" live={false} />
      </group>
      {SECURITY_CAMS.map((def) => (
        <CamProp key={def.id} def={def} />
      ))}
    </group>
  );
}
