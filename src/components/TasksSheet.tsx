import { allClaimed, todayStr, type DailyState } from "../game/daily";
import { CoinIcon } from "./Icons";

interface Props {
  daily: DailyState;
  onClaim: (index: number) => void;
  onClose: () => void;
}

export default function TasksSheet({ daily, onClaim, onClose }: Props) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        <div className="sheet-head">
          <h2>
            🎯 每日任務 <small>{todayStr()}</small>
          </h2>
          <button className="close-btn" onClick={onClose} aria-label="關閉">
            ✕
          </button>
        </div>

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
              <button
                className={`claim-btn${t.claimed ? " done" : ""}`}
                disabled={!done || t.claimed}
                onClick={() => onClaim(i)}
              >
                <CoinIcon size={13} /> +{t.reward}
              </button>
            </div>
          );
        })}

        {allClaimed(daily) && <div className="tasks-done">🎉 全部完成！明天回來領新任務</div>}
        <div className="tasks-note">任務每天 0 點自動更新，進度只算當天</div>
      </div>
    </div>
  );
}
