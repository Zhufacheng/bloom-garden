import { todayStr, tomorrowStr } from "../game/daily";
import { DECOS } from "../game/decor";
import { FERTILIZER_COST, FERTILIZER_MAX, MYSTERY_COST, PREMIUM_COST, prestigeDewGain } from "../game/logic";
import { marketMult } from "../game/market";
import { MAX_ROWS, PLANT_LIST, ROW_COSTS } from "../game/plants";
import type { DecoId, GameState, PlantId } from "../game/types";
import { CoinIcon } from "./Icons";
import PlantSprite from "./PlantSprite";

interface Props {
  state: GameState;
  selected: PlantId | null;
  onBuy: (p: PlantId) => void;
  onSelect: (p: PlantId) => void;
  onBuyMystery: () => void;
  onBuyPremium: () => void;
  onBuyFertilizer: () => void;
  onBuyDeco: (d: DecoId) => void;
  onUnlockRow: () => void;
  onPrestige: () => void;
  onReset: () => void;
  onClose: () => void;
}

export default function Shop({ state, selected, onBuy, onSelect, onBuyMystery, onBuyPremium, onBuyFertilizer, onBuyDeco, onUnlockRow, onPrestige, onReset, onClose }: Props) {
  const today = todayStr();
  const tomorrow = tomorrowStr();
  const dewGain = prestigeDewGain(state);

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

        <div className="section-title">植物種子（賣價每天隨市場波動，點卡片拿起，再點空地連續種）</div>
        <div className="shop-item mystery" onClick={onBuyMystery}>
          <span className="icon-emoji">🎲</span>
          <span className="info">
            <span className="name">神秘種子 <small>Mystery</small></span>
            <span className="meta">隨機抽 1 顆種子，可能抽到昂貴的玫瑰！</span>
          </span>
          <button className="buy-btn" onClick={(e) => { e.stopPropagation(); onBuyMystery(); }}>
            <CoinIcon size={13} /> {MYSTERY_COST}
          </button>
        </div>
        <div className="shop-item premium" onClick={onBuyPremium}>
          <span className="icon-emoji">🎰</span>
          <span className="info">
            <span className="name">高級盲盒 <small>Premium</small></span>
            <span className="meta">保證抽出 6 種高級花之一（向日葵～彩虹花）</span>
          </span>
          <button className="buy-btn" onClick={(e) => { e.stopPropagation(); onBuyPremium(); }}>
            <CoinIcon size={13} /> {PREMIUM_COST}
          </button>
        </div>
        <div className="shop-item fertilizer" onClick={onBuyFertilizer}>
          <span className="icon-emoji">🪴</span>
          <span className="info">
            <span className="name">肥料 <small>Fertilizer</small></span>
            <span className="meta">
              種植時自動用 1 袋：那株花長速 ×2（留給貴花最划算）· 持有 {state.fertilizer}/{FERTILIZER_MAX}
            </span>
          </span>
          <button
            className="buy-btn"
            disabled={state.fertilizer >= FERTILIZER_MAX}
            onClick={(e) => {
              e.stopPropagation();
              onBuyFertilizer();
            }}
          >
            <CoinIcon size={13} /> {FERTILIZER_COST}
          </button>
        </div>
        {PLANT_LIST.map((def) => {
          const stock = state.seeds[def.id] ?? 0;
          const mult = marketMult(def.id, today);
          const price = Math.round(def.sellValue * mult);
          const arrow = mult > 1.05 ? <span className="mkt up">▲</span> : mult < 0.95 ? <span className="mkt down">▼</span> : null;
          const tMult = marketMult(def.id, tomorrow);
          const trend =
            tMult > mult * 1.02 ? (
              <span className="mkt up">▲</span>
            ) : tMult < mult * 0.98 ? (
              <span className="mkt down">▼</span>
            ) : (
              <span className="mkt">→</span>
            );
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
                  成熟 {def.growTime} 秒 · 今天賣 <b className={`price${mult > 1.05 ? " up" : mult < 0.95 ? " down" : ""}`}>{price}</b> {arrow} · 明天{trend}
                  {def.noWater && " · 免澆水"}
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

        <div className="section-title">裝飾（一次購買，效果永久生效）</div>
        {DECOS.map((d) => {
          const owned = state.decorations[d.id];
          return (
            <div
              key={d.id}
              className={`shop-item${owned ? " selected" : ""}`}
              onClick={owned ? undefined : () => onBuyDeco(d.id)}
            >
              <span className="icon-emoji">{d.emoji}</span>
              <span className="info">
                <span className="name">
                  {d.name}
                  {owned && <small> ✓ 已擁有</small>}
                </span>
                <span className="meta">{d.effect}</span>
              </span>
              {!owned && (
                <span className="price">
                  <CoinIcon size={14} />
                  {d.cost}
                </span>
              )}
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

        <div className="section-title">✨ 轉生（重置花園，換永久露珠）</div>
        <div className="shop-item prestige-card">
          <span className="icon-emoji">💧</span>
          <span className="info">
            <span className="name">轉生重開 <small>Prestige</small></span>
            <span className="meta">
              目前露珠 ×{state.dew}（每顆永久 +5% 賣價）
              <br />
              重置金幣／植物／裝飾／成就，保留露珠與簽到
            </span>
          </span>
          <button className="buy-btn dew-btn" disabled={dewGain < 1} onClick={(e) => { e.stopPropagation(); onPrestige(); }}>
            💧 +{dewGain}
          </button>
        </div>

        <button className="reset-btn" onClick={onReset}>
          ↺ 重新開始（清空進度）
        </button>
      </div>
    </div>
  );
}
