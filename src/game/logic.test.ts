import { describe, expect, it } from "vitest";
import {
  buyDeco,
  buySeed,
  claimMilestone,
  harvest,
  isUnlocked,
  newGame,
  plantSeed,
  sellValueOf,
  stepState,
  unlockNextRow,
  waterPlot,
} from "./logic";
import { emptyDecorations } from "./decor";
import { COLUMNS, emptySeeds } from "./plants";
import type { DecoId, GameState, Plot } from "./types";
import { rollWeather, tickWeather } from "./weather";

describe("newGame", () => {
  it("starts with 30 coins, 3x3 unlocked plots, 15 plots total, 5 free grass seeds", () => {
    const s = newGame();
    expect(s.coins).toBe(30);
    expect(s.rows).toBe(3);
    expect(s.plots).toHaveLength(COLUMNS * 5);
    expect(isUnlocked(s, 8)).toBe(true);
    expect(isUnlocked(s, 9)).toBe(false);
    expect(s.seeds.grass).toBe(5);
    expect(s.seeds.daisy).toBe(0);
  });

  it("starts sunny with a future weather expiry", () => {
    const s = newGame();
    expect(["sunny", "hot", "rain"]).toContain(s.weather);
    expect(s.weatherUntil).toBeGreaterThan(Date.now());
  });
});

describe("weather effects", () => {
  const withPlant = (weather: "sunny" | "hot" | "rain") =>
    plantSeed({ ...newGame(), weather, weatherUntil: Date.now() + 60_000 }, 0, "grass")!.state!;

  it("hot weather drains water twice as fast", () => {
    const after = stepState(withPlant("hot"), 10);
    expect(after.plots[0].water).toBeCloseTo(0.5, 5);
  });

  it("rain never drains and refills water", () => {
    let s = withPlant("rain");
    s = { ...s, plots: s.plots.map((p, i) => (i === 0 ? { ...p, water: 0.2 } : p)) };
    const after = stepState(s, 10);
    expect(after.plots[0].water).toBeCloseTo(0.2 + 10 / 30, 5);
    expect(after.plots[0].progress).toBeCloseTo(0.5, 5); // grows without any manual watering
  });

  it("tickWeather keeps the weather before expiry and rerolls after", () => {
    const s = { ...newGame(), weatherUntil: Date.now() + 60_000 };
    expect(tickWeather(s, Date.now())).toBe(s);
    const expired = { ...s, weather: "rain" as const, weatherUntil: Date.now() - 1000 };
    const after = tickWeather(expired, Date.now());
    expect(after.weatherUntil).toBeGreaterThan(Date.now());
    expect(["sunny", "hot", "rain"]).toContain(after.weather);
  });

  it("rollWeather honors the rng seed", () => {
    const a = rollWeather(1000, () => 0.1); // < 0.4
    const b = rollWeather(1000, () => 0.1);
    expect(a.weather).toBe("sunny");
    expect(b).toEqual(a);
    const c = rollWeather(1000, () => 0.5); // 0.4..0.7
    expect(c.weather).toBe("hot");
    const d = rollWeather(1000, () => 0.9); // > 0.7
    expect(d.weather).toBe("rain");
  });
});

const matureAt = (s: GameState, i: number, patch: Partial<Plot> = {}): GameState => ({
  ...s,
  plots: s.plots.map((p, x) => (x === i ? { ...p, progress: 1, ...patch } : p)),
});

describe("golden plants", () => {
  it("sell for double", () => {
    const s = matureAt(plantSeed({ ...newGame(), ...sunny }, 0, "grass")!.state!, 0, { golden: true });
    expect(harvest(s, 0).earned).toBe(24); // grass 12 x2
  });

  it("non-golden sells normally", () => {
    const s = matureAt(plantSeed({ ...newGame(), ...sunny }, 0, "grass")!.state!, 0);
    expect(harvest(s, 0).earned).toBe(12);
  });
});

describe("decorations", () => {
  const withDeco = (deco: Partial<Record<DecoId, boolean>>) =>
    ({ ...emptyDecorations(), ...deco }) as Record<DecoId, boolean>;

  it("butterfly adds 10% to sell value", () => {
    const s = { ...newGame(), decorations: withDeco({ butterfly: true }) };
    expect(sellValueOf(s, "daisy", false)).toBe(33); // round(30 * 1.1)
    expect(sellValueOf(s, "daisy", true)).toBe(66); // round(30 * 1.1 * 2)
  });

  it("fountain slows water drain by 25%", () => {
    const s = plantSeed({ ...newGame(), ...sunny, decorations: withDeco({ fountain: true }) }, 0, "grass")!.state!;
    const after = stepState(s, 10);
    expect(after.plots[0].water).toBeCloseTo(1 - 10 * (1 / 40) * 0.75, 5); // 0.8125
  });

  it("buyDeco spends coins once", () => {
    let s = { ...newGame(), coins: 100 };
    const r = buyDeco(s, "fence");
    expect(r.state!.decorations.fence).toBe(true);
    expect(r.state!.coins).toBe(20);
    expect(buyDeco(r.state!, "fence").error).toBeDefined();
    expect(buyDeco({ ...newGame(), coins: 10 }, "fence").error).toBeDefined();
  });
});

