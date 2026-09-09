import { ORDER_CLEAR_BONUS, allClaimed, todayStr, yesterdayStr, type DailyState } from "../game/daily";
import { CHECKIN_REWARDS, MILESTONES } from "../game/logic";
import { PLANTS } from "../game/plants";
import type { GameState } from "../game/types";
import { CoinIcon } from "./Icons";

interface Props {
  daily: DailyState;
  game: GameState;
  onClaim: (index: number) => void;
  onClaimOrder: (index: number) => void;
  onClaimMilestone: (id: string) => void;
  onCheckIn: () => void;
  onClose: () => void;
}

export default function TasksSheet({ daily, game, onClaim, onClaimOrder, onClaimMilestone, onCheckIn, onClose }: Props) {
  const today = todayStr();
  const yesterday = yesterdayStr();
  const claimedToday = game.lastCheckIn === today;
  // the day that would be (or was) claimed on today's check-in
  const currentStreak = game.lastCheckIn === yesterday ? game.checkInStreak + 1 : 1;
  const displayDay = claimedToday
    ? ((game.checkInStreak - 1) % 7) + 1
    : ((currentStreak - 1) % 7) + 1;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        <div className="sheet-head">
          <h2>
            🎯 任務與成就{" "}
            <small>
              {today} · 今天 +{daily.stats.earned} 金 · 收獲 {daily.stats.harvested} 株
            </small>
          </h2>
          <button className="close-btn" onClick={onClose} aria-label="關閉">
            ✕
          </button>
        </div>

        <div className="section-title">每日簽到（7 天循環，第 7 天大禮）</div>
        <div className="checkin-card">
          <div className="checkin-track">
            {CHECKIN_REWARDS.map((reward, i) => {
              const dayNum = i + 1;
              const done = dayNum < displayDay;
              const active = dayNum === displayDay;
              return (
                <span key={dayNum} className={`checkin-day${active ? " active" : ""}${done ? " done" : ""}`}>
                  <small>{dayNum === 7 ? "🎁" : "💰"}</small>
                  <b>{reward}</b>
                </span>
              );
            })}
          </div>
          {claimedToday ? (
            <div className="checkin-done">✅ 今天已簽到（第 {displayDay} 天），明天回來繼續累積</div>
          ) : (
            <button className="checkin-btn" onClick={onCheckIn}>
              <CoinIcon size={14} /> 立即簽到 · 第 {displayDay} 天 +{CHECKIN_REWARDS[displayDay - 1]} 金幣
            </button>
          )}
        </div>

        <div className="section-title">每日任務（每天刷新）</div>
        {daily.tasks.map((t, i) => {
          const done = t.progress >= t.target;
          return (
            <div key={t.id} className={`task-item${t.claimed ? " claimed" : ""}`}>
              <span className="task-icon">{t.claimed ? "✅" : done ? "🌟" : "📋"}</span>
              <span className="info">
                <span className="name">{t.desc}</span>
                <span className="task-bar">
                  <span style={{ width: `${Math.min(100, (t.progress / t.target) * 100)}%` }} />
                </span>
                <span className="meta">
                  {t.progress}/{t.target}
                  {t.claimed ? " · 已領獎" : done ? " · 可領獎" : ""}
                </span>
              </span>
              <button className={`claim-btn${t.claimed ? " done" : ""}`} disabled={!done || t.claimed} onClick={() => onClaim(i)}>
                <CoinIcon size={13} /> +{t.reward}
              </button>
            </div>
          );
        })}
        {allClaimed(daily) && <div className="tasks-done">🎉 全部完成！明天回來領新任務</div>}
        <div className="tasks-note">任務每天 0 點自動更新，進度只算當天</div>

        <div className="section-title">鄰里訂單（收獲指定植物，換比市場更高的賞金）</div>
        {daily.orders.map((o, i) => {
          const def = PLANTS[o.plant];
          const done = o.progress >= o.count;
          return (
            <div key={o.id} className={`task-item${o.claimed ? " claimed" : ""}`}>
              <span className="task-icon">{o.claimed ? "✅" : done ? "🌟" : o.express ? "⚡" : "📦"}</span>
              <span className="info">
                <span className="name">
                  {def.name} ×{o.count} <small>鄰里訂單{o.express ? " · ⚡加急 ×2 賞金" : ""}</small>
                </span>
                <span className="task-bar">
                  <span style={{ width: `${Math.min(100, (o.progress / o.count) * 100)}%` }} />
                </span>
                <span className="meta">
                  {o.progress}/{o.count}
                  {o.claimed ? " · 已領獎" : done ? " · 可領獎" : " · 收獲該植物即計入"}
                </span>
              </span>
              <button
                className={`claim-btn${o.claimed ? " done" : ""}`}
                disabled={!done || o.claimed}
                onClick={() => onClaimOrder(i)}
              >
                <CoinIcon size={13} /> +{o.reward}
              </button>
            </div>
          );
        })}
        <div className="tasks-note">
          訂單賞金 = 基準賣價 ×1.5（⚡加急單 ×2），全部完成再領 +{ORDER_CLEAR_BONUS} 金幣；每天 0 點換新訂單
        </div>

        <div className="section-title">成就（一次性獎勵，達成後可領）</div>
        {MILESTONES.map((m) => {
          const claimed = game.milestones.includes(m.id);
          const ready = !claimed && m.check(game);
          return (
            <div key={m.id} className={`task-item${claimed ? " claimed" : ""}`}>
              <span className="task-icon">{claimed ? "✅" : ready ? "🏅" : "🔒"}</span>
              <span className="info">
                <span className="name">{m.desc}</span>
                <span className="meta">
                  {m.meta(game)} · +{m.reward} 金幣
                </span>
              </span>
              {ready && (
                <button className="claim-btn" onClick={() => onClaimMilestone(m.id)}>
                  <CoinIcon size={13} /> +{m.reward}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
