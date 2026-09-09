import type { DailyState } from "./daily";
import { newGame, stepState } from "./logic";
import { emptySeeds } from "./plants";
import type { GameState } from "./types";
import { tickWeather } from "./weather";

const KEY = "bloom-garden-save-v1";
const DAILY_KEY = "bloom-garden-daily-v1";
const OFFLINE_CAP_SEC = 8 * 3600;

export function loadDaily(): DailyState | null {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    return raw ? (JSON.parse(raw) as DailyState) : null;
  } catch {
    return null;
  }
}

export function saveDaily(d: DailyState): void {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(d));
  } catch {
    // ignore
  }
}

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newGame();
    const parsed = JSON.parse(raw) as GameState;
    const now = Date.now();
    const dt = Math.min(Math.max((now - (parsed.savedAt ?? now)) / 1000, 0), OFFLINE_CAP_SEC);
    // tolerate saves from before the seed stash / weather / decorations existed
    const fresh = newGame();
    const merged: GameState = {
      ...fresh,
      ...parsed,
      seeds: { ...emptySeeds(), ...(parsed.seeds ?? {}) },
      weather: parsed.weather ?? "sunny",
      weatherUntil: parsed.weatherUntil ?? now + 180_000,
      decorations: { ...fresh.decorations, ...(parsed.decorations ?? {}) },
      milestones: parsed.milestones ?? [],
      nextEventAt: parsed.nextEventAt ?? now + 90_000,
      growthBoostUntil: parsed.growthBoostUntil ?? 0,
      combo: parsed.combo ?? 0,
      comboUntil: parsed.comboUntil ?? 0,
      lastCheckIn: parsed.lastCheckIn ?? "",
      checkInStreak: parsed.checkInStreak ?? 0,
    };
    merged.plots = merged.plots.map((p) => ({ ...p, golden: p.golden ?? false, boost: p.boost ?? 1 }));
    return tickWeather(stepState({ ...merged, savedAt: now }, dt), now);
  } catch {
    return newGame();
  }
}

export function saveGame(s: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, savedAt: Date.now() }));
  } catch {
    // storage unavailable (private mode etc.) — play without persistence
  }
}

export function resetGame(): GameState {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  return newGame();
}
