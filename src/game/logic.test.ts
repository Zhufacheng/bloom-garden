import { describe, expect, it } from "vitest";
import {
  FERTILIZER_COST,
  FERTILIZER_MAX,
  MILESTONES,
  MYSTERY_COST,
  PREMIUM_COST,
  PREMIUM_IDS,
  UPGRADES,
  buyDeco,
  buyFertilizer,
  buyMysterySeed,
  buyPet,
  buyUpgrade,
  buyPremiumSeed,
  buySeed,
  checkIn,
  claimMilestone,
  goldenChanceOf,
  harvest,
  isUnlocked,
  newGame,
  openCrate,
  plantSeed,
  prestige,
  prestigeDewGain,
  sellValueOf,
  emptyUpgrades,
  stepState,
  tickEvents,
  unlockNextRow,
  waterPlot,
} from "./logic";
import { emptyDecorations } from "./decor";
import { marketMult } from "./market";
import { COLUMNS, PLANT_LIST, PLANTS, emptyCounts, emptySeeds } from "./plants";
import { nextTier, plantTier } from "./evolve";
import { LEVEL_TITLES, levelInfo, levelOf, levelSellMult, levelTitle } from "./level";
import { emptyPets } from "./pets";
import { SEASONS, seasonMult, seasonOf } from "./seasons";
import type { DecoId, GameState, PlantId, Plot } from "./types";
import { rollWeather, tickWeather } from "./weather";

/** fixed date so market prices are deterministic in tests */
const D = "2026-09-09";

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
    // grass 12 x2 (season factor applies; grass is out of season on D)
    expect(harvest(s, 0, D).earned).toBe(Math.round(12 * marketMult("grass", D) * seasonMult("grass", D) * 2));
  });

  it("non-golden sells normally", () => {
    const s = matureAt(plantSeed({ ...newGame(), ...sunny }, 0, "grass")!.state!, 0);
    expect(harvest(s, 0, D).earned).toBe(Math.round(12 * marketMult("grass", D) * seasonMult("grass", D)));
  });
});

