import { BUD_COLORS } from "../components/PlantSprite";
import type { PlantId } from "../game/types";
import type { Stage } from "../components/PlantSprite";

const STEM = "#558b2f";
const LEAF = "#66bb6a";
const LEAF_DARK = "#43a047";

function Stem({ h }: { h: number }) {
  return (
    <mesh position={[0, h / 2, 0]}>
      <cylinderGeometry args={[0.018, 0.032, h, 5]} />
      <meshStandardMaterial color={STEM} flatShading />
    </mesh>
  );
}

function Leaf({
  position,
  rotation,
  color = LEAF,
  s = 1,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color?: string;
  s?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} scale={[s, s * 0.32, s * 0.62]}>
      <sphereGeometry args={[0.1, 6, 5]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

/** ring of flat petals; petal i points radially at angle (i/n)·2π */
function Petals({
  n,
  color,
  r,
  y,
  len,
  tilt = 0.5,
  round = false,
}: {
  n: number;
  color: string | ((i: number) => string);
  r: number;
  y: number;
  len: number;
  tilt?: number;
  round?: boolean;
}) {
  const items = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    items.push(
      <mesh
        key={i}
        position={[Math.sin(a) * r, y, Math.cos(a) * r]}
        rotation={[tilt, a, 0]}
        scale={round ? [1, 0.45, 1] : [1, 0.3, 1.55]}
      >
        <sphereGeometry args={[len, 6, 5]} />
        <meshStandardMaterial color={typeof color === "function" ? color(i) : color} flatShading />
      </mesh>,
    );
  }
  return <group>{items}</group>;
}

function Center({ r, color, y = 0 }: { r: number; color: string; y?: number }) {
  return (
    <mesh position={[0, y, 0]}>
      <sphereGeometry args={[r, 8, 6]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

function Head({ plant, color }: { plant: PlantId; color: string }) {
  switch (plant) {
    case "grass":
      return (
        <group>
          {[-0.14, -0.07, 0, 0.07, 0.14].map((x, i) => (
            <mesh key={i} position={[x, 0.24, 0]} rotation={[0, 0, x * 1.6]}>
              <coneGeometry args={[0.025, 0.55 - Math.abs(x), 4]} />
              <meshStandardMaterial color={i % 2 ? LEAF : LEAF_DARK} flatShading />
            </mesh>
          ))}
        </group>
      );
    case "daisy":
      return (
        <group>
          <Petals n={10} color="#fafafa" r={0.07} y={0} len={0.075} />
          <Center r={0.05} color="#ffc107" />
        </group>
      );
    case "daffodil":
      return (
        <group>
          <Petals n={6} color="#fafafa" r={0.08} y={0} len={0.08} tilt={0.9} />
          <mesh position={[0, 0.02, 0]}>
            <coneGeometry args={[0.035, 0.12, 7]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
        </group>
      );
    case "tulip":
      return (
        <group>
          <Petals n={4} color={color} r={0.055} y={0.02} len={0.085} tilt={1.25} />
          <Petals n={4} color={color} r={0.035} y={0.07} len={0.07} tilt={1.35} />
        </group>
      );
    case "cactus":
      return (
        <group>
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.09, 0.11, 0.5, 7]} />
            <meshStandardMaterial color="#66bb6a" flatShading />
          </mesh>
          <mesh position={[0, 0.53, 0]}>
            <sphereGeometry args={[0.09, 7, 5]} />
            <meshStandardMaterial color="#66bb6a" flatShading />
          </mesh>
          <mesh position={[0.16, 0.3, 0]} rotation={[0, 0, -0.9]}>
            <cylinderGeometry args={[0.045, 0.055, 0.22, 6]} />
            <meshStandardMaterial color="#4caf50" flatShading />
          </mesh>
          <mesh position={[-0.14, 0.4, 0]} rotation={[0, 0, 0.9]}>
            <cylinderGeometry args={[0.04, 0.05, 0.18, 6]} />
            <meshStandardMaterial color="#4caf50" flatShading />
          </mesh>
          <Center r={0.045} color={color} y={0.62} />
        </group>
      );
    case "sunflower":
      return (
        <group>
          <Petals n={12} color={color} r={0.08} y={0} len={0.095} tilt={0.7} />
          <Center r={0.075} color="#795548" y={0.015} />
        </group>
      );
    case "lavender":
      return (
        <group>
          {[0.05, 0.12, 0.19, 0.26, 0.32].map((y, i) => (
            <mesh key={i} position={[0, y, 0]}>
              <sphereGeometry args={[0.05 - i * 0.006, 6, 5]} />
              <meshStandardMaterial color={color} flatShading />
            </mesh>
          ))}
        </group>
      );
    case "hyacinth":
      return (
        <group>
          {[[0, 0, 0], [0.05, 0.06, 0.03], [-0.05, 0.07, -0.02], [0.03, 0.13, -0.04], [-0.03, 0.15, 0.04], [0, 0.21, 0]].map(
            (p, i) => (
              <mesh key={i} position={p as [number, number, number]}>
                <sphereGeometry args={[0.045, 6, 5]} />
                <meshStandardMaterial color={color} flatShading />
              </mesh>
            ),
          )}
        </group>
      );
    case "rose":
      return (
        <group>
          <Petals n={5} color={color} r={0.075} y={0} len={0.075} tilt={0.8} />
          <Petals n={4} color="#c2185b" r={0.05} y={0.035} len={0.065} tilt={0.95} />
          <Petals n={3} color="#ad1457" r={0.03} y={0.07} len={0.055} tilt={1.1} />
        </group>
      );
    case "lotus":
      return (
        <group>
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.19, 0.21, 0.03, 9]} />
            <meshStandardMaterial color="#4caf50" flatShading />
          </mesh>
          <Petals n={8} color={color} r={0.09} y={0} len={0.095} tilt={1.15} />
          <Petals n={5} color="#f06292" r={0.045} y={0.05} len={0.06} tilt={1.35} />
          <Center r={0.035} color="#ffc107" y={0.03} />
        </group>
      );
    case "cherry":
      return (
        <group>
          <Petals n={5} color={color} r={0.07} y={0} len={0.08} tilt={0.75} round />
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2 + 0.4;
            return (
              <mesh key={i} position={[Math.sin(a) * 0.03, 0.03, Math.cos(a) * 0.03]}>
                <sphereGeometry args={[0.014, 5, 4]} />
                <meshStandardMaterial color="#ffee58" flatShading />
              </mesh>
            );
          })}
        </group>
      );
    case "rainbowflower":
      return (
        <group>
          <Petals n={8} color={(i) => `hsl(${(i / 8) * 360}, 75%, 62%)`} r={0.085} y={0} len={0.1} tilt={0.85} />
          <Center r={0.055} color="#fafafa" y={0.02} />
        </group>
      );
  }
}

