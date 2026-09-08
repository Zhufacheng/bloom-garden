import type { PlantDef, PlantId } from "./types";

export const COLUMNS = 3;
export const START_ROWS = 3;
export const MAX_ROWS = 5;

/** cost to unlock the row of this index (row number = rows after unlock) */
export const ROW_COSTS: Record<number, number> = {
  4: 120,
  5: 300,
};

export const PLANTS: Record<PlantId, PlantDef> = {
  grass: { id: "grass", name: "青草", nameEn: "Grass", seedCost: 5, growTime: 20, sellValue: 12 },
  daisy: { id: "daisy", name: "雛菊", nameEn: "Daisy", seedCost: 12, growTime: 35, sellValue: 30 },
  tulip: { id: "tulip", name: "鬱金香", nameEn: "Tulip", seedCost: 25, growTime: 50, sellValue: 65 },
  sunflower: { id: "sunflower", name: "向日葵", nameEn: "Sunflower", seedCost: 45, growTime: 75, sellValue: 125 },
  rose: { id: "rose", name: "玫瑰", nameEn: "Rose", seedCost: 80, growTime: 110, sellValue: 220 },
};

export const PLANT_LIST: PlantDef[] = [
  PLANTS.grass,
  PLANTS.daisy,
  PLANTS.tulip,
  PLANTS.sunflower,
  PLANTS.rose,
];
