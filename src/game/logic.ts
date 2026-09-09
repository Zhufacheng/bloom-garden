import { DECOS, emptyDecorations } from "./decor";
import { todayStr, yesterdayStr } from "./daily";
import { marketMult } from "./market";
import { COLUMNS, MAX_ROWS, PLANTS, PLANT_LIST, ROW_COSTS, START_ROWS, emptyCounts, emptySeeds } from "./plants";
import { DRAIN_RATES, REFILL_RATES, rollWeather } from "./weather";
import type { DecoId, GameState, PlantId, Plot } from "./types";

/** one full watering lasts 40 seconds in sunny weather */
export const WATER_DRAIN_PER_SEC = 1 / 40;

/** chance a plant turns golden (2x value) when it matures */
export const GOLDEN_CHANCE = 0.1;

/** price of one mystery (random) seed */
export const MYSTERY_COST = 25;

/** a new harvest within this window keeps the combo streak alive */
export const COMBO_WINDOW_MS = 15_000;

/** sprinkler auto-refills water this fast per second (outpaces even hot weather) */
export const SPRINKLER_RATE = 1 / 16;

/** 7-day daily check-in coin rewards (index 0 = day 1, index 6 = day 7) */
export const CHECKIN_REWARDS = [10, 15, 20, 30, 40, 60, 100];

/** the six premium plants the golden blind box can roll */
export const PREMIUM_IDS: PlantId[] = ["sunflower", "hyacinth", "rose", "lotus", "cherry", "rainbowflower"];

/** price of one premium (golden) blind box seed */
export const PREMIUM_COST = 50;

/** totalEarned needed for the first dew; dew = floor(sqrt(totalEarned / PRESTIGE_BASE)) */
export const PRESTIGE_BASE = 200;

/** permanent sell-value bonus per dew (5% each, additive) */
export const DEW_SELL_BONUS = 0.05;

/** price of one fertilizer (next planted plant grows 2x faster) */
export const FERTILIZER_COST = 40;

/** max fertilizer that can be stored in the shed */
export const FERTILIZER_MAX = 5;

export function createPlot(id: number): Plot {
  return { id, plant: null, progress: 0, water: 0, golden: false, boost: 1, fertilized: false };
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
    nextEventAt: Date.now() + 90_000,
    growthBoostUntil: 0,
    combo: 0,
    comboUntil: 0,
    lastCheckIn: "",
    checkInStreak: 0,
    dew: 0,
    coinBoostUntil: 0,
    harvestCounts: emptyCounts(),
    fertilizer: 0,
    bestCombo: 0,
    savedAt: Date.now(),
  };
}

export function isMature(p: Plot): boolean {
  return p.plant !== null && p.progress >= 1;
}

/** chance a plant turns golden on maturity; clover decoration raises it to 15% */
export function goldenChanceOf(s: GameState): number {
  return s.decorations.clover ? 0.15 : GOLDEN_CHANCE;
}

export function isUnlocked(s: GameState, index: number): boolean {
  return index < s.rows * COLUMNS;
}

/**
 * Advance growth for dt seconds. Pure: returns a new state.
 * Growth only progresses while water > 0; water drains only while growing.
 * Weather drives the drain rate (hot = 2x, rain = 0) and rain refills water.
 * `speed` multiplies growth rate (rainbow event = 1.3).
 * Analytic (closed-form), so offline catch-up is exact for one weather state.
 */