/** stem height of the bloom head per plant (where the flower sits) */
const STEM_H: Record<PlantId, number> = {
  grass: 0.1,
  daisy: 0.5,
  daffodil: 0.52,
  tulip: 0.48,
  cactus: 0.1,
  sunflower: 0.6,
  lavender: 0.4,
  hyacinth: 0.42,
  rose: 0.52,
  lotus: 0.12,
  cherry: 0.5,
  rainbowflower: 0.55,
};

interface Props {
  plant: PlantId;
  stage: Stage;
}

export default function PlantMesh({ plant, stage }: Props) {
  const color = BUD_COLORS[plant];
  if (stage === "seed") {
    return (
      <group>
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.055, 6, 5]} />
          <meshStandardMaterial color="#a1887f" flatShading />
        </mesh>
        <mesh position={[0.06, 0.04, 0.03]}>
          <sphereGeometry args={[0.04, 6, 5]} />
          <meshStandardMaterial color="#8d6e63" flatShading />
        </mesh>
      </group>
    );
  }
  if (stage === "sprout") {
    return (
      <group>
        <Stem h={0.24} />
        <Leaf position={[-0.09, 0.12, 0]} rotation={[0, 0, 0.6]} />
        <Leaf position={[0.09, 0.16, 0]} rotation={[0, 0, -0.6]} color={LEAF_DARK} />
      </group>
    );
  }
  if (stage === "bud") {
    return (
      <group>
        <Stem h={0.44} />
        <Leaf position={[-0.1, 0.2, 0]} rotation={[0, 0, 0.6]} />
        <Leaf position={[0.1, 0.26, 0]} rotation={[0, 0, -0.6]} color={LEAF_DARK} />
        <mesh position={[0, 0.5, 0]} scale={[1, 1.45, 1]}>
          <sphereGeometry args={[0.06, 7, 6]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      </group>
    );
  }
  // bloom
  const h = STEM_H[plant];
  return (
    <group>
      {plant !== "grass" && plant !== "cactus" && plant !== "lotus" && <Stem h={h} />}
      {plant !== "grass" && plant !== "cactus" && (
        <>
          <Leaf position={[-0.1, h * 0.4, 0]} rotation={[0, 0, 0.6]} />
          <Leaf position={[0.1, h * 0.52, 0]} rotation={[0, 0, -0.6]} color={LEAF_DARK} />
        </>
      )}
      <group position={[0, h, 0]}>
        <Head plant={plant} color={color} />
      </group>
    </group>
  );
}
