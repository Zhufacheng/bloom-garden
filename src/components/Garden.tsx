import { useRef } from "react";
import * as THREE from "three";
import { COLUMNS, ROW_COSTS } from "../game/plants";
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

export default function Garden({ state, canPlant, floater, onPlotTap }: Props) {
  const wx = WEATHER_META[state.weather];
  const worldRef = useRef<THREE.Group>(null);
  const drag = useRef<{ x: number; rot: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, rot: worldRef.current?.rotation.y ?? 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !worldRef.current) return;
    const rot = drag.current.rot + (e.clientX - drag.current.x) * 0.005;
    worldRef.current.rotation.y = Math.max(-0.65, Math.min(0.65, rot));
  };
  const endDrag = () => {
    drag.current = null;
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
          <span className="weather-chip" title={wx.hint}>
            {wx.icon} {wx.label} · {wx.hint}
          </span>
        </span>
      </div>
      <div
        className="garden3d"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <GardenScene state={state} canPlant={canPlant} onPlotTap={onPlotTap} worldRef={worldRef} />
        {floater && (
          <span key={floater.key} className="coin-float-2d">
            +{floater.amount}
            {floater.golden ? "✨" : ""} 金幣
          </span>
        )}
      </div>
      <div className="garden-hint">
        點植物＝澆水／收獲 · 點空地＝種植 · 左右拖曳旋轉視角{state.rows < 5 ? ` · 點鎖頭擴充（${ROW_COSTS[state.rows + 1]} 金）` : ""}
      </div>
    </div>
  );
}
