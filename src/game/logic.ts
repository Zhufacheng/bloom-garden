import { DECOS, emptyDecorations } from "./decor";
import { COLUMNS, MAX_ROWS, PLANTS, ROW_COSTS, START_ROWS, emptySeeds } from "./plants";
import { DRAIN_RATES, REFILL_RATES, rollWeather } from "./weather";
import type { DecoId, GameState, PlantId, Plot } from "./types";

/** one full watering lasts 40 seconds in sunny weather */
export const WATER_DRAIN_PER_SEC = 1 / 40;

/** chance a plant turns golden (2x value) when it matures */
export const GOLDEN_CHANCE = 0.1;

export function createPlot(id: number): Plot {
  return { id, plant: null, progress: 0, water: 0, golden: false };
}

export function newGame(): GameState {
  return {
    coins: 30,
    rows: START_ROWS,
    plots: Array.from({ length: COLUMNS * MAX_ROWS }, (_, i) => createPlot(i)),
    seeds: { ...emptySeeds(), grass: 5 },
    totalHarvested: 0,
    totalEarned: 0,
    ...rollWeather(Date.now()),
    decorations: emptyDecorations(),
    milestones: [],
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
 * Weather drives the drain rate (hot = 2x, rain = 0) and rain refills water.
 * Analytic (closed-form), so offline catch-up is exact for one weather state.
 */
export function stepState(s: GameState, dt: number): GameState {
  if (dt <= 0) return s;
  const fountain = s.decorations.fountain;
  const rate = DRAIN_RATES[s.weather] * (fountain ? 0.75 : 1);
  const refill = REFILL_RATES[s.weather];
  let changed = false;
  const plots = s.plots.map((p) => {
    if (!p.plant) return p;
    const def = PLANTS[p.plant];
    let { progress, water } = p;
    if (progress < 1) {
      const tToBloom = (1 - progress) * def.growTime;
      const tDry = def.noWater || rate === 0 ? Infinity : water / rate;
      const tGrow = Math.min(dt, tToBloom, tDry);
      progress = Math.min(1, progress + tGrow / def.growTime);
      if (rate > 0 && !def.noWater) water = Math.max(0, water - tGrow * rate);
    }
    if (refill > 0) water = Math.min(1, water + refill * dt);
    if (progress === p.progress && water === p.water) return p;
    changed = true;
    const justMatured = p.progress < 1 && progress >= 1;
    return { ...p, progress, water, golden: justMatured ? Math.random() < GOLDEN_CHANCE : p.golden };
  });
  if (!changed) return s;
  return { ...s, plots, savedAt: Date.now() };
}

export function waterPlot(s: GameState, index: number): GameState {
  const p = s.plots[index];
  if (!p.plant || isMature(p) || PLANTS[p.plant].noWater) return s;
  const plots = s.plots.slice();
  plots[index] = { ...p, water: 1 };
  return { ...s, plots };
}

/** Buy one seed from the shop into the stash. */
export function buySeed(s: GameState, plant: PlantId): { state?: GameState; error?: string } {
  const def = PLANTS[plant];
  if (s.coins < def.seedCost) return { error: `金幣不夠，${def.name}種子要 ${def.seedCost}` };
  return {
    state: { ...s, coins: s.coins - def.seedCost, seeds: { ...s.seeds, [plant]: (s.seeds[plant] ?? 0) + 1 } },
  };
}

/** Plant one seed from the stash onto an empty plot. */
export function plantSeed(s: GameState, index: number, plant: PlantId): { state?: GameState; error?: string } {
  if (!isUnlocked(s, index)) return { error: "這塊土地還沒解鎖喔" };
  const p = s.plots[index];
  if (p.plant) return { error: "這裡已經種了東西" };
  const def = PLANTS[plant];
  if ((s.seeds[plant] ?? 0) <= 0) return { error: `手上沒有${def.name}種子` };
  const plots = s.plots.slice();
  plots[index] = { ...p, plant, progress: 0, water: def.noWater ? 0 : 1 };
  return { state: { ...s, plots, seeds: { ...s.seeds, [plant]: s.seeds[plant] - 1 } } };
}

export function sellValueOf(s: GameState, plant: PlantId, golden: boolean): number {
  const base = PLANTS[plant].sellValue * (s.decorations.butterfly ? 1.1 : 1);
  return Math.round(base * (golden ? 2 : 1));
}

export function harvest(s: GameState, index: number): { state?: GameState; earned?: number; golden?: boolean; error?: string } {
  const p = s.plots[index];
  if (!p.plant) return { error: "這裡沒有植物" };
  if (!isMature(p)) return { error: "還沒成熟，再澆點水等等它 🌱" };
  const earned = sellValueOf(s, p.plant, p.golden);
  const plots = s.plots.slice();
  plots[index] = { ...createPlot(index) };
  return {
    state: {
      ...s,
      coins: s.coins + earned,
      plots,
      totalHarvested: s.totalHarvested + 1,
      totalEarned: s.totalEarned + earned,
    },
    earned,
    golden: p.golden,
  };
}

export function unlockNextRow(s: GameState): { state?: GameState; error?: string } {
  if (s.rows >= MAX_ROWS) return { error: "花園已經擴到最大囉" };
  const cost = ROW_COSTS[s.rows + 1];
  if (s.coins < cost) return { error: `金幣不夠，擴充一行要 ${cost}` };
  return { state: { ...s, coins: s.coins - cost, rows: s.rows + 1 } };
}

/** Buy a permanent decoration. */
export function buyDeco(s: GameState, deco: DecoId): { state?: GameState; error?: string } {
  if (s.decorations[deco]) return { error: "已經擁有了" };
  const def = DECOS.find((d) => d.id === deco)!;
  if (s.coins < def.cost) return { error: `金幣不夠，${def.name}要 ${def.cost}` };
  return { state: { ...s, coins: s.coins - def.cost, decorations: { ...s.decorations, [deco]: true } } };
}

export interface Milestone {
  id: string;
  desc: string;
  reward: number;
  check: (s: GameState) => boolean;
  meta: (s: GameState) => string;
}

export const MILESTONES: Milestone[] = [
  { id: "harvest-1", desc: "收獲第 1 株植物", reward: 10, check: (s) => s.totalHarvested >= 1, meta: (s) => `${Math.min(s.totalHarvested, 1)}/1` },
  { id: "harvest-25", desc: "累計收獲 25 株", reward: 30, check: (s) => s.totalHarvested >= 25, meta: (s) => `${Math.min(s.totalHarvested, 25)}/25 株` },
  { id: "harvest-100", desc: "累計收獲 100 株", reward: 100, check: (s) => s.totalHarvested >= 100, meta: (s) => `${Math.min(s.totalHarvested, 100)}/100 株` },
  { id: "earn-500", desc: "累計賺取 500 金幣", reward: 50, check: (s) => s.totalEarned >= 500, meta: (s) => `${Math.min(s.totalEarned, 500)}/500` },
  { id: "earn-2000", desc: "累計賺取 2000 金幣", reward: 150, check: (s) => s.totalEarned >= 2000, meta: (s) => `${Math.min(s.totalEarned, 2000)}/2000` },
  { id: "rows-5", desc: "擴充到最大花園", reward: 50, check: (s) => s.rows >= MAX_ROWS, meta: (s) => `${s.rows}/${MAX_ROWS} 行` },
  {
    id: "deco-3",
    desc: "收集 3 種裝飾",
    reward: 40,
    check: (s) => Object.values(s.decorations).filter(Boolean).length >= 3,
    meta: (s) => `${Object.values(s.decorations).filter(Boolean).length}/3 種`,
  },
];

/** Claim a one-time milestone reward. */
export function claimMilestone(s: GameState, id: string): { state?: GameState; earned?: number; error?: string } {
  const m = MILESTONES.find((x) => x.id === id);
  if (!m) return { error: "找不到這個成就" };
  if (s.milestones.includes(id)) return { error: "已經領過了" };
  if (!m.check(s)) return { error: "還沒達成" };
  return { state: { ...s, coins: s.coins + m.reward, milestones: [...s.milestones, id] }, earned: m.reward };
}
