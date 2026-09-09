import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { stageOf } from "../components/PlantSprite";
import { isMature } from "../game/logic";
import { COLUMNS, MAX_ROWS, PLANTS } from "../game/plants";
import { DECOS } from "../game/decor";
import { plantTier } from "../game/evolve";
import { PETS } from "../game/pets";
import type { GameState, Plot } from "../game/types";
import EmojiSprite, { emojiTexture } from "./EmojiSprite";
import PlantMesh from "./PlantMesh";

const PLOT_GAP = 1.2;

const SKY: Record<GameState["weather"], string> = {
  sunny: "#aee3ff",
  hot: "#ffd9a8",
  rain: "#a9becd",
};

const DRY = new THREE.Color("#a1805a");
const WET = new THREE.Color("#6d5136");
const SOIL = { dry: DRY, wet: WET };

function soilColor(water: number, locked: boolean, plantable: boolean): THREE.Color {
  if (locked) return new THREE.Color("#8a8a80");
  const c = SOIL.dry.clone().lerp(SOIL.wet, water);
  if (plantable) c.lerp(new THREE.Color("#ffffff"), 0.18);
  return c;
}

function Rain() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 13;
      arr[i * 3 + 1] = Math.random() * 7;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 13;
    }
    return arr;
  }, []);
  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - dt * 5.5;
      if (y < 0) y = 7;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#dceafc" transparent opacity={0.85} />
    </points>
  );
}

/** a companion pet strolling back and forth along the front of the garden */
function PetWander({ emoji, phase }: { emoji: string; phase: number }) {
  const ref = useRef<THREE.Sprite>(null);
  const map = useMemo(() => emojiTexture(emoji), [emoji]);
  useFrame(({ clock }) => {
    const sp = ref.current;
    if (!sp) return;
    const t = clock.elapsedTime;
    sp.position.x = Math.sin(t * 0.25 + phase) * 4.6;
    sp.position.z = 2.9;
    sp.position.y = 0.42 + Math.sin(t * 2 + phase) * 0.05;
  });
  return (
    <sprite ref={ref} position={[0, 0.42, 2.9]} scale={[0.5, 0.5, 1]}>
      <spriteMaterial map={map} transparent depthWrite={false} />
    </sprite>
  );
}

function PlantWithBadge({ plot, tier }: { plot: Plot; tier: number }) {
  const ref = useRef<THREE.Group>(null);
  const mature = isMature(plot);
  useFrame(({ clock }) => {
    if (mature && ref.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.035;
      ref.current.scale.setScalar(s);
    }
  });
  const stage = stageOf(plot.progress);
  const badge = mature
    ? plot.golden && plot.boost > 1
      ? "✨🐝"
      : plot.golden
        ? "✨"
        : plot.boost > 1
          ? "🐝"
          : "👆"
    : null;
  const needsWater = !PLANTS[plot.plant!].noWater && !mature && plot.water < 0.3;
  return (
    <group position={[0, 0.18, 0]}>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 10]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
      <group ref={ref}>
        <PlantMesh plant={plot.plant!} stage={stage} tier={tier} />
      </group>
      {mature && plot.golden && <pointLight color="#ffd54f" intensity={1.6} distance={1.6} position={[0, 0.7, 0]} />}
      {badge && <EmojiSprite emoji={badge} position={[0, 1.05, 0]} scale={0.55} bob />}
      {needsWater && <EmojiSprite emoji="💧" position={[0.42, 0.55, 0]} scale={0.4} bob />}
      {!mature && plot.fertilized && <EmojiSprite emoji="🪴" position={[-0.42, 0.55, 0]} scale={0.38} bob />}
    </group>
  );
}

