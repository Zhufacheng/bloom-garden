import type { PlantId } from "../game/types";

export type Stage = "seed" | "sprout" | "bud" | "bloom";

export function stageOf(progress: number): Stage {
  if (progress < 0.25) return "seed";
  if (progress < 0.5) return "sprout";
  if (progress < 0.75) return "bud";
  return "bloom";
}

export const BUD_COLORS: Record<PlantId, string> = {
  grass: "#66bb6a",
  daisy: "#fafafa",
  daffodil: "#ffd54f",
  cactus: "#81c784",
  tulip: "#f06292",
  lavender: "#b39ddb",
  sunflower: "#ffc107",
  hyacinth: "#90caf9",
  rose: "#ec407a",
  lotus: "#f48fb1",
  cherry: "#f8bbd0",
  rainbowflower: "#b39ddb",
};

function Seed() {
  return (
    <g>
      <ellipse cx="32" cy="53" rx="11" ry="4.5" fill="rgba(0,0,0,0.18)" />
      <ellipse cx="29" cy="50" rx="3.2" ry="2.4" fill="#a1887f" />
      <ellipse cx="35" cy="51.5" rx="2.8" ry="2" fill="#8d6e63" />
    </g>
  );
}

function Sprout() {
  return (
    <g>
      <path d="M32 56 C32 50 32 46 32 42" stroke="#66bb6a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="26" cy="44" rx="5.5" ry="3" fill="#81c784" transform="rotate(-32 26 44)" />
      <ellipse cx="38" cy="46" rx="5.5" ry="3" fill="#66bb6a" transform="rotate(30 38 46)" />
    </g>
  );
}

function Bud({ color }: { color: string }) {
  return (
    <g>
      <path d="M32 56 C32 48 32 40 32 30" stroke="#558b2f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="25.5" cy="45" rx="6" ry="3" fill="#66bb6a" transform="rotate(-32 25.5 45)" />
      <ellipse cx="38.5" cy="49" rx="6" ry="3" fill="#558b2f" transform="rotate(30 38.5 49)" />
      <ellipse cx="28.5" cy="30" rx="4.2" ry="2.1" fill="#43a047" transform="rotate(24 28.5 30)" />
      <ellipse cx="35.5" cy="30" rx="4.2" ry="2.1" fill="#43a047" transform="rotate(-24 35.5 30)" />
      <ellipse cx="32" cy="24.5" rx="5" ry="7.5" fill={color} />
    </g>
  );
}

function FlowerStem() {
  return (
    <g>
      <path d="M32 56 C32 48 32 38 32 30" stroke="#558b2f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="25" cy="46" rx="6.5" ry="3.2" fill="#66bb6a" transform="rotate(-32 25 46)" />
      <ellipse cx="39" cy="50" rx="6.5" ry="3.2" fill="#558b2f" transform="rotate(30 39 50)" />
    </g>
  );
}

function GrassBloom() {
  return (
    <g fill="none" strokeLinecap="round">
      <path d="M24 57 Q21 42 17 33" stroke="#43a047" strokeWidth="4" />
      <path d="M28 57 Q27 38 25 27" stroke="#66bb6a" strokeWidth="4" />
      <path d="M32 57 Q32 36 32 24" stroke="#4caf50" strokeWidth="4" />
      <path d="M36 57 Q37 38 39 27" stroke="#66bb6a" strokeWidth="4" />
      <path d="M40 57 Q43 42 47 33" stroke="#43a047" strokeWidth="4" />
    </g>
  );
}

function DaisyBloom() {
  const angles = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <g>
      <FlowerStem />
      {angles.map((a) => (
        <ellipse
          key={a}
          cx="32"
          cy="14.5"
          rx="4.2"
          ry="9"
          fill="#ffffff"
          stroke="#eceff1"
          strokeWidth="0.6"
          transform={`rotate(${a} 32 26)`}
        />
      ))}
      <circle cx="32" cy="26" r="5.5" fill="#ffca28" />
    </g>
  );
}

