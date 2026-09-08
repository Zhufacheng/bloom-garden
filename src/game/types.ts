export type PlantId = "grass" | "daisy" | "tulip" | "sunflower" | "rose";

export interface PlantDef {
  id: PlantId;
  name: string;
  nameEn: string;
  seedCost: number;
  /** seconds of growth needed (while watered) */
  growTime: number;
  sellValue: number;
}

export interface Plot {
  id: number;
  plant: PlantId | null;
  /** 0..1 growth progress, 1 = mature */
  progress: number;
  /** 0..1 water level; growth stops at 0 */
  water: number;
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
  /** epoch ms of last save */
  savedAt: number;
}
