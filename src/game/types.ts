export type PlantId = "grass" | "daisy" | "daffodil" | "tulip" | "cactus" | "sunflower" | "lavender" | "hyacinth" | "rose";

export type WeatherKind = "sunny" | "hot" | "rain";

export type DecoId = "fence" | "fountain" | "butterfly" | "birdhouse";

export interface PlantDef {
  id: PlantId;
  name: string;
  nameEn: string;
  seedCost: number;
  /** seconds of growth needed (while watered) */
  growTime: number;
  sellValue: number;
  /** cactus-like: never needs water */
  noWater?: boolean;
}

export interface Plot {
  id: number;
  plant: PlantId | null;
  /** 0..1 growth progress, 1 = mature */
  progress: number;
  /** 0..1 water level; growth stops at 0 */
  water: number;
  /** rare golden variant: sells for double, decided when the plant matures */
  golden: boolean;
}

export interface GameState {
  coins: number;
  /** unlocked rows (grid is always COLUMNS wide) */
  rows: number;
  plots: Plot[];
  /** seed stash: how many seeds of each plant the player holds */
  seeds: Record<PlantId, number>;
  totalHarvested: number;
  totalEarned: number;
  weather: WeatherKind;
  /** epoch ms when the current weather changes */
  weatherUntil: number;
  /** owned garden decorations */
  decorations: Record<DecoId, boolean>;
  /** ids of claimed milestones */
  milestones: string[];
  /** epoch ms of last save */
  savedAt: number;
}
