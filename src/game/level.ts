import type { GameState } from "./types";

/**
 * Gardener level: a per-run progression arc driven by the coins earned this
 * run (totalEarned). Like coins it resets on prestige — you re-climb each run
 * and bank the lasting gains as dew. Each level grants a small sell bonus and
 * a title, giving the garden a clear "I'm getting better" arc.
 */

/** totalEarned per level step: level = 1 + floor(sqrt(totalEarned / LEVEL_STEP)) */
export const LEVEL_STEP = 100;

/** +2% sell value per level ... */
export const LEVEL_SELL_BONUS = 0.02;

/** ... capped at +50% (reached at level 26) */
export const LEVEL_SELL_CAP = 0.5;

export function levelOf(totalEarned: number): number {
  return 1 + Math.floor(Math.sqrt(Math.max(0, totalEarned) / LEVEL_STEP));
}

/** sell multiplier from the gardener level (level 1 = x1.0, capped at x1.5) */
export function levelSellMult(level: number): number {
  const capped = Math.min(Math.max(level, 1) - 1, Math.round(LEVEL_SELL_CAP / LEVEL_SELL_BONUS));
  return 1 + capped * LEVEL_SELL_BONUS;
}

/** charming titles per level; levels past the last reuse the final title */
export const LEVEL_TITLES = [
  "新手農夫", // 1
  "綠手指",
  "花店幫手",
  "花匠",
  "園丁",
  "花藝師",
  "花卉達人",
  "花田主人",
  "名花綠野",
  "花境設計師",
  "花卉名家",
  "花之神手",
  "花田長者",
  "綠野仙蹤",
  "花藝大師",
  "傳奇花匠",
  "花之守護者",
  "花園傳奇",
  "花界宗師",
  "花之神",
];

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(Math.max(level, 1) - 1, LEVEL_TITLES.length - 1)];
}

export interface LevelInfo {
  level: number;
  title: string;
  /** totalEarned at the start of this level */
  curAt: number;
  /** totalEarned needed to reach the next level */
  nextAt: number;
  /** 0..1 progress toward the next level */
  frac: number;
  /** current sell multiplier from the level */
  sellMult: number;
}

export function levelInfo(s: GameState): LevelInfo {
  const level = levelOf(s.totalEarned);
  const title = levelTitle(level);
  const curAt = (level - 1) * (level - 1) * LEVEL_STEP;
  const nextAt = level * level * LEVEL_STEP;
  const frac = Math.max(0, Math.min(1, (s.totalEarned - curAt) / (nextAt - curAt)));
  return { level, title, curAt, nextAt, frac, sellMult: levelSellMult(level) };
}
