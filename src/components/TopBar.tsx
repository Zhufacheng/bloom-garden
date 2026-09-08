import { CoinIcon } from "./Icons";

interface Props {
  coins: number;
  harvested: number;
  unclaimed: number;
  soundOn: boolean;
  onTasks: () => void;
  onToggleSound: () => void;
}

export default function TopBar({ coins, harvested, unclaimed, soundOn, onTasks, onToggleSound }: Props) {
  return (
    <header className="topbar">
      <div className="title">
        🌷 花花草草
        <small>BLOOM GARDEN · 養成小遊戲</small>
      </div>
      <div className="top-actions">
        <button className="icon-btn" onClick={onTasks} aria-label="每日任務">
          🎯
          {unclaimed > 0 && <span className="badge">{unclaimed}</span>}
        </button>
        <button className="icon-btn" onClick={onToggleSound} aria-label={soundOn ? "關閉音效" : "開啟音效"}>
          {soundOn ? "🔊" : "🔇"}
        </button>
      </div>
      <div className="top-right">
        <div className="stat">已收獲 {harvested} 次</div>
        <div className="coin-pill">
          <CoinIcon /> {coins}
        </div>
      </div>
    </header>
  );
}
