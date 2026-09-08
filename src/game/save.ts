import { newGame, stepState } from "./logic";
import type { GameState } from "./types";

const KEY = "bloom-garden-save-v1";
const OFFLINE_CAP_SEC = 8 * 3600;

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newGame();
    const parsed = JSON.parse(raw) as GameState;
    const now = Date.now();
    const dt = Math.min(Math.max((now - (parsed.savedAt ?? now)) / 1000, 0), OFFLINE_CAP_SEC);
    return stepState({ ...parsed, savedAt: now }, dt);
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