describe("milestones", () => {
  it("pays once when the condition is met", () => {
    let s: GameState = { ...newGame(), totalHarvested: 1 };
    const r = claimMilestone(s, "harvest-1");
    expect(r.earned).toBe(10);
    expect(r.state!.coins).toBe(40);
    expect(r.state!.milestones).toEqual(["harvest-1"]);
    expect(claimMilestone(r.state!, "harvest-1").error).toBeDefined();
  });

  it("refuses unmet milestones", () => {
    expect(claimMilestone(newGame(), "harvest-25").error).toBeDefined();
  });
});

describe("cactus (noWater)", () => {
  const cactusState = () =>
    plantSeed({ ...newGame(), ...sunny, seeds: { ...emptySeeds(), cactus: 1 } }, 0, "cactus")!.state!;

  it("grows to maturity without any water", () => {
    const after = stepState(cactusState(), 45);
    expect(after.plots[0].progress).toBe(1);
    expect(after.plots[0].water).toBe(0);
  });

  it("ignores hot weather drain", () => {
    const s = { ...cactusState(), weather: "hot" as const };
    const after = stepState(s, 20);
    expect(after.plots[0].water).toBe(0);
    expect(after.plots[0].progress).toBeCloseTo(20 / 45, 5);
  });

  it("waterPlot is a no-op", () => {
    const s = cactusState();
    expect(waterPlot(s, 0)).toBe(s);
  });
});

describe("buySeed", () => {
  it("deducts coins and adds to the stash", () => {
    const s = { ...newGame(), coins: 50 };
    const r = buySeed(s, "tulip");
    expect(r.error).toBeUndefined();
    expect(r.state!.coins).toBe(50 - 25);
    expect(r.state!.seeds.tulip).toBe(1);
  });

  it("accumulates the stash over multiple buys", () => {
    let s = { ...newGame(), coins: 100 };
    s = buySeed(s, "tulip")!.state!;
    s = buySeed(s, "tulip")!.state!;
    expect(s.seeds.tulip).toBe(2);
    expect(s.coins).toBe(100 - 50);
  });

  it("refuses when coins are short", () => {
    const r = buySeed({ ...newGame(), coins: 20 }, "tulip");
    expect(r.error).toBeDefined();
  });
});

describe("plantSeed (stash)", () => {
  it("plants a stash seed, does not touch coins, starts watered", () => {
    const s = { ...newGame(), coins: 50 };
    const bought = buySeed(s, "daisy")!.state!;
    const r = plantSeed(bought, 0, "daisy");
    expect(r.error).toBeUndefined();
    expect(r.state!.coins).toBe(50 - 12);
    expect(r.state!.seeds.daisy).toBe(0);
    expect(r.state!.plots[0].plant).toBe("daisy");
    expect(r.state!.plots[0].progress).toBe(0);
    expect(r.state!.plots[0].water).toBe(1);
  });

  it("refuses without stash", () => {
    const r = plantSeed(newGame(), 0, "daisy");
    expect(r.error).toBeDefined();
    expect(r.state).toBeUndefined();
  });

  it("starter grass seeds can be planted", () => {
    const r = plantSeed(newGame(), 0, "grass");
    expect(r.error).toBeUndefined();
    expect(r.state!.seeds.grass).toBe(4);
  });

  it("supports rapid sequential planting from the stash", () => {
    const s = { ...newGame(), coins: 100, seeds: { ...emptySeeds(), tulip: 3 } };
    let st = plantSeed(s, 0, "tulip")!.state!;
    st = plantSeed(st, 1, "tulip")!.state!;
    st = plantSeed(st, 2, "tulip")!.state!;
    expect(st.seeds.tulip).toBe(0);
    expect(st.plots.filter((p) => p.plant === "tulip")).toHaveLength(3);
  });

  it("fails on an occupied plot", () => {
    const s = plantSeed(newGame(), 0, "grass")!.state!;
    const r = plantSeed(s, 0, "grass");
    expect(r.error).toBeDefined();
  });

  it("fails on a locked plot", () => {
    const r = plantSeed(newGame(), 12, "grass");
    expect(r.error).toBeDefined();
  });
});

