import type { PetId } from "./types";

export interface PetDef {
  id: PetId;
  name: string;
  emoji: string;
  cost: number;
  effect: string;
}

export const PETS: PetDef[] = [
  { id: "cat", name: "花園貓", emoji: "🐱", cost: 350, effect: "收獲金幣 +5%" },
  { id: "rabbit", name: "花園兔", emoji: "🐰", cost: 400, effect: "所有植物生長速度 +5%" },
  { id: "hedgehog", name: "花園刺猬", emoji: "🦔", cost: 380, effect: "25% 機率阻擋毛毛蟲事件" },
];

export function emptyPets(): Record<PetId, boolean> {
  return { cat: false, rabbit: false, hedgehog: false };
}
