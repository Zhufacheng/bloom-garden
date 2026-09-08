import { useCallback, useEffect, useRef, useState } from "react";
import Garden from "./components/Garden";
import PlantSprite from "./components/PlantSprite";
import Shop from "./components/Shop";
import TopBar from "./components/TopBar";
import Toolbar, { type Tool } from "./components/Toolbar";
import { harvest, isMature, isUnlocked, plantSeed, stepState, unlockNextRow, waterPlot } from "./game/logic";
import { PLANTS } from "./game/plants";
import { loadGame, resetGame, saveGame } from "./game/save";
import type { GameState, PlantId } from "./game/types";

interface Floater {
  index: number;
  amount: number;
  key: number;
}

export default function App() {
  const [state, setState] = useState<GameState>(loadGame);
  const [tool, setTool] = useState<Tool>("water");
  const [hand, setHand] = useState<PlantId | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);
  const [floater, setFloater] = useState<Floater | null>(null);
  const toastTimer = useRef(0);

  useEffect(() => {
    const t = window.setInterval(() => setState((s) => stepState(s, 1)), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    saveGame(state);
  }, [state]);

  const showToast = useCallback((msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ msg, key: Date.now() });
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const onPlotTap = useCallback(
    (i: number) => {
      if (!isUnlocked(state, i)) {
        const res = unlockNextRow(state);
        if (res.error) {
          showToast(res.error);
        } else {
          setState(res.state!);
          showToast(`花園擴充到 ${res.state!.rows} 行 🎉`);
        }
        return;
      }

      if (hand) {
        const res = plantSeed(state, i, hand);
        if (res.error) {
          showToast(res.error);
          return;
        }
        setState(res.state!);
        setHand(null);
        showToast(`種好了！${PLANTS[hand].name}開始成長 🌱`);
        return;
      }

      if (tool === "water") {
        const p = state.plots[i];
        if (!p.plant) {
          showToast("這裡還沒有植物，先去花店拿種子吧");
          return;
        }
        if (isMature(p)) {
          showToast("已經成熟了，切換「收獲」來採摘！");
          return;
        }
        setState(waterPlot(state, i));
        return;
      }

      const res = harvest(state, i);
      if (res.error) {
        showToast(res.error);
        return;
      }
      setState(res.state!);
      setFloater({ index: i, amount: res.earned!, key: Date.now() });
    },
    [state, tool, hand, showToast]
  );

  const pickSeed = useCallback(
    (plant: PlantId) => {
      const def = PLANTS[plant];
      if (state.coins < def.seedCost) {
        showToast(`金幣不夠，${def.name}種子要 ${def.seedCost}`);
        return;
      }
      setState((s) => ({ ...s, coins: s.coins - def.seedCost }));
      setHand(plant);
      setShopOpen(false);
      showToast(`拿起 ${def.name} 種子，點按空地種下`);
    },
    [state.coins, showToast]
  );

  const unlockRowFromShop = useCallback(() => {
    const res = unlockNextRow(state);
    if (res.error) {
      showToast(res.error);
      return;
    }
    setState(res.state!);
    showToast(`花園擴充到 ${res.state!.rows} 行 🎉`);
    setShopOpen(false);
  }, [state, showToast]);

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
      <TopBar coins={state.coins} harvested={state.totalHarvested} />
      <Garden state={state} canPlant={hand !== null} floater={floater} onPlotTap={onPlotTap} />
      {beginnerHint && (
        <div className="hint">💡 點「花店」買種子 → 點空地種下 → 用「澆水」澆水 → 成熟後用「收獲」採摘</div>
      )}
      {hand && (
        <div className="seed-chip">
          <span className="seed-chip-icon">
            <PlantSprite plant={hand} stage="bud" />
          </span>
          <span>
            手持 <b>{PLANTS[hand].name}</b> 種子
            <br />
            <small>點按空地種下</small>
          </span>
        </div>
      )}
      {toast && (
        <div key={toast.key} className="toast">
          {toast.msg}
        </div>
      )}
      {shopOpen && (
        <Shop
          state={state}
          onPick={pickSeed}
          onUnlockRow={unlockRowFromShop}
          onReset={onReset}
          onClose={() => setShopOpen(false)}
        />
      )}
      <Toolbar tool={tool} hasHand={hand !== null} onTool={setTool} onShop={() => setShopOpen(true)} />
    </div>
  );
}
