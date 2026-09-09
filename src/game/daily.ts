import { PLANT_LIST } from "./plants";
import type { PlantId } from "./types";

/** Daily content: 3 tasks + 2 neighbor orders, refreshed each local day. */

export interface DailyTask {
  id: "harvest" | "water" | "earn" | "plant";
  desc: string;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

/** a neighbor's order: harvest N of one plant for a 1.5× base-price bounty */
export interface Order {
  id: string;
  plant: PlantId;
  count: number;
  reward: number;
  progress: number;
  claimed: boolean;
}

export interface DailyState {
  date: string; // local YYYY-MM-DD
  tasks: DailyTask[];
  orders: Order[];
}

export type DailyEvent =
  | { type: "harvest"; plants: number }
  | { type: "water"; times: number }
  | { type: "earn"; coins: number }
  | { type: "plant"; plants: number };

export function todayStr(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function yesterdayStr(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return todayStr(d);
}

export function tomorrowStr(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return todayStr(d);
}

function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TASK_IDS: DailyTask["id"][] = ["harvest", "water", "earn", "plant"];

function makeTask(kind: DailyTask["id"], rnd: () => number): DailyTask {
  const n = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
  switch (kind) {
    case "harvest": {
      const target = n(3, 5);
      return { id: kind, desc: `收獲 ${target} 株植物`, target, progress: 0, reward: 12 + target * 3, claimed: false };
    }
    case "water": {
      const target = n(4, 7);
      return { id: kind, desc: `澆水 ${target} 次`, target, progress: 0, reward: 10 + target * 2, claimed: false };
    }
    case "earn": {
      const target = n(30, 80);
      return { id: kind, desc: `賺取 ${target} 金幣`, target, progress: 0, reward: Math.round(target * 0.5) + 10, claimed: false };
    }
    case "plant": {
      const target = n(2, 3);
      return { id: kind, desc: `種下 ${target} 株植物`, target, progress: 0, reward: 8 + target * 4, claimed: false };
    }
  }
}

/** 2 neighbor orders per day, always on distinct plants, paying 1.5× base price */
function rollOrders(date: string): Order[] {
  const rnd = mulberry32(seedFrom(`bloom-orders:${date}`));
  const pool = [...PLANT_LIST];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, 2).map((def) => {
    const count = 2 + Math.floor(rnd() * 3); // 2..4 plants
    return {
      id: `${date}-${def.id}`,
      plant: def.id,
      count,
      reward: Math.round(def.sellValue * count * 1.5),
      progress: 0,
      claimed: false,
    };
  });
}

export function rollDaily(date: string): DailyState {
  const rnd = mulberry32(seedFrom(`bloom-garden:${date}`));
  const kinds = [...TASK_IDS];
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = kinds[i];
    kinds[i] = kinds[j];
    kinds[j] = tmp;
  }
  return { date, tasks: kinds.slice(0, 3).map((k) => makeTask(k, rnd)), orders: rollOrders(date) };
}

export function ensureDaily(saved: DailyState | null, today: string): DailyState {
  if (saved && saved.date === today) {
    // old saves predate orders; backfill without touching the day's tasks
    if (saved.orders) return saved;
    return { ...saved, orders: rollOrders(today) };
  }
  return rollDaily(today);
}

export function advanceDaily(d: DailyState, ev: DailyEvent): DailyState {
  const bump = (t: DailyTask, amount: number): DailyTask =>
    t.claimed ? t : { ...t, progress: Math.min(t.target, t.progress + amount) };
  const amount = ev.type === "water" ? ev.times : ev.type === "earn" ? ev.coins : ev.plants;
  const tasks = d.tasks.map((t) => (t.id === ev.type ? bump(t, amount) : t));
  return { ...d, tasks };
}

export function claimTask(d: DailyState, index: number): { state: DailyState; reward: number } | null {
  const t = d.tasks[index];
  if (!t || t.claimed || t.progress < t.target) return null;
  const tasks = d.tasks.slice();
  tasks[index] = { ...t, claimed: true };
  return { state: { ...d, tasks }, reward: t.reward };
}

export function advanceOrders(d: DailyState, plant: PlantId): DailyState {
  let changed = false;
  const orders = d.orders.map((o) => {
    if (o.claimed || o.plant !== plant || o.progress >= o.count) return o;
    changed = true;
    return { ...o, progress: o.progress + 1 };
  });
  return changed ? { ...d, orders } : d;
}

export function claimOrder(d: DailyState, index: number): { state: DailyState; reward: number } | null {
  const o = d.orders[index];
  if (!o || o.claimed || o.progress < o.count) return null;
  const orders = d.orders.slice();
  orders[index] = { ...o, claimed: true };
  return { state: { ...d, orders }, reward: o.reward };
}

export function unclaimedCount(d: DailyState): number {
  return d.tasks.filter((t) => !t.claimed && t.progress >= t.target).length;
}

export function allClaimed(d: DailyState): boolean {
  return d.tasks.every((t) => t.claimed);
}
