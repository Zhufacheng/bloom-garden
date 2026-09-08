import { MAX_ROWS, PLANT_LIST, ROW_COSTS } from "../game/plants";
import type { GameState, PlantId } from "../game/types";
import { CoinIcon } from "./Icons";
import PlantSprite from "./PlantSprite";

interface Props {
  state: GameState;
  selected: PlantId | null;
  onBuy: (p: PlantId) => void;
  onSelect: (p: PlantId) => void;
  onUnlockRow: () => void;
  onReset: () => void;
  onClose: () => void;
}

export default function Shop({ state, selected, onBuy, onSelect, onUnlockRow, onReset, onClose }: Props) {
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

        <div className="section-title">植物種子（可多買，點卡片拿起，再點空地連續種）</div>
        {PLANT_LIST.map((def) => {
          const stock = state.seeds[def.id] ?? 0;
          return (
            <div
              key={def.id}
              className={`shop-item${selected === def.id ? " selected" : ""}`}
              onClick={() => onSelect(def.id)}
            >
              <span className="icon">
                <PlantSprite plant={def.id} stage="bloom" />
              </span>
              <span className="info">
                <span className="name">
                  {def.name} <small>{def.nameEn}</small>
                </span>
                <span className="meta">
                  成熟 {def.growTime} 秒 · 賣出 +{def.sellValue}
                  {stock > 0 && <b className="stock"> · 庫存 ×{stock}</b>}
                </span>
              </span>
              <button
                className="buy-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy(def.id);
                }}
              >
                <CoinIcon size={13} /> {def.seedCost}
              </button>
            </div>
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
