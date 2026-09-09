import type { DecoId } from "./types";

export interface DecoDef {
  id: DecoId;
  name: string;
  emoji: string;
  cost: number;
  effect: string;
}

export const DECOS: DecoDef[] = [
  { id: "fence", name: "木柵欄", emoji: "🪵", cost: 80, effect: "花園變漂亮（純裝飾）" },
  { id: "fountain", name: "小噴泉", emoji: "⛲", cost: 60, effect: "水分流失變慢 25%" },
  { id: "butterfly", name: "蝴蝶園", emoji: "🦋", cost: 90, effect: "植物賣出價格 +10%" },
  { id: "birdhouse", name: "鳥屋", emoji: "🐦", cost: 150, effect: "每日任務獎勵 +10 金幣" },
];

export function emptyDecorations(): Record<DecoId, boolean> {
  return { fence: false, fountain: false, butterfly: false, birdhouse: false };
}
