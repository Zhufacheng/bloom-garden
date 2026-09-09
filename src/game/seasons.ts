import type { PlantId } from "./types";

export type SeasonId = "spring" | "summer" | "autumn" | "winter";

export interface SeasonDef {
  id: SeasonId;
  name: string;
  emoji: string;
  /** the three plants that sell for a bonus during this season */
  bonus: PlantId[];
}

/** seasons rotate on a fixed calendar so all devices agree on the same day */
export const SEASON_DAYS = 3;

/** extra sell bonus for in-season plants (+20%) */
export const SEASON_BONUS = 0.2;

export const SEASONS: SeasonDef[] = [
  { id: "spring", name: "春", emoji: "🌸", bonus: ["daisy", "tulip", "cherry"] },
  { id: "summer", name: "夏", emoji: "☀️", bonus: ["sunflower", "lavender", "lotus"] },
  { id: "autumn", name: "秋", emoji: "🍂", bonus: ["rose", "hyacinth", "rainbowflower"] },
  { id: "winter", name: "冬", emoji: "❄️", bonus: ["cactus", "grass", "daffodil"] },
];

export function seasonOf(date: string): SeasonDef {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return SEASONS[Math.floor(day / SEASON_DAYS) % SEASONS.length];
}

export function isSeasonPlant(plant: PlantId, date: string): boolean {
  return seasonOf(date).bonus.includes(plant);
}

export function seasonMult(plant: PlantId, date: string): number {
  return isSeasonPlant(plant, date) ? 1 + SEASON_BONUS : 1;
}