const sunny = { weather: "sunny" as const, weatherUntil: Date.now() + 60_000 };

describe("stepState growth and water", () => {
  it("grows at the right rate while water lasts", () => {
    const s = plantSeed({ ...newGame(), ...sunny }, 0, "grass")!.state!; // grass: growTime 20s
    const after = stepState(s, 10);
    expect(after.plots[0].progress).toBeCloseTo(0.5, 5);
    expect(after.plots[0].water).toBeCloseTo(0.75, 5);
  });

  it("blooms before water runs out, keeping the leftover water", () => {
    const s = plantSeed({ ...newGame(), ...sunny }, 0, "grass")!.state!;
    const after = stepState(s, 40);
    expect(after.plots[0].progress).toBe(1);
    expect(after.plots[0].water).toBeCloseTo(0.5, 5); // drained only during 20s of growth
  });

  it("stops growing when the water runs dry", () => {
    const s = plantSeed({ ...newGame(), ...sunny, coins: 200, seeds: { ...emptySeeds(), rose: 1 } }, 0, "rose")!.state!; // rose: growTime 110s > 40s water
    const after = stepState(s, 40);
    expect(after.plots[0].progress).toBeCloseTo(40 / 110, 5);
    expect(after.plots[0].water).toBe(0);
  });

  it("resumes after re-watering", () => {
    let s = plantSeed({ ...newGame(), ...sunny, coins: 200, seeds: { ...emptySeeds(), rose: 1 } }, 0, "rose")!.state!;
    s = stepState(s, 40); // water runs out
    s = waterPlot(s, 0);
    s = stepState(s, 40); // a full watering lasts exactly 40s again
    expect(s.plots[0].progress).toBeCloseTo(80 / 110, 5);
    expect(s.plots[0].water).toBe(0);
  });

  it("offline catch-up over an hour still blooms exactly", () => {
    const s = plantSeed(newGame(), 0, "grass")!.state!;
    const after = stepState(s, 3600);
    expect(after.plots[0].progress).toBe(1);
  });

  it("mature plants keep their water", () => {
    let s = plantSeed(newGame(), 0, "grass")!.state!;
    s = stepState(s, 20);
    expect(s.plots[0].progress).toBe(1);
    const after = stepState(s, 100);
    expect(after.plots[0].water).toBeCloseTo(s.plots[0].water, 5);
    expect(after.plots[0].progress).toBe(1);
  });

  it("does not touch empty plots", () => {
    const s = newGame();
    const after = stepState(s, 100);
    expect(after.plots[0]).toBe(s.plots[0]);
  });
});

describe("harvest", () => {
  it("harvests a mature plant for coins and clears the plot", () => {
    let s = plantSeed(newGame(), 0, "grass")!.state!;
    s = stepState(s, 20);
    const r = harvest(s, 0);
    expect(r.earned).toBe(12);
    expect(r.state!.coins).toBe(30 + 12); // starter grass seed costs nothing
    expect(r.state!.plots[0].plant).toBeNull();
    expect(r.state!.totalHarvested).toBe(1);
    expect(r.state!.totalEarned).toBe(12);
  });

  it("refuses an immature plant", () => {
    const s = plantSeed(newGame(), 0, "grass")!.state!;
    const r = harvest(s, 0);
    expect(r.error).toBeDefined();
  });

  it("refuses an empty plot", () => {
    const r = harvest(newGame(), 0);
    expect(r.error).toBeDefined();
  });
});

describe("waterPlot", () => {
  it("refills water to full", () => {
    let s = plantSeed(newGame(), 0, "grass")!.state!;
    s = stepState(s, 10);
    s = waterPlot(s, 0);
    expect(s.plots[0].water).toBe(1);
  });

  it("no-op on empty plots", () => {
    const s = newGame();
    expect(waterPlot(s, 0)).toBe(s);
  });
});

describe("unlockNextRow", () => {
  it("unlocks row 4 for 120 coins", () => {
    const s = { ...newGame(), coins: 200 };
    const r = unlockNextRow(s);
    expect(r.error).toBeUndefined();
    expect(r.state!.rows).toBe(4);
    expect(r.state!.coins).toBe(80);
  });

  it("unlocks row 5 for 300 coins", () => {
    const s = { ...newGame(), rows: 4, coins: 300 };
    const r = unlockNextRow(s);
    expect(r.state!.rows).toBe(5);
    expect(r.state!.coins).toBe(0);
  });

  it("refuses when coins are short", () => {
    const r = unlockNextRow(newGame());
    expect(r.error).toBeDefined();
  });

  it("refuses at max rows", () => {
    const s = { ...newGame(), rows: 5, coins: 999 };
    const r = unlockNextRow(s);
    expect(r.error).toBeDefined();
  });
});
