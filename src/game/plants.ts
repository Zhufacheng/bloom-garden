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
  daffodil: { id: "daffodil", name: "水仙", nameEn: "Daffodil", seedCost: 15, growTime: 40, sellValue: 40 },
  cactus: { id: "cactus", name: "仙人掌", nameEn: "Cactus", seedCost: 20, growTime: 45, sellValue: 50, noWater: true },
  tulip: { id: "tulip", name: "鬱金香", nameEn: "Tulip", seedCost: 25, growTime: 50, sellValue: 65 },
  lavender: { id: "lavender", name: "薰衣草", nameEn: "Lavender", seedCost: 30, growTime: 55, sellValue: 85 },
  sunflower: { id: "sunflower", name: "向日葵", nameEn: "Sunflower", seedCost: 45, growTime: 75, sellValue: 125 },
  hyacinth: { id: "hyacinth", name: "風信子", nameEn: "Hyacinth", seedCost: 55, growTime: 85, sellValue: 165 },
  rose: { id: "rose", name: "玫瑰", nameEn: "Rose", seedCost: 80, growTime: 110, sellValue: 220 },
  lotus: { id: "lotus", name: "荷花", nameEn: "Lotus", seedCost: 100, growTime: 130, sellValue: 280 },
  cherry: { id: "cherry", name: "櫻花", nameEn: "Cherry Blossom", seedCost: 130, growTime: 150, sellValue: 340 },
  rainbowflower: { id: "rainbowflower", name: "彩虹花", nameEn: "Rainbow Flower", seedCost: 160, growTime: 170, sellValue: 420 },
};

export const PLANT_LIST: PlantDef[] = [
  PLANTS.grass,
  PLANTS.daisy,
  PLANTS.daffodil,
  PLANTS.cactus,
  PLANTS.tulip,
  PLANTS.lavender,
  PLANTS.sunflower,
  PLANTS.hyacinth,
  PLANTS.rose,
  PLANTS.lotus,
  PLANTS.cherry,
  PLANTS.rainbowflower,
];

export function emptySeeds(): Record<PlantId, number> {
  return {
    grass: 0,
    daisy: 0,
    daffodil: 0,
    cactus: 0,
    tulip: 0,
    lavender: 0,
    sunflower: 0,
    hyacinth: 0,
    rose: 0,
    lotus: 0,
    cherry: 0,
    rainbowflower: 0,
  };
}

/** zeroed per-plant counters (plant book) */
export function emptyCounts(): Record<PlantId, number> {
  return { ...emptySeeds() };
}
