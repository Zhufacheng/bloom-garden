import { describe, expect, it } from "vitest";
import {
  MYSTERY_COST,
  PREMIUM_COST,
  PREMIUM_IDS,
  buyDeco,
  buyMysterySeed,
  buyPremiumSeed,
  buySeed,
  checkIn,
  claimMilestone,
  harvest,
  isUnlocked,
  newGame,
  plantSeed,
  sellValueOf,
  stepState,
  tickEvents,
  unlockNextRow,
  waterPlot,
} from "./logic";
import { emptyDecorations } from "./decor";
import { marketMult } from "./market";
import { COLUMNS, PLANT_LIST, PLANTS, emptySeeds } from "./plants";
import type { DecoId, GameState, Plot } from "./types";
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
    expect(harvest(s, 0, D).earned).toBe(Math.round(Math.round(12 * marketMult("grass", D)) * 2)); // grass 12 x2
  });

  it("non-golden sells normally", () => {
    const s = matureAt(plantSeed({ ...newGame(), ...sunny }, 0, "grass")!.state!, 0);
    expect(harvest(s, 0, D).earned).toBe(Math.round(12 * marketMult("grass", D)));
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
    let s = plantSeed(newGame(), 0, "grass")!.state!;
    s = stepState(s, 20);
    const expected = Math.round(12 * marketMult("grass", D));
    const r = harvest(s, 0, D);
    expect(r.earned).toBe(expected);
    expect(r.state!.coins).toBe(30 + expected); // starter grass seed costs nothing
    expect(r.state!.plots[0].plant).toBeNull();
    expect(r.state!.totalHarvested).toBe(1);
    expect(r.state!.totalEarned).toBe(expected);
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
    expect(sellValueOf(s, "grass", false, D)).toBe(Math.round(12 * m));
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
    const expected = Math.round(Math.round(12 * marketMult("grass", D)) * 1.5);
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

  it("rainbow speeds up growth for 60s", () => {
    const s = due();
    const r = tickEvents(s, Date.now(), seq(0.5, 0.5, 0.9)); // delay, event, rainbow
    expect(r.msg).toContain("彩虹");
    expect(r.state.growthBoostUntil).toBeGreaterThan(Date.now());
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
  const base = Math.round(12 * marketMult("grass", D));

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
