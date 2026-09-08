import { COLUMNS, MAX_ROWS, PLANTS, ROW_COSTS, START_ROWS } from "./plants";
import type { GameState, PlantId, Plot } from "./types";

/** one full watering lasts 40 seconds */
export const WATER_DRAIN_PER_SEC = 1 / 40;

export function createPlot(id: number): Plot {
  return { id, plant: null, progress: 0, water: 0 };
}

export function newGame(): GameState {
  return {
    coins: 30,
    rows: START_ROWS,
    plots: Array.from({ length: COLUMNS * MAX_ROWS }, (_, i) => createPlot(i)),
    totalHarvested: 0,
    totalEarned: 0,
    savedAt: Date.now(),
  };
}

export function isMature(p: Plot): boolean {
  return p.plant !== null && p.progress >= 1;
}

export function isUnlocked(s: GameState, index: number): boolean {
  return index < s.rows * COLUMNS;
}

/**
 * Advance growth for dt seconds. Pure: returns a new state.
 * Growth only progresses while water > 0; water drains only while growing.
 * Analytic (closed-form), so offline catch-up is exact.
 */
export function stepState(s: GameState, dt: number): GameState {
  if (dt <= 0) return s;
  let changed = false;
  const plots = s.plots.map((p) => {
    if (!p.plant || p.progress >= 1) return p;
    const def = PLANTS[p.plant];
    const tToBloom = (1 - p.progress) * def.growTime;
    const tDry = p.water / WATER_DRAIN_PER_SEC;
    const tGrow = Math.min(dt, tToBloom, tDry);
    if (tGrow <= 0) return p;
    changed = true;
    return {
      ...p,
      progress: Math.min(1, p.progress + tGrow / def.growTime),
      water: Math.max(0, p.water - tGrow * WATER_DRAIN_PER_SEC),
    };
  });
  if (!changed) return s;
  return { ...s, plots, savedAt: Date.now() };
}

export function waterPlot(s: GameState, index: number): GameState {
  const p = s.plots[index];
  if (!p.plant || isMature(p)) return s;
  const plots = s.plots.slice();
  plots[index] = { ...p, water: 1 };
  return { ...s, plots };
}

export function plantSeed(s: GameState, index: number, plant: PlantId): { state?: GameState; error?: string } {
  if (!isUnlocked(s, index)) return { error: "這塊土地還沒解鎖喔" };
  const p = s.plots[index];
  if (p.plant) return { error: "這裡已經種了東西" };
  const def = PLANTS[plant];
  if (s.coins < def.seedCost) return { error: `金幣不夠，${def.name}種子要 ${def.seedCost}` };
  const plots = s.plots.slice();
  plots[index] = { ...p, plant, progress: 0, water: 1 };
  return { state: { ...s, coins: s.coins - def.seedCost, plots } };
}

export function harvest(s: GameState, index: number): { state?: GameState; earned?: number; error?: string } {
  const p = s.plots[index];
  if (!p.plant) return { error: "這裡沒有植物" };
  if (!isMature(p)) return { error: "還沒成熟，再澆點水等等它 🌱" };
  const def = PLANTS[p.plant];
  const plots = s.plots.slice();
  plots[index] = { ...createPlot(index) };
  return {
    state: {
      ...s,
      coins: s.coins + def.sellValue,
      plots,
      totalHarvested: s.totalHarvested + 1,
      totalEarned: s.totalEarned + def.sellValue,
    },
    earned: def.sellValue,
  };
}

export function unlockNextRow(s: GameState): { state?: GameState; error?: string } {
  if (s.rows >= MAX_ROWS) return { error: "花園已經擴到最大囉" };
  const cost = ROW_COSTS[s.rows + 1];
  if (s.coins < cost) return { error: `金幣不夠，擴充一行要 ${cost}` };
  return { state: { ...s, coins: s.coins - cost, rows: s.rows + 1 } };
}
