import { CoinIcon } from "./Icons";

export default function TopBar({ coins, harvested }: { coins: number; harvested: number }) {
  return (
    <header className="topbar">
      <div className="title">
        🌷 花花草草
        <small>BLOOM GARDEN · 養成小遊戲</small>
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