function Plot3D({
  index,
  plot,
  locked,
  canPlant,
  tier,
  onPlotTap,
}: {
  index: number;
  plot: Plot;
  locked: boolean;
  canPlant: boolean;
  tier: number;
  onPlotTap: (i: number) => void;
}) {
  const row = Math.floor(index / COLUMNS);
  const col = index % COLUMNS;
  const x = (col - (COLUMNS - 1) / 2) * PLOT_GAP;
  const z = (row - (MAX_ROWS - 1) / 2) * PLOT_GAP;
  const growing = plot.plant !== null && !isMature(plot);
  const soil = soilColor(plot.water, locked, !plot.plant && canPlant && !locked);
  return (
    <group position={[x, 0, z]}>
      <mesh
        position={[0, 0.09, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onPlotTap(index);
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <boxGeometry args={[1.05, 0.18, 1.05]} />
        <meshStandardMaterial color={soil} flatShading />
      </mesh>
      {locked ? (
        <EmojiSprite emoji="🔒" position={[0, 0.75, 0]} scale={0.5} bob />
      ) : (
        <>
          {plot.plant && <PlantWithBadge plot={plot} tier={tier} />}
          {growing && (
            <group position={[0, 0.26, 0.62]}>
              <mesh>
                <boxGeometry args={[0.74, 0.06, 0.045]} />
                <meshBasicMaterial color="#37474f" />
              </mesh>
              <mesh position={[-0.37 * (1 - plot.progress), 0, 0.005]} scale={[Math.max(0.001, plot.progress), 1, 1]}>
                <boxGeometry args={[0.7, 0.045, 0.045]} />
                <meshBasicMaterial color="#66bb6a" />
              </mesh>
            </group>
          )}
        </>
      )}
    </group>
  );
}

interface WorldProps {
  state: GameState;
  canPlant: boolean;
  onPlotTap: (i: number) => void;
  worldRef: React.RefObject<THREE.Group | null>;
  /** pinch/wheel zoom factor (1 = default framing), mutated by the wrapper */
  zoomRef: { current: number };
}

/** keeps the camera aimed at the garden and eases in pinch/wheel zoom */
function CameraRig({ zoomRef }: { zoomRef: { current: number } }) {
  const { camera } = useThree();
  useFrame((_, delta) => {
    const z = zoomRef.current;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 6, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 6.6 * z, 6, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 7.6 * z, 6, delta);
    camera.lookAt(0, 0.5, 0);
  });
  return null;
}

function World({ state, canPlant, onPlotTap, worldRef }: Omit<WorldProps, "zoomRef">) {
  const sky = SKY[state.weather];
  const amb = state.weather === "hot" ? 1.0 : state.weather === "rain" ? 0.6 : 0.85;
  const sun = state.weather === "hot" ? 1.5 : state.weather === "rain" ? 0.5 : 1.2;
  const ownedDecos = DECOS.filter((d) => state.decorations[d.id]);
  const ownedPets = PETS.filter((p) => state.pets[p.id]);
  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 13, 26]} />
      <ambientLight intensity={amb} />
      <directionalLight position={[4, 8, 3]} intensity={sun} />
      <directionalLight position={[-5, 6, -4]} intensity={0.3} color="#cfe8ff" />
      {state.weather === "rain" && <Rain />}
      {/* grass ground */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[14, 0.2, 14]} />
        <meshStandardMaterial color={state.weather === "rain" ? "#6d9e6a" : "#7cb868"} flatShading />
      </mesh>
      <group ref={worldRef}>
        {state.plots.map((p, i) => (
          <Plot3D
            key={i}
            index={i}
            plot={p}
            locked={i >= state.rows * COLUMNS}
            canPlant={canPlant}
            tier={p.plant ? plantTier(state, p.plant) : 0}
            onPlotTap={onPlotTap}
          />
        ))}
        {ownedDecos.map((d, i) => (
          <EmojiSprite key={d.id} emoji={d.emoji} position={[i * 0.75 - ((ownedDecos.length - 1) * 0.75) / 2, 0.7, -3.2]} scale={0.6} bob />
        ))}
        {ownedPets.map((p, i) => (
          <PetWander key={p.id} emoji={p.emoji} phase={i * 2.1} />
        ))}
      </group>
    </>
  );
}

export default function GardenScene({ zoomRef, ...worldProps }: WorldProps) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 6.6, 7.6], fov: 42 }}>
      <CameraRig zoomRef={zoomRef} />
      <World {...worldProps} />
    </Canvas>
  );
}
