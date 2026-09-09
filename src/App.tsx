import { useCallback, useEffect, useRef, useState } from "react";
import Garden from "./components/Garden";
import PlantBook from "./components/PlantBook";
import PlantSprite from "./components/PlantSprite";
import Shop from "./components/Shop";
import TasksSheet from "./components/TasksSheet";
import TopBar from "./components/TopBar";
import Toolbar from "./components/Toolbar";
import {
  advanceDaily,
  advanceOrders,
  claimOrder,
  claimTask,
  ensureDaily,
  todayStr,
  unclaimedCount,
  type DailyState,
} from "./game/daily";
import { DECOS } from "./game/decor";
import {
  UPGRADES,
  buyDeco,
  buyFertilizer,
  buyMysterySeed,
  buyPremiumSeed,
  buySeed,
  buyUpgrade,
  checkIn,
  claimMilestone,
  harvest,
  isMature,
  isUnlocked,
  plantSeed,
  prestige,
  stepState,
  tickEvents,
  unlockNextRow,
  waterPlot,
} from "./game/logic";
import { PLANTS } from "./game/plants";
import { loadDaily, loadGame, resetGame, saveDaily, saveGame } from "./game/save";
import type { DecoId, GameState, PlantId, Upgrades } from "./game/types";
import { tickWeather } from "./game/weather";
import { isMuted, setMuted, sfx } from "./sfx";

interface Floater {
  index: number;
  amount: number;
  key: number;
  golden?: boolean;
}

