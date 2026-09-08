import type { PlantId } from "../game/types";

export type Stage = "seed" | "sprout" | "bud" | "bloom";

export function stageOf(progress: number): Stage {
  if (progress < 0.25) return "seed";
  if (progress < 0.5) return "sprout";
  if (progress < 0.75) return "bud";
  return "bloom";
}

const BUD_COLORS: Record<PlantId, string> = {
  grass: "#66bb6a",
  daisy: "#fafafa",
  tulip: "#f06292",
  sunflower: "#ffc107",
  rose: "#ec407a",
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

export default function PlantSprite({ plant, stage, className }: { plant: PlantId; stage: Stage; className?: string }) {
  let content: React.ReactNode;
  if (stage === "seed") content = <Seed />;
  else if (stage === "sprout") content = <Sprout />;
  else if (stage === "bud") content = <Bud color={BUD_COLORS[plant]} />;
  else if (plant === "grass") content = <GrassBloom />;
  else if (plant === "daisy") content = <DaisyBloom />;
  else if (plant === "tulip") content = <TulipBloom />;
  else if (plant === "sunflower") content = <SunflowerBloom />;
  else content = <RoseBloom />;

  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      {content}
    </svg>
  );
}