export function stepState(s: GameState, dt: number, speed = 1): GameState {
  if (dt <= 0) return s;
  const fountain = s.decorations.fountain;
  const rate = DRAIN_RATES[s.weather] * (fountain ? 0.75 : 1);
  const refill = REFILL_RATES[s.weather] + (s.decorations.sprinkler ? SPRINKLER_RATE : 0);
  const goldenChance = goldenChanceOf(s);
  let changed = false;
  const plots = s.plots.map((p) => {
    if (!p.plant) return p;
    const def = PLANTS[p.plant];
    let { progress, water } = p;
    if (progress < 1) {
      const growTime = p.fertilized ? def.growTime / 2 : def.growTime;
      const tToBloom = ((1 - progress) * growTime) / speed;
      const tDry = def.noWater || rate === 0 ? Infinity : water / rate;
      const tGrow = Math.min(dt, tToBloom, tDry);
      progress = Math.min(1, progress + (tGrow / growTime) * speed);
      if (rate > 0 && !def.noWater) water = Math.max(0, water - tGrow * rate);
    }
    if (refill > 0) water = Math.min(1, water + refill * dt);
    if (progress === p.progress && water === p.water) return p;
    changed = true;
    const justMatured = p.progress < 1 && progress >= 1;
    return { ...p, progress, water, golden: justMatured ? Math.random() < goldenChance : p.golden };
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

/** Buy a mystery seed: a random plant from the full catalog. */
export function buyMysterySeed(
  s: GameState,
  rnd: () => number = Math.random,
): { state?: GameState; plant?: PlantId; error?: string } {
  if (s.coins < MYSTERY_COST) return { error: `金幣不夠，神秘種子要 ${MYSTERY_COST}` };
  const plant = PLANT_LIST[Math.floor(rnd() * PLANT_LIST.length)].id;
  return {
    state: { ...s, coins: s.coins - MYSTERY_COST, seeds: { ...s.seeds, [plant]: (s.seeds[plant] ?? 0) + 1 } },
    plant,
  };
}

/** Buy a premium blind box: a random plant from the six top-tier blooms only. */
export function buyPremiumSeed(
  s: GameState,
  rnd: () => number = Math.random,
): { state?: GameState; plant?: PlantId; error?: string } {
  if (s.coins < PREMIUM_COST) return { error: `金幣不夠，高級盲盒要 ${PREMIUM_COST}` };
  const plant = PREMIUM_IDS[Math.floor(rnd() * PREMIUM_IDS.length)];
  return {
    state: { ...s, coins: s.coins - PREMIUM_COST, seeds: { ...s.seeds, [plant]: (s.seeds[plant] ?? 0) + 1 } },
    plant,
  };
}

/** Plant one seed from the stash onto an empty plot; fertilizer (if any) is auto-applied. */
export function plantSeed(s: GameState, index: number, plant: PlantId): { state?: GameState; error?: string } {
  if (!isUnlocked(s, index)) return { error: "這塊土地還沒解鎖喔" };
  const p = s.plots[index];
  if (p.plant) return { error: "這裡已經種了東西" };
  const def = PLANTS[plant];
  if ((s.seeds[plant] ?? 0) <= 0) return { error: `手上沒有${def.name}種子` };
  const fert = s.fertilizer > 0;
  const plots = s.plots.slice();
  plots[index] = { ...p, plant, progress: 0, water: def.noWater ? 0 : 1, fertilized: fert };
  return {
    state: {
      ...s,
      plots,
      fertilizer: fert ? s.fertilizer - 1 : s.fertilizer,
      seeds: { ...s.seeds, [plant]: s.seeds[plant] - 1 },
    },
  };
}

/** Buy fertilizer: the next plants you sow grow twice as fast (max FERTILIZER_MAX stored). */
export function buyFertilizer(s: GameState): { state?: GameState; error?: string } {
  if (s.fertilizer >= FERTILIZER_MAX) return { error: `肥料已經滿了（最多 ${FERTILIZER_MAX} 袋）` };
  if (s.coins < FERTILIZER_COST) return { error: `金幣不夠，肥料要 ${FERTILIZER_COST}` };
  return { state: { ...s, coins: s.coins - FERTILIZER_COST, fertilizer: s.fertilizer + 1 } };
}

/** Sell price today: base x daily market x dew bonus x butterfly, doubled if golden. */
export function sellValueOf(s: GameState, plant: PlantId, golden: boolean, date = todayStr()): number {
  const dewMult = 1 + s.dew * DEW_SELL_BONUS;
  const base = PLANTS[plant].sellValue * marketMult(plant, date) * dewMult * (s.decorations.butterfly ? 1.1 : 1);
  return Math.round(base * (golden ? 2 : 1));
}

/**
 * Harvest a mature plant. Consecutive harvests within COMBO_WINDOW_MS build a
 * streak: every 3rd harvest in a row earns a bonus (25% per 3, capped at +100%).
 */
export function harvest(
  s: GameState,
  index: number,
  date = todayStr(),
  now = Date.now(),
): { state?: GameState; earned?: number; golden?: boolean; combo?: number; bonus?: number; error?: string } {
  const p = s.plots[index];
  if (!p.plant) return { error: "這裡沒有植物" };
  if (!isMature(p)) return { error: "還沒成熟，再澆點水等等它 🌱" };
  const coinBoost = now < s.coinBoostUntil ? 2 : 1; // golden hour
  const base = Math.round(sellValueOf(s, p.plant, p.golden, date) * p.boost * coinBoost);
  const combo = now <= s.comboUntil ? s.combo + 1 : 1;
  const bonus = combo >= 3 ? Math.round(base * 0.25 * Math.min(combo / 3, 4)) : 0;
  const earned = base + bonus;
  const plots = s.plots.slice();
  plots[index] = { ...createPlot(index) };
  return {
    state: {
      ...s,
      coins: s.coins + earned,
      plots,
      totalHarvested: s.totalHarvested + 1,
      totalEarned: s.totalEarned + earned,
      harvestCounts: { ...s.harvestCounts, [p.plant]: (s.harvestCounts[p.plant] ?? 0) + 1 },
      combo,
      comboUntil: now + COMBO_WINDOW_MS,
      bestCombo: Math.max(s.bestCombo, combo),
    },
    earned,
    bonus,
    combo,
    golden: p.golden,
  };
}

/**
 * Roll a random event when due. Returns the new state and an optional
 * toast message. Events: bee (a mature plant gets a one-time +50% harvest),
 * caterpillar (eats 25% of a random growing plant's progress),
 * shower (all growing plants get refilled), golden hour (2x harvest coins for
 * 60s), rainbow (+30% growth for 60s). 30% of rolls are calm.
 * Always reschedules the next roll 60-180s out.
 */
export function tickEvents(
  s: GameState,
  now: number,
  rnd: () => number = Math.random,
): { state: GameState; msg: string | null } {
  if (now < s.nextEventAt) return { state: s, msg: null };
  const next = now + 60_000 + rnd() * 120_000;
  if (rnd() < 0.3) return { state: { ...s, nextEventAt: next }, msg: null };
  const r = rnd();
  if (r < 0.25) {
    const mature = s.plots.map((p, i) => ({ p, i })).filter(({ p }) => isMature(p));
    if (mature.length === 0) return { state: { ...s, nextEventAt: next }, msg: null };
    const pick = mature[Math.floor(rnd() * mature.length)];
    const hive = s.decorations.hive;
    const plots = s.plots.slice();
    plots[pick.i] = { ...pick.p, boost: hive ? 1.75 : 1.5 };
    return {
      state: { ...s, plots, nextEventAt: next },
      msg: hive ? "🍯 蜜蜂來採蜜了！標記的花收獲 +75%（蜜蜂巢）" : "🐝 蜜蜂來採蜜了！標記的花收獲 +50%",
    };
  }
  if (r < 0.45) {
    if (s.decorations.scarecrow) return { state: { ...s, nextEventAt: next }, msg: null };
    const growing = s.plots.map((p, i) => ({ p, i })).filter(({ p }) => p.plant && p.progress < 1);
    if (growing.length === 0) return { state: { ...s, nextEventAt: next }, msg: null };
    const pick = growing[Math.floor(rnd() * growing.length)];
    const plots = s.plots.slice();
    plots[pick.i] = { ...pick.p, progress: Math.max(0, pick.p.progress - 0.25) };
    return { state: { ...s, plots, nextEventAt: next }, msg: "🐛 毛毛蟲來啃食！一株植物的進度被吃掉 25%" };
  }
  if (r < 0.65) {
    const plots = s.plots.map((p) =>
      p.plant && p.progress < 1 && !PLANTS[p.plant].noWater ? { ...p, water: 1 } : p,
    );
    return { state: { ...s, plots, nextEventAt: next }, msg: "🌦️ 快閃雨！所有植物水分補滿" };
  }
  if (r < 0.85) {
    return {
      state: { ...s, coinBoostUntil: now + 60_000, nextEventAt: next },
      msg: "💰 黃金時刻！60 秒內所有收獲金幣加倍",
    };
  }
  return {
    state: { ...s, growthBoostUntil: now + 60_000, nextEventAt: next },
    msg: "🌈 彩虹出現！60 秒內所有植物生長 +30%",
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
  {
    id: "book-6",
    desc: "圖鑑收錄 6 種植物",
    reward: 50,
    check: (s) => Object.values(s.harvestCounts).filter((n) => n > 0).length >= 6,
    meta: (s) => `${Object.values(s.harvestCounts).filter((n) => n > 0).length}/6 種`,
  },
  {
    id: "book-12",
    desc: "集齊 12 種植物圖鑑",
    reward: 150,
    check: (s) => Object.values(s.harvestCounts).filter((n) => n > 0).length >= 12,
    meta: (s) => `${Object.values(s.harvestCounts).filter((n) => n > 0).length}/12 種`,
  },
  {
    id: "combo-10",
    desc: "達成 10 連收",
    reward: 60,
    check: (s) => s.bestCombo >= 10,
    meta: (s) => `${Math.min(s.bestCombo, 10)}/10 連`,
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

/**
 * Claim the once-a-day check-in reward. The streak grows by 1 when the last
 * check-in was yesterday, otherwise it restarts at 1. Rewards cycle over 7 days.
 */
export function checkIn(
  s: GameState,
  today = todayStr(),
  yesterday = yesterdayStr(),
): { state?: GameState; reward?: number; day?: number; streak?: number; error?: string } {
  if (s.lastCheckIn === today) return { error: "今天已經簽到過了" };
  const streak = s.lastCheckIn === yesterday ? s.checkInStreak + 1 : 1;
  const day = ((streak - 1) % 7) + 1;
  const reward = CHECKIN_REWARDS[day - 1];
  return {
    state: { ...s, coins: s.coins + reward, checkInStreak: streak, lastCheckIn: today },
    reward,
    day,
    streak,
  };
}

/** Dew earned by prestiging this run: floor(sqrt(totalEarned / PRESTIGE_BASE)). */
export function prestigeDewGain(s: GameState): number {
  return Math.floor(Math.sqrt(s.totalEarned / PRESTIGE_BASE));
}

/**
 * Rebirth the garden for permanent dew. Resets coins/plots/seeds/decorations/
 * milestones/earnings, keeps dew (plus the gain) and the check-in streak.
 */
export function prestige(s: GameState): { state?: GameState; dewGained?: number; error?: string } {
  const dewGained = prestigeDewGain(s);
  if (dewGained < 1) {
    return { error: `累計賺 ${PRESTIGE_BASE} 金幣才能轉生（目前 ${s.totalEarned}）` };
  }
  const fresh = newGame();
  return {
    state: {
      ...fresh,
      dew: s.dew + dewGained,
      lastCheckIn: s.lastCheckIn,
      checkInStreak: s.checkInStreak,
      harvestCounts: s.harvestCounts,
    },
    dewGained,
  };
}
