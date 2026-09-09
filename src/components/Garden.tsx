import { useRef } from "react";
import * as THREE from "three";
import { todayStr } from "../game/daily";
import { COLUMNS, PLANTS, ROW_COSTS } from "../game/plants";
import { seasonOf } from "../game/seasons";
import { WEATHER_META } from "../game/weather";
import type { GameState } from "../game/types";
import GardenScene from "../three/GardenScene";

interface Floater {
  index: number;
  amount: number;
  key: number;
  golden?: boolean;
}

interface Props {
  state: GameState;
  canPlant: boolean;
  floater: Floater | null;
  onPlotTap: (i: number) => void;
}

/** camera distance multiplier: 1 = default, <1 = closer */
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.6;

export default function Garden({ state, canPlant, floater, onPlotTap }: Props) {
  const wx = WEATHER_META[state.weather];
  const season = seasonOf(todayStr());
  const worldRef = useRef<THREE.Group>(null);
  const drag = useRef<{ x: number; rot: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchBase = useRef<{ dist: number; zoom: number } | null>(null);
  const zoomRef = useRef(1);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      drag.current = { x: e.clientX, rot: worldRef.current?.rotation.y ?? 0 };
    } else if (pointers.current.size === 2) {
      // second finger starts a pinch; rotation hands over to the zoom
      drag.current = null;
      const [a, b] = [...pointers.current.values()];
      pinchBase.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomRef.current };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const pt = pointers.current.get(e.pointerId);
    if (pt) {
      pt.x = e.clientX;
      pt.y = e.clientY;
    }
    if (pointers.current.size >= 2 && pinchBase.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 0 && pinchBase.current.dist > 0) {
        zoomRef.current = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (pinchBase.current.zoom * pinchBase.current.dist) / dist));
      }
    } else if (pointers.current.size === 1 && drag.current && worldRef.current) {
      const rot = drag.current.rot + (e.clientX - drag.current.x) * 0.005;
      worldRef.current.rotation.y = Math.max(-0.65, Math.min(0.65, rot));
    }
  };
  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchBase.current = null;
    if (pointers.current.size === 1) {
      // one finger left after a pinch: re-anchor rotation so it doesn't jump
      const [rest] = [...pointers.current.values()];
      drag.current = { x: rest.x, rot: worldRef.current?.rotation.y ?? 0 };
    } else if (pointers.current.size === 0) {
      drag.current = null;
    }
  };
  const onWheel = (e: React.WheelEvent) => {
    zoomRef.current = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current + e.deltaY * 0.001));
  };

  return (
    <div className="garden-card">
      <div className="garden-head">
        <span>
          🌻 我的花園 3D <span className="garden-sub">{state.rows}×{COLUMNS}</span>
        </span>
        <span className="head-chips">
          {Date.now() < state.coinBoostUntil && <span className="weather-chip gold-chip">💰 金幣加倍中</span>}
          {Date.now() < state.growthBoostUntil && <span className="weather-chip rainbow-chip">🌈 生長加速中</span>}
          <span
            className="weather-chip season-chip"
            title={`當季植物：${season.bonus.map((b) => PLANTS[b].name).join("、")}（賣價 +20%）`}
          >
            {season.emoji} {season.name}季 · 當季 +20%
          </span>
          <span className="weather-chip" title={wx.hint}>
            {wx.icon} {wx.label} · {wx.hint}
          </span>
        </span>
      </div>
      <div
        className="garden3d"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
        onWheel={onWheel}
      >
        <GardenScene state={state} canPlant={canPlant} onPlotTap={onPlotTap} worldRef={worldRef} zoomRef={zoomRef} />
        {floater && (
          <span key={floater.key} className="coin-float-2d">
            +{floater.amount}
            {floater.golden ? "✨" : ""} 金幣
          </span>
        )}
      </div>
      <div className="garden-hint">
        點植物＝澆水／收獲 · 點空地＝種植 · 拖曳旋轉 · 雙指捏合縮放{state.rows < 5 ? ` · 點鎖頭擴充（${ROW_COSTS[state.rows + 1]} 金）` : ""}
      </div>
    </div>
  );
}
