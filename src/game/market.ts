import type { PlantId } from "./types";

/**
 * Deterministic daily market multiplier per plant, in [0.75, 1.25].
 * Same date + plant always gives the same price, so the "market"
 * is stable for the whole day and identical on every device.
 */
export function marketMult(plant: PlantId, date: string): number {
  const s = `bloom-market:${date}:${plant}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = (h >>> 0) % 1000;
  return 0.75 + (r / 1000) * 0.5;
}