function TulipBloom() {
  return (
    <g>
      <FlowerStem />
      <path
        d="M21 19 C21 9 26.5 6 28 12 C29 6 35 6 36 12 C37.5 6 43 9 43 19 C43 28.5 38 34 32 34 C26 34 21 28.5 21 19 Z"
        fill="#f06292"
      />
      <path d="M32 8 C29 12 28.5 24 30 31 C31 33 33 33 34 31 C35.5 24 35 12 32 8 Z" fill="#ec407a" />
    </g>
  );
}

function SunflowerBloom() {
  const angles = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <g>
      <FlowerStem />
      {angles.map((a) => (
        <ellipse
          key={a}
          cx="32"
          cy="12.5"
          rx="3.8"
          ry="9.5"
          fill="#ffc107"
          stroke="#ffb300"
          strokeWidth="0.5"
          transform={`rotate(${a} 32 25)`}
        />
      ))}
      <circle cx="32" cy="25" r="7.5" fill="#795548" />
      <circle cx="30" cy="23.5" r="1" fill="#5d4037" />
      <circle cx="34" cy="24.5" r="1" fill="#5d4037" />
      <circle cx="31.5" cy="27" r="1" fill="#5d4037" />
      <circle cx="34.5" cy="27.5" r="0.8" fill="#5d4037" />
    </g>
  );
}

function DaffodilBloom() {
  const angles = [0, 60, 120, 180, 240, 300];
  return (
    <g>
      <FlowerStem />
      {angles.map((a) => (
        <ellipse
          key={a}
          cx="32"
          cy="15.5"
          rx="4"
          ry="8.5"
          fill="#fff59d"
          stroke="#fdd835"
          strokeWidth="0.6"
          transform={`rotate(${a} 32 25)`}
        />
      ))}
      <circle cx="32" cy="25" r="6" fill="#ffca28" />
      <circle cx="32" cy="25" r="3.5" fill="#ff9800" />
    </g>
  );
}

function CactusBloom() {
  return (
    <g>
      <ellipse cx="32" cy="56" rx="13" ry="4" fill="rgba(0,0,0,0.15)" />
      <rect x="15" y="30" width="8" height="15" rx="4" fill="#558b2f" />
      <rect x="19" y="39" width="8" height="6" rx="3" fill="#558b2f" />
      <rect x="41" y="26" width="8" height="17" rx="4" fill="#558b2f" />
      <rect x="36" y="36" width="7" height="6" rx="3" fill="#558b2f" />
      <rect x="26" y="22" width="12" height="32" rx="6" fill="#66bb6a" />
      <path
        d="M28 30l-2.5-1.5M36 34l2.5-1.5M28 42l-2.5-1.5M36 46l2.5-1.5M28 50l-2.5-1.5M36 54l2.5-1.5"
        stroke="#c8e6c9"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="19" r="3.5" fill="#f48fb1" />
      <circle cx="32" cy="19" r="1.5" fill="#fff176" />
    </g>
  );
}

function LavenderBloom() {
  const buds = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <g>
      <FlowerStem />
      {buds.map((i) => (
        <circle
          key={i}
          cx={i % 2 === 0 ? 29 : 35}
          cy={28 - i * 2.6}
          r={i < 5 ? 2.6 : 2}
          fill={i % 2 === 0 ? "#9575cd" : "#7e57c2"}
        />
      ))}
      <circle cx="32" cy="8" r="2.2" fill="#b39ddb" />
    </g>
  );
}

const HYACINTH_BLOOMS: Array<[number, number]> = [
  [27, 30],
  [32, 31],
  [37, 30],
  [29, 25.5],
  [34, 25.5],
  [37.5, 26],
  [31, 21],
  [35.5, 21.5],
  [32.5, 16.5],
  [33, 12.5],
];

function HyacinthBloom() {
  return (
    <g>
      <FlowerStem />
      {HYACINTH_BLOOMS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.1" fill={i % 2 === 0 ? "#42a5f5" : "#64b5f5"} />
      ))}
    </g>
  );
}

