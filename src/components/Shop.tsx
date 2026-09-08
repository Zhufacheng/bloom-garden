import { MAX_ROWS, PLANT_LIST, ROW_COSTS } from "../game/plants";
import type { GameState, PlantId } from "../game/types";
import { CoinIcon } from "./Icons";
import PlantSprite from "./PlantSprite";

interface Props {
  state: GameState;
  onPick: (p: PlantId) => void;
  onUnlockRow: () => void;
  onReset: () => void;
  onClose: () => void;
}

export default function Shop({ state, onPick, onUnlockRow, onReset, onClose }: Props) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        <div className="sheet-head">
          <h2>🏪 花店</h2>
          <button className="close-btn" onClick={onClose} aria-label="關閉">
            ✕
          </button>
        </div>

        <div className="section-title">植物種子（點一下拿起來，再點空地種下）</div>
        {PLANT_LIST.map((def) => {
          const afford = state.coins >= def.seedCost;
          return (
            <button key={def.id} className={`shop-item${afford ? "" : " disabled"}`} onClick={() => onPick(def.id)}>
              <span className="icon">
                <PlantSprite plant={def.id} stage="bloom" />
              </span>
              <span className="info">
                <span className="name">
                  {def.name} <small>{def.nameEn}</small>
                </span>
                <span className="meta">
                  成熟 {def.growTime} 秒 · 賣出 +{def.sellValue}
                </span>
              </span>
              <span className="price">
                <CoinIcon size={14} />
                {def.seedCost}
              </span>
            </button>
          );
        })}

        <div className="section-title">擴充花園</div>
        <button className="shop-item" onClick={onUnlockRow} disabled={state.rows >= MAX_ROWS}>
          <span className="icon-emoji">🏞️</span>
          <span className="info">
            <span className="name">擴充一行土地</span>
            <span className="meta">
              {state.rows >= MAX_ROWS ? "花園已經擴到最大囉" : `目前 ${state.rows}×3，擴充後 ${(state.rows + 1)}×3`}
            </span>
          </span>
          {state.rows < MAX_ROWS && (
            <span className="price">
              <CoinIcon size={14} />
              {ROW_COSTS[state.rows + 1]}
            </span>
          )}
        </button>

        <button className="reset-btn" onClick={onReset}>
          ↺ 重新開始（清空進度）
        </button>
      </div>
    </div>
  );
}
