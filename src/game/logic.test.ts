import { describe, expect, it } from "vitest";
import {
  harvest,
  isUnlocked,
  newGame,
  plantSeed,
  stepState,
  unlockNextRow,
  waterPlot,
} from "./logic";
import { COLUMNS } from "./plants";

describe("newGame", () => {
  it("starts with 30 coins, 3x3 unlocked plots, 15 plots total", () => {
    const s = newGame();
    expect(s.coins).toBe(30);
    expect(s.rows).toBe(3);
    expect(s.plots).toHaveLength(COLUMNS * 5);
    expect(isUnlocked(s, 8)).toBe(true);
    expect(isUnlocked(s, 9)).toBe(false);
  });
});

describe("plantSeed", () => {
  it("plants a seed, deducts coins, starts watered", () => {
    const s = newGame();
    const r = plantSeed(s, 0, "daisy");
    expect(r.error).toBeUndefined();
    expect(r.state!.coins).toBe(30 - 12);
    expect(r.state!.plots[0].plant).toBe("daisy");
    expect(r.state!.plots[0].progress).toBe(0);
    expect(r.state!.plots[0].water).toBe(1);
  });

  it("fails without enough coins", () => {
    const s = { ...newGame(), coins: 5 };
    const r = plantSeed(s, 0, "rose");
    expect(r.error).toBeDefined();
    expect(r.state).toBeUndefined();
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

describe("stepState growth and water", () => {
  it("grows at the right rate while water lasts", () => {
    const s = plantSeed(newGame(), 0, "grass")!.state!; // grass: growTime 20s
    const after = stepState(s, 10);
    expect(after.plots[0].progress).toBeCloseTo(0.5, 5);
    expect(after.plots[0].water).toBeCloseTo(0.75, 5);
  });

  it("blooms before water runs out, keeping the leftover water", () => {
    const s = plantSeed(newGame(), 0, "grass")!.state!;
    const after = stepState(s, 40);
    expect(after.plots[0].progress).toBe(1);
    expect(after.plots[0].water).toBeCloseTo(0.5, 5); // drained only during 20s of growth
  });

  it("stops growing when the water runs dry", () => {
    const s = plantSeed({ ...newGame(), coins: 200 }, 0, "rose")!.state!; // rose: growTime 110s > 40s water
    const after = stepState(s, 40);
    expect(after.plots[0].progress).toBeCloseTo(40 / 110, 5);
    expect(after.plots[0].water).toBe(0);
  });

  it("resumes after re-watering", () => {
    let s = plantSeed({ ...newGame(), coins: 200 }, 0, "rose")!.state!;
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
    expect(r.state!.coins).toBe(30 - 5 + 12);
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
