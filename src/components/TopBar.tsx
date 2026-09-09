import { CoinIcon } from "./Icons";

interface Props {
  coins: number;
  harvested: number;
  unclaimed: number;
  combo: number;
  dew: number;
  level: number;
  title: string;
  soundOn: boolean;
  onTasks: () => void;
  onBook: () => void;
  onToggleSound: () => void;
}

export default function TopBar({ coins, harvested, unclaimed, combo, dew, level, title, soundOn, onTasks, onBook, onToggleSound }: Props) {
  return (
    <header className="topbar">
      <div className="title">
        🌷 花花草草
        <small>Lv.{level} {title} · BLOOM GARDEN</small>
      </div>
      <div className="top-actions">
        {combo >= 2 && (
          <span className="combo-badge" title="15 秒內繼續收獲，每 3 連擊有額外金幣">
            🔥 連收 ×{combo}
          </span>
        )}
        <button className="icon-btn" onClick={onTasks} aria-label="每日任務">
          🎯
          {unclaimed > 0 && <span className="badge">{unclaimed}</span>}
        </button>
        <button className="icon-btn" onClick={onBook} aria-label="植物圖鑑">
          📖
        </button>
        <button className="icon-btn" onClick={onToggleSound} aria-label={soundOn ? "關閉音效" : "開啟音效"}>
          {soundOn ? "🔊" : "🔇"}
        </button>
      </div>
      <div className="top-right">
        <div className="stat">已收獲 {harvested} 次</div>
        {dew > 0 && (
          <div className="dew-pill" title="露珠：每顆永久 +5% 賣價（花店裡轉生可獲得）">
            💧 {dew}
          </div>
        )}
        <div className="coin-pill">
          <CoinIcon /> {coins}
        </div>
      </div>
    </header>
  );
}
