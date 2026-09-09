import type { GameState, PlantId } from "./types";

export interface EvolveTier {
  /** lifetime harvest count of this species needed to reach the tier */
  min: number;
  /** sell price multiplier at this tier */
  mult: number;
  name: string;
  emoji: string;
}

/** tier 0 = normal, 1 = evolved (10 harvests), 2 = legendary (50 harvests) */
export const EVOLVE_TIERS: EvolveTier[] = [
  { min: 0, mult: 1, name: "", emoji: "" },
  { min: 10, mult: 1.5, name: "進化", emoji: "🌟" },
  { min: 50, mult: 2.5, name: "傳說", emoji: "🌙" },
];

/** current evolution tier of a species, based on its lifetime harvest count */
export function plantTier(s: GameState, plant: PlantId): number {
  const n = s.harvestCounts[plant] ?? 0;
  for (let t = EVOLVE_TIERS.length - 1; t >= 1; t--) {
    if (n >= EVOLVE_TIERS[t].min) return t;
  }
  return 0;
}

export function plantTierMult(s: GameState, plant: PlantId): number {
  return EVOLVE_TIERS[plantTier(s, plant)].mult;
}

/** the next tier this species can evolve into, or null when maxed */
export function nextTier(s: GameState, plant: PlantId): EvolveTier | null {
  return EVOLVE_TIERS[plantTier(s, plant) + 1] ?? null;
}