function RoseBloom() {
  const outer = [0, 72, 144, 216, 288];
  const inner = [36, 108, 180, 252, 324];
  return (
    <g>
      <FlowerStem />
      <g transform="translate(32 21)">
        {outer.map((a) => (
          <circle key={`o${a}`} cx="0" cy="-6.5" r="6.5" fill="#ec407a" transform={`rotate(${a})`} />
        ))}
        {inner.map((a) => (
          <circle key={`i${a}`} cx="0" cy="-4" r="4.5" fill="#e91e63" transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="0" r="4" fill="#c2185b" />
        <path d="M-2.5 -1 C-2.5 -3 2.5 -3 2.5 -1 C2.5 1 -2.5 1 -2.5 -1 Z" fill="#ad1457" />
      </g>
    </g>
  );
}

function LotusBloom() {
  const angles = [-54, -36, -18, 0, 18, 36, 54];
  return (
    <g>
      <ellipse cx="32" cy="51.5" rx="18" ry="5.5" fill="#81c784" />
      <ellipse cx="20" cy="50.5" rx="6" ry="2.2" fill="#a5d6a7" />
      <ellipse cx="44" cy="52" rx="5" ry="2" fill="#a5d6a7" />
      <path d="M32 50 C32 44 32 38 32 32" stroke="#558b2f" strokeWidth="3" fill="none" strokeLinecap="round" />
      {angles.map((a, i) => (
        <ellipse
          key={a}
          cx="32"
          cy="19.5"
          rx="4.6"
          ry="12"
          fill={i % 2 === 0 ? "#f48fb1" : "#f8bbd0"}
          stroke="#ec6f9c"
          strokeWidth="0.5"
          transform={`rotate(${a} 32 30)`}
        />
      ))}
      <circle cx="32" cy="27" r="3.2" fill="#ffca28" />
    </g>
  );
}

function CherryBloom() {
  const angles = [0, 72, 144, 216, 288];
  return (
    <g>
      <FlowerStem />
      <g transform="translate(32 22)">
        {angles.map((a) => (
          <circle key={a} cx="0" cy="-6" r="5.5" fill="#f8bbd0" stroke="#f48fb1" strokeWidth="0.5" transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="0" r="3" fill="#f48fb1" />
        {angles.map((a) => (
          <circle key={`s${a}`} cx="0" cy="-3.4" r="1" fill="#ffd54f" transform={`rotate(${a + 36})`} />
        ))}
      </g>
    </g>
  );
}

function RainbowFlowerBloom() {
  const colors = ["#ef5350", "#ffa726", "#ffee58", "#66bb6a", "#42a5f5", "#7e57c2", "#ec407a", "#26c6da"];
  const angles = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <g>
      <FlowerStem />
      {angles.map((a, i) => (
        <ellipse
          key={a}
          cx="32"
          cy="14.5"
          rx="4.2"
          ry="9"
          fill={colors[i]}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="0.5"
          transform={`rotate(${a} 32 26)`}
        />
      ))}
      <circle cx="32" cy="26" r="5" fill="#ffffff" stroke="#e0e0e0" strokeWidth="0.8" />
    </g>
  );
}

export default function PlantSprite({ plant, stage, className }: { plant: PlantId; stage: Stage; className?: string }) {
  let content: React.ReactNode;
  if (stage === "seed") content = <Seed />;
  else if (stage === "sprout") content = <Sprout />;
  else if (stage === "bud") content = <Bud color={BUD_COLORS[plant]} />;
  else if (plant === "grass") content = <GrassBloom />;
  else if (plant === "daisy") content = <DaisyBloom />;
  else if (plant === "daffodil") content = <DaffodilBloom />;
  else if (plant === "cactus") content = <CactusBloom />;
  else if (plant === "tulip") content = <TulipBloom />;
  else if (plant === "lavender") content = <LavenderBloom />;
  else if (plant === "sunflower") content = <SunflowerBloom />;
  else if (plant === "hyacinth") content = <HyacinthBloom />;
  else if (plant === "lotus") content = <LotusBloom />;
  else if (plant === "cherry") content = <CherryBloom />;
  else if (plant === "rainbowflower") content = <RainbowFlowerBloom />;
  else content = <RoseBloom />;

  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      {content}
    </svg>
  );
}
