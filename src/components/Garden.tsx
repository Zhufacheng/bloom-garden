import { COLUMNS, MAX_ROWS, ROW_COSTS } from "../game/plants";
import type { GameState } from "../game/types";
import Plot from "./Plot";

interface Floater {
  index: number;
  amount: number;
  key: number;
}

interface Props {
  state: GameState;
  canPlant: boolean;
  floater: Floater | null;
  onPlotTap: (i: number) => void;
}

export default function Garden({ state, canPlant, floater, onPlotTap }: Props) {
  const total = COLUMNS * MAX_ROWS;
  const nextRowCost = state.rows < MAX_ROWS ? ROW_COSTS[state.rows + 1] : undefined;

  return (
    <div className="garden-card">
      <div className="garden-head">
        <span>🌻 我的花園</span>
        <span className="garden-sub">
          {state.rows}×{COLUMNS}
        </span>
      </div>
      <div className="garden-grid">
        {Array.from({ length: total }, (_, i) => {
          const locked = i >= state.rows * COLUMNS;
          return (
            <Plot
              key={i}
              index={i}
              plot={state.plots[i]}
              locked={locked}
              lockCost={locked ? nextRowCost : undefined}
              canPlant={canPlant}
              floater={floater && floater.index === i ? { amount: floater.amount, key: floater.key } : null}
              onTap={() => onPlotTap(i)}
            />
          );
        })}
      </div>
    </div>
  );
}
