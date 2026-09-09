export type PlantId =
  | "grass"
  | "daisy"
  | "daffodil"
  | "tulip"
  | "cactus"
  | "sunflower"
  | "lavender"
  | "hyacinth"
  | "rose"
  | "lotus"
  | "cherry"
  | "rainbowflower";

export type WeatherKind = "sunny" | "hot" | "rain";

export type DecoId = "fence" | "fountain" | "butterfly" | "birdhouse" | "sprinkler" | "scarecrow" | "clover" | "hive";

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
  /** one-time harvest multiplier (bee event), 1 = none */
  boost: number;
  /** planted with fertilizer: grows twice as fast */
  fertilized: boolean;
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
  /** epoch ms of the next random event roll */
  nextEventAt: number;
  /** epoch ms until which all growth is sped up (rainbow event) */
  growthBoostUntil: number;
  /** consecutive harvest streak (resets when the window expires) */
  combo: number;
  /** epoch ms until which the combo streak stays alive */
  comboUntil: number;
  /** date string (YYYY-MM-DD) of the last daily check-in, "" = never */
  lastCheckIn: string;
  /** current daily check-in streak (1-based, cycles over 7) */
  checkInStreak: number;
  /** permanent dew currency earned by prestige; each dew = +5% sell value */
  dew: number;
  /** epoch ms until which harvest coins are doubled (golden hour event) */
  coinBoostUntil: number;
  /** lifetime harvest count per plant (plant book; survives prestige) */
  harvestCounts: Record<PlantId, number>;
  /** fertilizer in the shed; auto-applied when planting (grows 2x faster) */
  fertilizer: number;
  /** highest combo streak reached this run */
  bestCombo: number;
  /** epoch ms of last save */
  savedAt: number;
}