describe("decorations", () => {
  const withDeco = (deco: Partial<Record<DecoId, boolean>>) =>
    ({ ...emptyDecorations(), ...deco }) as Record<DecoId, boolean>;

  it("butterfly adds 10% to sell value", () => {
    const s = { ...newGame(), decorations: withDeco({ butterfly: true }) };
    const m = marketMult("daisy", D);
    expect(sellValueOf(s, "daisy", false, D)).toBe(Math.round(30 * m * 1.1));
    expect(sellValueOf(s, "daisy", true, D)).toBe(Math.round(30 * m * 1.1 * 2));
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
    const s = matureAt(plantSeed(newGame(), 0, "grass")!.state!, 0); // no golden roll
    const expected = Math.round(12 * marketMult("grass", D) * seasonMult("grass", D));
    const r = harvest(s, 0, D);
    expect(r.earned).toBe(expected);
    expect(r.state!.coins).toBe(30 + expected); // starter grass seed costs nothing
    expect(r.state!.plots[0].plant).toBeNull();
    expect(r.state!.totalHarvested).toBe(1);
    expect(r.state!.totalEarned).toBe(expected);
  });

  it("counts the harvest into the plant book", () => {
    let s = plantSeed(newGame(), 0, "grass")!.state!;
    s = stepState(s, 20);
    s = { ...s, harvestCounts: { ...s.harvestCounts, grass: 4 } };
    const r = harvest(s, 0, D);
    expect(r.state!.harvestCounts.grass).toBe(5);
    expect(r.state!.harvestCounts.daisy).toBe(0);
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

  it("tracks the best combo streak", () => {
    let s = plantSeed(newGame(), 0, "grass")!.state!;
    s = plantSeed(s, 1, "grass")!.state!;
    s = matureAt(matureAt(s, 0), 1);
    const t0 = 1_000_000;
    s = harvest(s, 0, D, t0)!.state!;
    s = harvest(s, 1, D, t0 + 1_000)!.state!;
    expect(s.combo).toBe(2);
    expect(s.bestCombo).toBe(2);
    expect(newGame().bestCombo).toBe(0);
  });
});

describe("fertilizer", () => {
  it("buys for 40 coins up to the max of 5", () => {
    let s = { ...newGame(), coins: 200 };
    for (let i = 0; i < 5; i++) s = buyFertilizer(s)!.state!;
    expect(s.fertilizer).toBe(5);
    expect(s.coins).toBe(200 - 5 * FERTILIZER_COST);
    expect(buyFertilizer(s).error).toBeDefined();
  });

  it("refuses when coins are short", () => {
    expect(buyFertilizer({ ...newGame(), coins: FERTILIZER_COST - 1 }).error).toBeDefined();
  });

  it("auto-applies to the next plant, which grows 2x faster", () => {
    const s = plantSeed({ ...newGame(), fertilizer: 1 }, 0, "grass")!.state!;
    expect(s.fertilizer).toBe(0);
    expect(s.plots[0].fertilized).toBe(true);
    // grass grows in 20s normally; 10s with fertilizer
    expect(stepState(s, 10).plots[0].progress).toBe(1);
    const plain = stepState(plantSeed(newGame(), 3, "grass")!.state!, 10);
    expect(plain.plots[3].progress).toBe(0.5);
  });

  it("does not apply when the shed is empty", () => {
    const s = plantSeed(newGame(), 0, "grass")!.state!;
    expect(s.plots[0].fertilized).toBe(false);
    expect(s.fertilizer).toBe(0);
  });
});

describe("plant book & combo milestones", () => {
  const withBook = (ids: PlantId[]) => {
    const counts = emptyCounts();
    for (const id of ids) counts[id] = 1;
    return counts;
  };

  it("book-6 rewards collecting 6 species", () => {
    const s = { ...newGame(), harvestCounts: withBook(["grass", "daisy", "daffodil", "cactus", "tulip", "lavender"]) };
    const r = claimMilestone(s, "book-6");
    expect(r.error).toBeUndefined();
    expect(r.earned).toBe(50);
    expect(claimMilestone({ ...newGame(), harvestCounts: withBook(["grass"]) }, "book-6").error).toBeDefined();
  });

  it("book-12 rewards a complete collection", () => {
    expect(claimMilestone({ ...newGame(), harvestCounts: withBook(["grass", "rose"]) }, "book-12").error).toBeDefined();
    const r = claimMilestone({ ...newGame(), harvestCounts: withBook(PLANT_LIST.map((p) => p.id)) }, "book-12");
    expect(r.earned).toBe(150);
  });

  it("combo-10 rewards a best streak of 10", () => {
    expect(claimMilestone({ ...newGame(), bestCombo: 9 }, "combo-10").error).toBeDefined();
    expect(claimMilestone({ ...newGame(), bestCombo: 10 }, "combo-10").earned).toBe(60);
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

describe("daily market", () => {
  it("multiplier is deterministic and within ±25%", () => {
    const a = marketMult("tulip", D);
    expect(marketMult("tulip", D)).toBe(a);
    expect(a).toBeGreaterThanOrEqual(0.75);
    expect(a).toBeLessThanOrEqual(1.25);
  });

  it("prices differ across days", () => {
    const prices = ["2026-09-09", "2026-09-10", "2026-09-11"].map((d) => marketMult("rose", d));
    expect(new Set(prices).size).toBeGreaterThan(1);
  });

  it("sellValueOf reflects the market", () => {
    const s = newGame();
    const m = marketMult("grass", D);
    expect(sellValueOf(s, "grass", false, D)).toBe(Math.round(12 * m * seasonMult("grass", D)));
  });
});

describe("buyMysterySeed", () => {
  it("buys a deterministic plant with a fixed rng", () => {
    const s = { ...newGame(), coins: 50 };
    const r = buyMysterySeed(s, () => 0); // PLANT_LIST[0] = grass
    expect(r.plant).toBe("grass");
    expect(r.state!.seeds.grass).toBe(6); // 5 starter + 1
    expect(r.state!.coins).toBe(50 - MYSTERY_COST);
  });

  it("refuses when coins are short", () => {
    const r = buyMysterySeed({ ...newGame(), coins: 20 });
    expect(r.error).toBeDefined();
  });
});

describe("stepState speed (rainbow)", () => {
  it("1.3x speed grows 1.3x faster without changing drain", () => {
    const s = plantSeed({ ...newGame(), ...sunny }, 0, "grass")!.state!;
    const after = stepState(s, 10, 1.3);
    expect(after.plots[0].progress).toBeCloseTo(0.65, 5); // (10/20)*1.3
    expect(after.plots[0].water).toBeCloseTo(0.75, 5); // drain unchanged
  });
});

describe("harvest boost (bee)", () => {
  it("boosted plot earns 1.5x", () => {
    const s = matureAt(plantSeed({ ...newGame(), ...sunny }, 0, "grass")!.state!, 0, { boost: 1.5 });
    const expected = Math.round(Math.round(12 * marketMult("grass", D) * seasonMult("grass", D)) * 1.5);
    expect(harvest(s, 0, D).earned).toBe(expected);
  });
});

describe("tickEvents", () => {
  const due = () => ({ ...newGame(), nextEventAt: Date.now() - 1 });

  function seq(...vals: number[]) {
    let i = 0;
    return () => vals[i++ % vals.length];
  }

  it("does nothing before the next roll", () => {
    const s = { ...newGame(), nextEventAt: Date.now() + 60_000 };
    const r = tickEvents(s, Date.now());
    expect(r.state).toBe(s);
    expect(r.msg).toBeNull();
  });

  it("shower refills water on growing plants", () => {
    let s = due();
    s = plantSeed(s, 0, "grass")!.state!;
    s = { ...s, plots: s.plots.map((p, i) => (i === 0 ? { ...p, water: 0.2, progress: 0.5 } : p)) };
    const r = tickEvents(s, Date.now(), seq(0.5, 0.5, 0.6)); // delay, event, shower band
    expect(r.msg).toContain("快閃雨");
    expect(r.state.plots[0].water).toBe(1);
    expect(r.state.nextEventAt).toBeGreaterThan(Date.now());
  });

  it("caterpillar eats 25% of a growing plant's progress", () => {
    let s = due();
    s = plantSeed(s, 0, "grass")!.state!;
    s = { ...s, plots: s.plots.map((p, i) => (i === 0 ? { ...p, progress: 0.5 } : p)) };
    const r = tickEvents(s, Date.now(), seq(0.5, 0.5, 0.4, 0)); // delay, event, caterpillar band, first plot
    expect(r.msg).toContain("毛毛蟲");
    expect(r.state.plots[0].progress).toBeCloseTo(0.25, 5);
  });

  it("caterpillar with nothing growing falls back to a calm roll", () => {
    const s = due();
    const r = tickEvents(s, Date.now(), seq(0.5, 0.5, 0.4));
    expect(r.msg).toBeNull();
    expect(r.state.nextEventAt).toBeGreaterThan(Date.now());
  });

  it("scarecrow blocks the caterpillar event", () => {
    let s = due();
    s = plantSeed(s, 0, "grass")!.state!;
    s = {
      ...s,
      decorations: { ...emptyDecorations(), scarecrow: true },
      plots: s.plots.map((p, i) => (i === 0 ? { ...p, progress: 0.5 } : p)),
    };
    const r = tickEvents(s, Date.now(), seq(0.5, 0.5, 0.4, 0)); // caterpillar band
    expect(r.msg).toBeNull();
    expect(r.state.plots[0].progress).toBe(0.5); // untouched
  });

  it("bee boosts one mature plot by 1.5x", () => {
    let s = due();
    s = plantSeed(s, 0, "grass")!.state!;
    s = { ...s, plots: s.plots.map((p, i) => (i === 0 ? { ...p, progress: 1 } : p)) };
    const r = tickEvents(s, Date.now(), seq(0.5, 0.5, 0.1, 0)); // delay, event, bee band, first mature
    expect(r.msg).toContain("蜜蜂");
    expect(r.state.plots[0].boost).toBe(1.5);
  });

  it("bee with a beehive boosts one mature plot by 1.75x", () => {
    let s = due();
    s = plantSeed(s, 0, "grass")!.state!;
    s = {
      ...s,
      decorations: { ...emptyDecorations(), hive: true },
      plots: s.plots.map((p, i) => (i === 0 ? { ...p, progress: 1 } : p)),
    };
    const r = tickEvents(s, Date.now(), seq(0.5, 0.5, 0.1, 0)); // delay, event, bee band, first mature
    expect(r.msg).toContain("蜜蜂巢");
    expect(r.state.plots[0].boost).toBe(1.75);
  });

  it("shooting star pushes all growing plants +10%, capped at 0.99", () => {
    let s = due();
    s = plantSeed(s, 0, "grass")!.state!;
    s = plantSeed(s, 1, "grass")!.state!;
    s = { ...s, plots: s.plots.map((p, i) => (i === 0 ? { ...p, progress: 0.5 } : i === 1 ? { ...p, progress: 0.95 } : p)) };
    const r = tickEvents(s, Date.now(), seq(0.5, 0.5, 0.9)); // delay, event, shooting star band
    expect(r.msg).toContain("流星");
    expect(r.state.plots[0].progress).toBeCloseTo(0.6, 5);
    expect(r.state.plots[1].progress).toBe(0.99); // capped, not matured
  });

  it("rainbow speeds up growth for 60s", () => {
    const s = due();
    const r = tickEvents(s, Date.now(), seq(0.5, 0.5, 0.96)); // delay, event, rainbow
    expect(r.msg).toContain("彩虹");
    expect(r.state.growthBoostUntil).toBeGreaterThan(Date.now());
  });

  it("golden hour doubles harvest coins for 60s", () => {
    const s = due();
    const r = tickEvents(s, Date.now(), seq(0.5, 0.5, 0.7)); // delay, event, golden hour band
    expect(r.msg).toContain("黃金時刻");
    expect(r.state.coinBoostUntil).toBeGreaterThan(Date.now());
  });

  it("a calm roll keeps state but reschedules", () => {
    const s = due();
    const r = tickEvents(s, Date.now(), seq(0.5, 0.1)); // delay, calm
    expect(r.msg).toBeNull();
    expect(r.state).not.toBe(s);
    expect(r.state.nextEventAt).toBeGreaterThan(Date.now());
  });

  it("bee with no mature plants falls back to a calm roll", () => {
    const s = due();
    const r = tickEvents(s, Date.now(), seq(0.5, 0.5, 0.1)); // delay, event, bee band (none mature)
    expect(r.msg).toBeNull();
    expect(r.state.nextEventAt).toBeGreaterThan(Date.now());
  });
});

describe("harvest combo", () => {
  const threeMature = () => {
    let s = newGame();
    s = plantSeed(s, 0, "grass")!.state!;
    s = matureAt(s, 0);
    s = plantSeed(s, 1, "grass")!.state!;
    s = matureAt(s, 1);
    s = plantSeed(s, 2, "grass")!.state!;
    s = matureAt(s, 2);
    return s;
  };
  const base = Math.round(12 * marketMult("grass", D) * seasonMult("grass", D));

  it("3rd consecutive harvest within the window earns a bonus", () => {
    let s = threeMature();
    const t0 = 1_000_000;
    let r = harvest(s, 0, D, t0);
    expect(r.combo).toBe(1);
    expect(r.bonus).toBe(0);
    s = r.state!;
    r = harvest(s, 1, D, t0 + 5_000);
    expect(r.combo).toBe(2);
    expect(r.bonus).toBe(0);
    s = r.state!;
    r = harvest(s, 2, D, t0 + 10_000);
    expect(r.combo).toBe(3);
    const bonus = Math.round(base * 0.25);
    expect(r.bonus).toBe(bonus);
    expect(r.earned).toBe(base + bonus);
  });

  it("combo resets when the window expires", () => {
    let s = threeMature();
    const t0 = 1_000_000;
    let r = harvest(s, 0, D, t0);
    s = r.state!;
    r = harvest(s, 1, D, t0 + 20_000);
    expect(r.combo).toBe(1);
    expect(r.bonus).toBe(0);
  });
});

describe("plant catalog", () => {
  it("has 12 plants including the new blooms", () => {
    expect(PLANT_LIST).toHaveLength(12);
    expect(PLANTS.lotus.sellValue).toBe(280);
    expect(PLANTS.cherry.seedCost).toBe(130);
    expect(PLANTS.rainbowflower.growTime).toBe(170);
  });

  it("new plants are buyable from the shop", () => {
    let s = { ...newGame(), coins: 500 };
    s = buySeed(s, "lotus")!.state!;
    s = buySeed(s, "cherry")!.state!;
    s = buySeed(s, "rainbowflower")!.state!;
    expect(s.seeds.lotus).toBe(1);
    expect(s.seeds.cherry).toBe(1);
    expect(s.seeds.rainbowflower).toBe(1);
  });
});

describe("checkIn", () => {
  it("first check-in grants the day 1 reward", () => {
    const s = newGame();
    const r = checkIn(s, "2026-09-09", "2026-09-08");
    expect(r.streak).toBe(1);
    expect(r.day).toBe(1);
    expect(r.reward).toBe(10);
    expect(r.state!.coins).toBe(40);
    expect(r.state!.lastCheckIn).toBe("2026-09-09");
    expect(r.state!.checkInStreak).toBe(1);
  });

  it("consecutive days build the streak", () => {
    let s = newGame();
    s = checkIn(s, "2026-09-08", "2026-09-07")!.state!;
    const r = checkIn(s, "2026-09-09", "2026-09-08");
    expect(r.streak).toBe(2);
    expect(r.reward).toBe(15);
  });

  it("a missed day resets the streak", () => {
    let s = newGame();
    s = checkIn(s, "2026-09-01", "2026-08-31")!.state!;
    const r = checkIn(s, "2026-09-09", "2026-09-08");
    expect(r.streak).toBe(1);
    expect(r.day).toBe(1);
  });

  it("refuses a second check-in on the same day", () => {
    const s = { ...newGame(), lastCheckIn: "2026-09-09" };
    const r = checkIn(s, "2026-09-09", "2026-09-08");
    expect(r.error).toBeDefined();
  });

  it("day 7 pays the big reward, then the cycle restarts", () => {
    let s = { ...newGame(), lastCheckIn: "2026-09-06", checkInStreak: 6 };
    const r7 = checkIn(s, "2026-09-07", "2026-09-06");
    expect(r7.day).toBe(7);
    expect(r7.reward).toBe(100);
    s = r7.state!;
    const r8 = checkIn(s, "2026-09-08", "2026-09-07");
    expect(r8.streak).toBe(8);
    expect(r8.day).toBe(1);
    expect(r8.reward).toBe(10);
  });
});

describe("sprinkler (auto water)", () => {
  it("keeps water topped up even in hot weather", () => {
    const s = plantSeed(
      { ...newGame(), ...sunny, weather: "hot" as const, decorations: { ...emptyDecorations(), sprinkler: true } },
      0,
      "grass",
    )!.state!;
    const after = stepState(s, 40);
    expect(after.plots[0].water).toBe(1);
    expect(after.plots[0].progress).toBe(1);
  });

  it("without a sprinkler, hot weather dries the plant", () => {
    const s = plantSeed({ ...newGame(), ...sunny, weather: "hot" as const }, 0, "grass")!.state!;
    const after = stepState(s, 20);
    expect(after.plots[0].water).toBe(0);
  });
});

describe("buyPremiumSeed", () => {
  it("only rolls the six premium plants", () => {
    const s = { ...newGame(), coins: 1000 };
    for (let i = 0; i < PREMIUM_IDS.length; i++) {
      const r = buyPremiumSeed(s, () => i / PREMIUM_IDS.length);
      expect(PREMIUM_IDS).toContain(r.plant);
    }
  });

  it("deducts coins and adds to the stash", () => {
    const s = { ...newGame(), coins: 100 };
    const r = buyPremiumSeed(s, () => 0);
    expect(r.plant).toBe("sunflower"); // PREMIUM_IDS[0]
    expect(r.state!.seeds.sunflower).toBe(1);
    expect(r.state!.coins).toBe(100 - PREMIUM_COST);
  });

  it("refuses when coins are short", () => {
    const r = buyPremiumSeed({ ...newGame(), coins: PREMIUM_COST - 1 });
    expect(r.error).toBeDefined();
  });
});

describe("prestige (dew)", () => {
  it("dew gain follows the sqrt curve", () => {
    expect(prestigeDewGain({ ...newGame(), totalEarned: 0 })).toBe(0);
    expect(prestigeDewGain({ ...newGame(), totalEarned: 200 })).toBe(1);
    expect(prestigeDewGain({ ...newGame(), totalEarned: 800 })).toBe(2);
    expect(prestigeDewGain({ ...newGame(), totalEarned: 2000 })).toBe(3);
  });

  it("refuses before the first dew", () => {
    const r = prestige({ ...newGame(), totalEarned: 199 });
    expect(r.error).toBeDefined();
  });

  it("resets the garden but keeps dew, check-in and the plant book", () => {
    const s = {
      ...newGame(),
      totalEarned: 800,
      coins: 999,
      lastCheckIn: "2026-09-09",
      checkInStreak: 3,
      harvestCounts: { ...emptyCounts(), rose: 5 },
      pets: { ...emptyPets(), cat: true },
    };
    const r = prestige(s);
    expect(r.dewGained).toBe(2);
    const st = r.state!;
    expect(st.dew).toBe(2);
    expect(st.coins).toBe(30);
    expect(st.totalEarned).toBe(0);
    expect(st.lastCheckIn).toBe("2026-09-09");
    expect(st.checkInStreak).toBe(3);
    expect(st.decorations.fountain).toBe(false);
    expect(st.pets.cat).toBe(false);
    expect(st.harvestCounts.rose).toBe(5);
  });
});

describe("golden hour harvest", () => {
  it("doubles harvest coins while active, not after", () => {
    const s0 = matureAt(plantSeed({ ...newGame(), ...sunny }, 0, "grass")!.state!, 0);
    const t0 = 1_000_000;
    const base = Math.round(12 * marketMult("grass", D) * seasonMult("grass", D));
    const boosted = harvest({ ...s0, coinBoostUntil: t0 + 60_000 }, 0, D, t0);
    expect(boosted.earned).toBe(base * 2);
    const plain = harvest(s0, 0, D, t0);
    expect(plain.earned).toBe(base);
  });
});

describe("clover (golden chance)", () => {
  it("raises the golden chance from 10% to 15%", () => {
    expect(goldenChanceOf(newGame())).toBe(0.1);
    const s = { ...newGame(), decorations: { ...emptyDecorations(), clover: true } };
    expect(goldenChanceOf(s)).toBeCloseTo(0.15, 5);
  });
});

describe("dew shop upgrades", () => {
  it("buys with dew, once each", () => {
    let s = { ...newGame(), dew: 12 };
    s = buyUpgrade(s, "soil")!.state!;
    expect(s.dew).toBe(9);
    expect(s.upgrades.soil).toBe(true);
    expect(buyUpgrade(s, "soil").error).toBeDefined();
    expect(buyUpgrade({ ...newGame(), dew: 2 }, "star").error).toBeDefined();
    expect(UPGRADES).toHaveLength(3);
  });

  it("soil speeds growth by 10%", () => {
    const s = plantSeed({ ...newGame(), ...sunny, upgrades: { ...emptyUpgrades(), soil: true } }, 0, "grass")!.state!;
    expect(stepState(s, 10).plots[0].progress).toBeCloseTo(0.55, 5); // 10 of 20s, x1.1
  });

  it("touch adds 10% to the sell value", () => {
    const s = { ...newGame(), upgrades: { ...emptyUpgrades(), touch: true } };
    const m = marketMult("daisy", D);
    expect(sellValueOf(s, "daisy", false, D)).toBe(Math.round(30 * m * 1.1));
  });

  it("star adds 5% to the golden chance, stacking with clover", () => {
    expect(goldenChanceOf({ ...newGame(), upgrades: { ...emptyUpgrades(), star: true } })).toBeCloseTo(0.15, 5);
    const both = {
      ...newGame(),
      decorations: { ...emptyDecorations(), clover: true },
      upgrades: { ...emptyUpgrades(), star: true },
    };
    expect(goldenChanceOf(both)).toBeCloseTo(0.2, 5);
  });

  it("prestige keeps the upgrades", () => {
    const s = { ...newGame(), totalEarned: 800, upgrades: { ...emptyUpgrades(), soil: true, touch: true } };
    const st = prestige(s).state!;
    expect(st.upgrades.soil).toBe(true);
    expect(st.upgrades.touch).toBe(true);
    expect(st.upgrades.star).toBe(false);
  });
});

describe("dew sell bonus", () => {
  it("each dew adds 5% to the sell value", () => {
    const s = { ...newGame(), dew: 10 };
    const m = marketMult("daisy", D);
    expect(sellValueOf(s, "daisy", false, D)).toBe(Math.round(30 * m * 1.5)); // 1 + 10 x 0.05
  });
});

describe("seasons", () => {
  it("is deterministic and rotates every 3 days", () => {
    expect(seasonOf(D).id).toBe(seasonOf(D).id);
    expect(seasonOf("2026-09-08").id).toBe(seasonOf("2026-09-09").id); // same 3-day block
    expect(seasonOf("2026-09-10").id).not.toBe(seasonOf("2026-09-09").id);
  });

  it("covers all 12 plants exactly once across the four seasons", () => {
    const all = SEASONS.flatMap((s) => s.bonus);
    expect(all).toHaveLength(12);
    expect(new Set(all).size).toBe(12);
  });

  it("in-season plants sell for +20% on D (summer)", () => {
    expect(seasonOf(D).id).toBe("summer");
    expect(seasonMult("sunflower", D)).toBeCloseTo(1.2, 5);
    const s = newGame();
    expect(sellValueOf(s, "sunflower", false, D)).toBe(Math.round(125 * marketMult("sunflower", D) * 1.2));
    // grass is out of season on D
    expect(sellValueOf(s, "grass", false, D)).toBe(Math.round(12 * marketMult("grass", D)));
  });
});

describe("pets", () => {
  function seq(...vals: number[]) {
    let i = 0;
    return () => vals[i++ % vals.length];
  }

  it("buys for coins, once each", () => {
    let s = { ...newGame(), coins: 500 };
    const r = buyPet(s, "cat");
    expect(r.state!.pets.cat).toBe(true);
    expect(r.state!.coins).toBe(500 - 350);
    expect(buyPet(r.state!, "cat").error).toBeDefined();
    expect(buyPet({ ...newGame(), coins: 100 }, "rabbit").error).toBeDefined();
  });

  it("cat adds 5% to the sell value", () => {
    const s = { ...newGame(), pets: { ...emptyPets(), cat: true } };
    const m = marketMult("daisy", D);
    expect(sellValueOf(s, "daisy", false, D)).toBe(Math.round(30 * m * 1.05));
  });

  it("rabbit speeds growth by 5%", () => {
    const s = plantSeed({ ...newGame(), ...sunny, pets: { ...emptyPets(), rabbit: true } }, 0, "grass")!.state!;
    expect(stepState(s, 10).plots[0].progress).toBeCloseTo(0.525, 5); // (10/20) x 1.05
  });

  it("hedgehog blocks the caterpillar 25% of the time", () => {
    const base = () => {
      let s = { ...newGame(), nextEventAt: Date.now() - 1, pets: { ...emptyPets(), hedgehog: true } };
      s = plantSeed(s, 0, "grass")!.state!;
      s = { ...s, plots: s.plots.map((p, i) => (i === 0 ? { ...p, progress: 0.5 } : p)) };
      return s;
    };
    const blocked = tickEvents(base(), Date.now(), seq(0.5, 0.5, 0.4, 0.1)); // 0.1 < 0.25 blocks
    expect(blocked.msg).toContain("刺猬");
    expect(blocked.state.plots[0].progress).toBe(0.5); // untouched
    const eaten = tickEvents(base(), Date.now(), seq(0.5, 0.5, 0.4, 0.9, 0)); // 0.9 fails, first plot
    expect(eaten.msg).toContain("毛毛蟲");
    expect(eaten.state.plots[0].progress).toBeCloseTo(0.25, 5);
  });
});

describe("extended milestones", () => {
  it("the catalog now has 15 milestones", () => {
    expect(MILESTONES).toHaveLength(15);
  });

  it("harvest-400 / earn-15000 / combo-20 pay when met", () => {
    expect(claimMilestone({ ...newGame(), totalHarvested: 400 }, "harvest-400").earned).toBe(80);
    expect(claimMilestone({ ...newGame(), totalHarvested: 399 }, "harvest-400").error).toBeDefined();
    expect(claimMilestone({ ...newGame(), totalEarned: 15000 }, "earn-15000").earned).toBe(150);
    expect(claimMilestone({ ...newGame(), bestCombo: 20 }, "combo-20").earned).toBe(100);
    expect(claimMilestone({ ...newGame(), bestCombo: 19 }, "combo-20").error).toBeDefined();
  });

  it("deco-8 pays for a full decoration set", () => {
    const deco = { ...emptyDecorations() };
    (Object.keys(deco) as DecoId[]).forEach((k) => (deco[k] = true));
    expect(claimMilestone({ ...newGame(), decorations: deco }, "deco-8").earned).toBe(120);
  });

  it("pets-3 pays for all three companions", () => {
    const s = { ...newGame(), pets: { ...emptyPets(), cat: true, rabbit: true, hedgehog: true } };
    expect(claimMilestone(s, "pets-3").earned).toBe(100);
    expect(claimMilestone({ ...newGame(), pets: { ...emptyPets(), cat: true } }, "pets-3").error).toBeDefined();
  });
});

describe("seed evolution", () => {
  const at = (n: number, plant: PlantId = "daisy") => ({
    ...newGame(),
    harvestCounts: { ...emptyCounts(), [plant]: n },
  });

  it("tiers unlock at 10 and 50 lifetime harvests", () => {
    expect(plantTier(at(0), "daisy")).toBe(0);
    expect(plantTier(at(9), "daisy")).toBe(0);
    expect(plantTier(at(10), "daisy")).toBe(1);
    expect(plantTier(at(49), "daisy")).toBe(1);
    expect(plantTier(at(50), "daisy")).toBe(2);
    expect(plantTier(at(200), "daisy")).toBe(2);
  });

  it("evolution is independent per species", () => {
    const s = { ...newGame(), harvestCounts: { ...emptyCounts(), daisy: 10, rose: 3 } };
    expect(plantTier(s, "daisy")).toBe(1);
    expect(plantTier(s, "rose")).toBe(0);
  });

  it("evolved plants sell for 1.5x, legendary for 2.5x", () => {
    const m = marketMult("daisy", D);
    expect(sellValueOf(at(10), "daisy", false, D)).toBe(Math.round(30 * m * 1.5));
    expect(sellValueOf(at(50), "daisy", false, D)).toBe(Math.round(30 * m * 2.5));
    // daisy is out of season on D, so no other multipliers apply
  });

  it("golden doubles stack on top of the tier", () => {
    let s = plantSeed({ ...newGame(), seeds: { ...emptySeeds(), daisy: 1 } }, 0, "daisy")!.state!;
    s = { ...s, harvestCounts: { ...emptyCounts(), daisy: 10 } };
    s = matureAt(s, 0, { golden: true });
    expect(harvest(s, 0, D).earned).toBe(Math.round(30 * marketMult("daisy", D) * 1.5 * 2));
  });

  it("nextTier reports the upcoming unlock, null when maxed", () => {
    expect(nextTier(at(0, "tulip"), "tulip")?.min).toBe(10);
    expect(nextTier(at(10, "tulip"), "tulip")?.min).toBe(50);
    expect(nextTier(at(50, "tulip"), "tulip")).toBeNull();
  });
});

describe("gardener level", () => {
  it("level follows the sqrt-of-earnings curve", () => {
    expect(levelOf(0)).toBe(1);
    expect(levelOf(99)).toBe(1);
    expect(levelOf(100)).toBe(2);
    expect(levelOf(900)).toBe(4);
    expect(levelOf(10000)).toBe(11);
  });

  it("sell bonus is +2% per level, capped at +50%", () => {
    expect(levelSellMult(1)).toBeCloseTo(1, 5);
    expect(levelSellMult(2)).toBeCloseTo(1.02, 5);
    expect(levelSellMult(11)).toBeCloseTo(1.2, 5);
    expect(levelSellMult(26)).toBeCloseTo(1.5, 5); // cap reached
    expect(levelSellMult(50)).toBeCloseTo(1.5, 5); // stays capped
  });

  it("titles map to levels and clamp at the top", () => {
    expect(levelTitle(1)).toBe("新手農夫");
    expect(levelTitle(4)).toBe("花匠");
    expect(levelTitle(LEVEL_TITLES.length)).toBe("花之神");
    expect(levelTitle(LEVEL_TITLES.length + 5)).toBe("花之神");
  });

  it("levelInfo reports progress toward the next level", () => {
    const li = levelInfo({ ...newGame(), totalEarned: 225 });
    expect(li.level).toBe(2);
    expect(li.frac).toBeCloseTo(0.4167, 4);
    expect(li.sellMult).toBeCloseTo(1.02, 5);
  });

  it("level 1 is identity, higher levels raise the sell value", () => {
    const m = marketMult("daisy", D);
    // daisy is out of season on D, so only the level multiplier applies
    expect(sellValueOf({ ...newGame(), totalEarned: 0 }, "daisy", false, D)).toBe(Math.round(30 * m));
    expect(sellValueOf({ ...newGame(), totalEarned: 900 }, "daisy", false, D)).toBe(Math.round(30 * m * 1.06));
    expect(sellValueOf({ ...newGame(), totalEarned: 10000 }, "daisy", false, D)).toBe(Math.round(30 * m * 1.2));
  });
});

describe("harvest gift crates", () => {
  it("grants a crate on the 10th harvest and wraps the progress", () => {
    let s = { ...newGame(), crateProgress: 9 };
    s = matureAt(plantSeed(s, 0, "grass")!.state!, 0);
    const r = harvest(s, 0, D);
    expect(r.crateGained).toBe(true);
    expect(r.state!.crates).toBe(1);
    expect(r.state!.crateProgress).toBe(0);
  });

  it("does not grant a crate before the 10th harvest", () => {
    let s = { ...newGame(), crateProgress: 5 };
    s = matureAt(plantSeed(s, 0, "grass")!.state!, 0);
    const r = harvest(s, 0, D);
    expect(r.crateGained).toBe(false);
    expect(r.state!.crates).toBe(0);
    expect(r.state!.crateProgress).toBe(6);
  });

  it("crates reset on prestige", () => {
    const s = { ...newGame(), totalEarned: 800, crates: 3, crateProgress: 4 };
    const st = prestige(s).state!;
    expect(st.crates).toBe(0);
    expect(st.crateProgress).toBe(0);
  });
});

describe("openCrate", () => {
  it("refuses when there are no crates", () => {
    expect(openCrate(newGame()).error).toBeDefined();
  });

  it("rolls coins (band < 0.45)", () => {
    const s = { ...newGame(), coins: 0, crates: 1 };
    const r = openCrate(s, () => 0.1); // amount = 25 + floor(0.1 * 51) = 30
    expect(r.reward!.kind).toBe("coins");
    expect(r.reward!.amount).toBe(30);
    expect(r.state!.coins).toBe(30);
    expect(r.state!.crates).toBe(0);
  });

  it("rolls a premium seed (0.45 <= band < 0.7)", () => {
    const s = { ...newGame(), coins: 100, crates: 1 };
    const r = openCrate(s, () => 0.5); // PREMIUM_IDS[floor(0.5 * 6)] = "lotus"
    expect(r.reward!.kind).toBe("seed");
    expect(r.reward!.plant).toBe("lotus");
    expect(r.reward!.premium).toBe(true);
    expect(r.state!.seeds.lotus).toBe(1);
  });

  it("rolls fertilizer (0.7 <= band < 0.85)", () => {
    const s = { ...newGame(), fertilizer: 0, crates: 1 };
    const r = openCrate(s, () => 0.8);
    expect(r.reward!.kind).toBe("fertilizer");
    expect(r.state!.fertilizer).toBe(1);
  });

  it("fertilizer falls back to coins when the shed is full", () => {
    const s = { ...newGame(), fertilizer: FERTILIZER_MAX, coins: 0, crates: 1 };
    const r = openCrate(s, () => 0.8);
    expect(r.reward!.kind).toBe("coins");
    expect(r.reward!.amount).toBe(FERTILIZER_COST);
    expect(r.state!.fertilizer).toBe(FERTILIZER_MAX);
  });

  it("rolls a mystery seed from the full catalog (band >= 0.85)", () => {
    const s = { ...newGame(), crates: 1 };
    const r = openCrate(s, () => 0.9); // PLANT_LIST[floor(0.9 * 12)] = "cherry"
    expect(r.reward!.kind).toBe("seed");
    expect(r.reward!.plant).toBe("cherry");
    expect(r.reward!.premium).toBe(false);
    expect(r.state!.seeds.cherry).toBe(1);
  });
});
