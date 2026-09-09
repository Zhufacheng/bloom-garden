import { PLANT_LIST } from "../game/plants";
import type { GameState } from "../game/types";
import PlantSprite from "./PlantSprite";

interface Props {
  game: GameState;
  onClose: () => void;
}

export default function PlantBook({ game, onClose }: Props) {
  const total = PLANT_LIST.length;
  const collected = PLANT_LIST.filter((p) => (game.harvestCounts[p.id] ?? 0) > 0).length;
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        <div className="sheet-head">
          <h2>
            📖 植物圖鑑 <small>已收集 {collected}/{total}</small>
          </h2>
          <button className="close-btn" onClick={onClose} aria-label="關閉">
            ✕
          </button>
        </div>
        <div className="book-grid">
          {PLANT_LIST.map((def) => {
            const n = game.harvestCounts[def.id] ?? 0;
            return (
              <div key={def.id} className={`book-cell${n > 0 ? "" : " empty"}`}>
                <span className="book-sprite">
                  <PlantSprite plant={def.id} stage={n > 0 ? "bloom" : "seed"} />
                </span>
                <span className="book-name">{def.name}</span>
                <span className="book-count">{n > 0 ? `收獲 ${n} 次` : "尚未收獲"}</span>
              </div>
            );
          })}
        </div>
        <div className="tasks-note">收過什麼植物就會記錄在這裡；轉生也不會清空圖鑑</div>
      </div>
    </div>
  );
}
