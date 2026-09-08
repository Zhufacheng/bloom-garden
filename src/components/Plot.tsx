import { isMature } from "../game/logic";
import { PLANTS } from "../game/plants";
import type { Plot as PlotType } from "../game/types";
import { CoinIcon, DropIcon, LockIcon } from "./Icons";
import PlantSprite, { stageOf } from "./PlantSprite";

interface Floater {
  amount: number;
  key: number;
}

interface Props {
  plot: PlotType;
  index: number;
  locked: boolean;
  lockCost?: number;
  canPlant: boolean;
  floater: Floater | null;
  onTap: () => void;
}

export default function Plot({ plot, index, locked, lockCost, canPlant, floater, onTap }: Props) {
  if (locked) {
    return (
      <button className="plot locked" onClick={onTap} aria-label={`解鎖土地 ${index + 1}`}>
        <span className="lock-icon">
          <LockIcon />
        </span>
        {lockCost !== undefined && (
          <span className="lock-cost">
            <CoinIcon size={11} /> {lockCost}
          </span>
        )}
      </button>
    );
  }

  const mature = isMature(plot);
  const noWater = plot.plant !== null && PLANTS[plot.plant].noWater;
  const stage = plot.plant ? stageOf(plot.progress) : "seed";

  return (
    <button
      className={`plot${plot.plant ? "" : " empty"}${mature ? " mature" : ""}${canPlant && !plot.plant ? " plantable" : ""}`}
      onClick={onTap}
      aria-label={plot.plant ? PLANTS[plot.plant].name : `空地 ${index + 1}`}
    >
      {plot.plant && !mature && !noWater && (
        <span className="waterbar">
          <span style={{ width: `${Math.round(plot.water * 100)}%` }} />
        </span>
      )}
      {plot.plant && !mature && !noWater && plot.water < 0.3 && (
        <span className="droplet">
          <DropIcon />
        </span>
      )}
      {mature && <span className="harvest-badge">收獲</span>}
      {plot.plant && (
        <span
          key={stage}
          className={`sprite pop${stage === "sprout" || stage === "bud" || stage === "bloom" ? " sway" : ""}`}
        >
          <PlantSprite plant={plot.plant} stage={stage} />
        </span>
      )}
      {plot.plant && !mature && (
        <span className="progressbar">
          <span style={{ width: `${Math.round(plot.progress * 100)}%` }} />
        </span>
      )}
      {floater && (
        <span key={floater.key} className="coin-float">
          +{floater.amount}
        </span>
      )}
    </button>
  );
}