export default function App() {
  const [state, setState] = useState<GameState>(loadGame);
  const [daily, setDaily] = useState<DailyState>(() => ensureDaily(loadDaily(), todayStr()));
  const [hand, setHand] = useState<PlantId | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(!isMuted());
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);
  const [floater, setFloater] = useState<Floater | null>(null);
  const toastTimer = useRef(0);

  useEffect(() => {
    const t = window.setInterval(() => {
      let eventMsg: string | null = null;
      setState((s) => {
        const now = Date.now();
        const ev = tickEvents(tickWeather(s, now), now);
        eventMsg = ev.msg;
        const speed = now < ev.state.growthBoostUntil ? 1.3 : 1;
        return stepState(ev.state, 1, speed);
      });
      if (eventMsg) showToast(eventMsg);
      setDaily((d) => ensureDaily(d, todayStr()));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    saveGame(state);
  }, [state]);

  useEffect(() => {
    saveDaily(daily);
  }, [daily]);

  const showToast = useCallback((msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ msg, key: Date.now() });
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const hasHand = hand !== null && (state.seeds[hand] ?? 0) > 0;

  const onPlotTap = useCallback(
    (i: number) => {
      if (!isUnlocked(state, i)) {
        const res = unlockNextRow(state);
        if (res.error) {
          sfx.error();
          showToast(res.error);
        } else {
          setState(res.state!);
          sfx.unlock();
          showToast(`花園擴充到 ${res.state!.rows} 行 🎉`);
        }
        return;
      }

      const p = state.plots[i];

      // 成熟 → 直接收獲（不用切工具）
      if (p.plant && isMature(p)) {
        const harvestedPlant = p.plant;
        const res = harvest(state, i);
        if (res.error) {
          showToast(res.error);
          return;
        }
        setState(res.state!);
        setDaily((d) => {
          const next = advanceDaily(advanceDaily(d, { type: "harvest", plants: 1 }), { type: "earn", coins: res.earned! });
          return advanceOrders(next, harvestedPlant);
        });
        sfx.harvest();
        if (res.bonus) {
          sfx.coin();
          showToast(`🔥 連收 ×${res.combo}！額外 +${res.bonus} 金幣`);
        } else if (res.golden) {
          sfx.coin();
          showToast("✨ 金色收獲！賣價加倍");
        }
        setFloater({ index: i, amount: res.earned!, key: Date.now(), golden: res.golden });
        return;
      }

      // 生長中 → 澆水（下雨不用澆、仙人掌不用澆）
      if (p.plant) {
        if (state.weather === "rain") {
          showToast("正在下雨，雨水會自動澆花 🌧️");
          return;
        }
        const def = PLANTS[p.plant];
        if (def.noWater) {
          showToast(`${def.name}不用澆水 🌵`);
          return;
        }
        const next = waterPlot(state, i);
        if (next !== state) {
          setState(next);
          setDaily((d) => advanceDaily(d, { type: "water", times: 1 }));
          sfx.water();
        }
        return;
      }

      // 空地：手持種子就種，沒有就提醒去花店
      if (!hasHand) {
        sfx.error();
        showToast("手上沒有種子，去花店買一點吧");
        return;
      }
      const res = plantSeed(state, i, hand);
      if (res.error) {
        sfx.error();
        showToast(res.error);
        return;
      }
      setState(res.state!);
      setDaily((d) => advanceDaily(d, { type: "plant", plants: 1 }));
      sfx.plant();
      const left = res.state!.seeds[hand];
      if (left <= 0) {
        setHand(null);
        showToast(`種好了！${PLANTS[hand].name}開始成長 🌱`);
      } else {
        showToast(`種下了！還剩 ${left} 顆種子，繼續點空地`);
      }
    },
    [state, hand, hasHand, showToast]
  );

  const onBuySeed = useCallback(
    (plant: PlantId) => {
      const res = buySeed(state, plant);
      if (res.error) {
        sfx.error();
        showToast(res.error);
        return;
      }
      setState(res.state!);
      setHand(plant);
      sfx.coin();
      showToast(`買了 1 顆${PLANTS[plant].name}種子（庫存 ×${res.state!.seeds[plant]}）`);
    },
    [state, showToast]
  );

  const onSelectSeed = useCallback(
    (plant: PlantId) => {
      if ((state.seeds[plant] ?? 0) <= 0) {
        sfx.error();
        showToast(`還沒有${PLANTS[plant].name}種子，先買一點`);
        return;
      }
      setHand(plant);
      sfx.select();
    },
    [state, showToast]
  );

  const onWaterTap = useCallback(() => {
    sfx.select();
    if (state.weather === "rain") {
      showToast("正在下雨，不用澆水 🌧️");
      return;
    }
    const thirsty = state.plots.some((p) => p.plant && !isMature(p) && !PLANTS[p.plant].noWater && p.water < 0.99);
    showToast(thirsty ? "點一下植物就可以澆水 💧" : "植物水分都很充足 🌿");
  }, [state, showToast]);

  const onUnlockRow = useCallback(() => {
    const res = unlockNextRow(state);
    if (res.error) {
      sfx.error();
      showToast(res.error);
      return;
    }
    setState(res.state!);
    sfx.unlock();
    showToast(`花園擴充到 ${res.state!.rows} 行 🎉`);
    setShopOpen(false);
  }, [state, showToast]);

  const onClaimTask = useCallback(
    (index: number) => {
      const res = claimTask(daily, index);
      if (!res) return;
      const bonus = state.decorations.birdhouse ? 10 : 0;
      const total = res.reward + bonus;
      setDaily(res.state);
      setState((s) => ({ ...s, coins: s.coins + total }));
      sfx.coin();
      showToast(bonus > 0 ? `領到 ${res.reward} + 鳥屋 10 = ${total} 金幣 🎉` : `領到 ${total} 金幣 🎉`);
    },
    [daily, state.decorations, showToast]
  );

  const onClaimOrder = useCallback(
    (index: number) => {
      const res = claimOrder(daily, index);
      if (!res) return;
      setDaily(res.state);
      const bonus = res.bonus ?? 0;
      const total = res.reward + bonus;
      setState((s) => ({ ...s, coins: s.coins + total, totalEarned: s.totalEarned + total }));
      sfx.coin();
      showToast(bonus > 0 ? `🎉 訂單全數完成！${res.reward} + 感謝禮 ${bonus} = +${total} 金幣` : `📦 訂單完成！+${total} 金幣`);
    },
    [daily, showToast]
  );

  const onClaimMilestone = useCallback(
    (id: string) => {
      const res = claimMilestone(state, id);
      if (res.error) {
        sfx.error();
        showToast(res.error);
        return;
      }
      setState(res.state!);
      sfx.unlock();
      showToast(`成就達成！+${res.earned} 金幣 🏅`);
    },
    [state, showToast]
  );

  const onBuyMystery = useCallback(() => {
    const res = buyMysterySeed(state);
    if (res.error || !res.plant) {
      sfx.error();
      showToast(res.error ?? "抽不到神秘種子");
      return;
    }
    setState(res.state!);
    setHand(res.plant);
    sfx.unlock();
    showToast(`🎲 抽到：${PLANTS[res.plant].name}種子！點空地種下它`);
  }, [state, showToast]);

  const onBuyPremium = useCallback(() => {
    const res = buyPremiumSeed(state);
    if (res.error || !res.plant) {
      sfx.error();
      showToast(res.error ?? "抽不到高級盲盒");
      return;
    }
    setState(res.state!);
    setHand(res.plant);
    sfx.unlock();
    showToast(`🎰 高級盲盒：${PLANTS[res.plant].name}種子！點空地種下它`);
  }, [state, showToast]);

  const onBuyUpgrade = useCallback(
    (id: keyof Upgrades) => {
      const res = buyUpgrade(state, id);
      if (res.error) {
        sfx.error();
        showToast(res.error);
        return;
      }
      setState(res.state!);
      sfx.unlock();
      const def = UPGRADES.find((u) => u.id === id)!;
      showToast(`✨ 買下 ${def.name} ${def.emoji}！永久生效（剩 💧${res.state!.dew}）`);
    },
    [state, showToast]
  );

  const onBuyFertilizer = useCallback(() => {
    const res = buyFertilizer(state);
    if (res.error) {
      sfx.error();
      showToast(res.error);
      return;
    }
    setState(res.state!);
    sfx.coin();
    showToast(`買了 1 袋肥料🪴（持有 ${res.state!.fertilizer}），種花時自動生效`);
  }, [state, showToast]);

  const onCheckIn = useCallback(() => {
    const res = checkIn(state);
    if (res.error) {
      sfx.error();
      showToast(res.error);
      return;
    }
    setState(res.state!);
    sfx.coin();
    showToast(`📅 簽到成功！第 ${res.day} 天 +${res.reward} 金幣`);
  }, [state, showToast]);

  const onPrestige = useCallback(() => {
    const res = prestige(state);
    if (res.error || res.dewGained === undefined) {
      sfx.error();
      showToast(res.error ?? "還沒賺夠，繼續種花吧");
      return;
    }
    const gained = res.dewGained;
    if (!window.confirm(`確定要轉生嗎？\n\n花園（金幣、植物、裝飾、成就）會重置，\n但可獲得 💧 ×${gained} 露珠（永久 +${gained * 5}% 賣價）。`)) return;
    setState(res.state!);
    setHand(null);
    setShopOpen(false);
    sfx.unlock();
    showToast(`✨ 轉生成功！💧 +${res.dewGained} 露珠，賣價永久提升`);
  }, [state, showToast]);

  const onBuyDeco = useCallback(
    (deco: DecoId) => {
      const res = buyDeco(state, deco);
      if (res.error) {
        sfx.error();
        showToast(res.error);
        return;
      }
      setState(res.state!);
      sfx.unlock();
      const def = DECOS.find((d) => d.id === deco)!;
      showToast(`買下 ${def.name} ${def.emoji}！效果立即生效`);
    },
    [state, showToast]
  );

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setMuted(!next);
    if (next) sfx.select();
  }, [soundOn]);

  const onReset = useCallback(() => {
    if (!window.confirm("確定要重新開始嗎？目前的進度會消失。")) return;
    setState(resetGame());
    setHand(null);
    setShopOpen(false);
    showToast("新的開始，祝你種出大花園 🌄");
  }, [showToast]);

  const beginnerHint = state.totalHarvested === 0 && state.plots.every((p) => !p.plant);

  return (
    <div className="app">
      <TopBar
        coins={state.coins}
        harvested={state.totalHarvested}
        unclaimed={unclaimedCount(daily)}
        combo={Date.now() < state.comboUntil ? state.combo : 0}
        dew={state.dew}
        soundOn={soundOn}
        onTasks={() => {
          sfx.select();
          setTasksOpen(true);
        }}
        onBook={() => {
          sfx.select();
          setBookOpen(true);
        }}
        onToggleSound={toggleSound}
      />
      <Garden state={state} canPlant={hasHand} floater={floater} onPlotTap={onPlotTap} />
      {beginnerHint && (
        <div className="hint">
          💡 花店買種子（開始送 5 顆青草）→ 點空地種植 → 點植物澆水 → 成熟後直接點它收獲
        </div>
      )}
      {hasHand && (
        <button className="seed-chip" onClick={() => { sfx.select(); setShopOpen(true); }}>
          <span className="seed-chip-icon">
            <PlantSprite plant={hand} stage="bud" />
          </span>
          <span>
            <b>{PLANTS[hand].name}</b> 種子 ×{state.seeds[hand]}
            <br />
            <small>點空地連續種植 · 點這裡換種子</small>
          </span>
        </button>
      )}
      {toast && (
        <div key={toast.key} className="toast">
          {toast.msg}
        </div>
      )}
      {shopOpen && (
        <Shop
          state={state}
          selected={hasHand ? hand : null}
          onBuy={onBuySeed}
          onSelect={onSelectSeed}
          onBuyMystery={onBuyMystery}
          onBuyPremium={onBuyPremium}
          onBuyFertilizer={onBuyFertilizer}
          onBuyDeco={onBuyDeco}
          onUnlockRow={onUnlockRow}
          onPrestige={onPrestige}
          onBuyUpgrade={onBuyUpgrade}
          onReset={onReset}
          onClose={() => setShopOpen(false)}
        />
      )}
      {tasksOpen && (
        <TasksSheet
          daily={daily}
          game={state}
          onClaim={onClaimTask}
          onClaimOrder={onClaimOrder}
          onClaimMilestone={onClaimMilestone}
          onCheckIn={onCheckIn}
          onClose={() => setTasksOpen(false)}
        />
      )}
      {bookOpen && <PlantBook game={state} onClose={() => setBookOpen(false)} />}
      <Toolbar
        onWater={onWaterTap}
        onShop={() => {
          sfx.select();
          setShopOpen(true);
        }}
      />
    </div>
  );
}
