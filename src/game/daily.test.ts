import { describe, expect, it } from "vitest";
import { advanceDaily, allClaimed, claimTask, ensureDaily, rollDaily, todayStr, unclaimedCount, type DailyEvent, type DailyTask } from "./daily";

function eventFor(id: DailyTask["id"], amount: number): DailyEvent {
  switch (id) {
    case "harvest":
      return { type: "harvest", plants: amount };
    case "water":
      return { type: "water", times: amount };
    case "earn":
      return { type: "earn", coins: amount };
    case "plant":
      return { type: "plant", plants: amount };
  }
}

describe("rollDaily", () => {
  it("is deterministic for a given date", () => {
    const a = rollDaily("2026-09-08");
    const b = rollDaily("2026-09-08");
    expect(a.tasks).toEqual(b.tasks);
  });

  it("rolls 3 tasks with distinct ids", () => {
    const d = rollDaily("2026-09-08");
    expect(d.tasks).toHaveLength(3);
    const ids = d.tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("rolls positive targets and rewards", () => {
    for (const date of ["2026-09-01", "2026-09-08", "2026-12-31"]) {
      const d = rollDaily(date);
      for (const t of d.tasks) {
        expect(t.target).toBeGreaterThan(0);
        expect(t.reward).toBeGreaterThan(0);
        expect(t.progress).toBe(0);
        expect(t.claimed).toBe(false);
      }
    }
  });
});

describe("ensureDaily", () => {
  it("keeps same-day state, rolls a new day", () => {
    const d = rollDaily("2026-09-08");
    expect(ensureDaily(d, "2026-09-08")).toBe(d);
    expect(ensureDaily(d, "2026-09-09").date).toBe("2026-09-09");
    expect(ensureDaily(null, "2026-09-08").date).toBe("2026-09-08");
  });
});

describe("advanceDaily", () => {
  it("advances only the matching task and clamps at target", () => {
    const d = rollDaily("2026-09-08");
    const t = d.tasks[0];
    const after = advanceDaily(d, eventFor(t.id, 999));
    expect(after.tasks[0].progress).toBe(t.target);
    const otherIdx = d.tasks.findIndex((x) => x.id !== t.id);
    expect(after.tasks[otherIdx].progress).toBe(0);
  });

  it("does not advance claimed tasks", () => {
    let d = rollDaily("2026-09-08");
    const t = d.tasks[0];
    d = advanceDaily(d, eventFor(t.id, 999));
    d = claimTask(d, 0)!.state;
    const after = advanceDaily(d, eventFor(t.id, 999));
    expect(after.tasks[0].claimed).toBe(true);
    expect(after.tasks[0].progress).toBe(t.target);
  });

  it("earn events count coins", () => {
    const state = {
      date: "2026-09-01",
      tasks: [
        { id: "earn" as const, desc: "賺取 50 金幣", target: 50, progress: 20, reward: 35, claimed: false },
      ],
    };
    const after = advanceDaily(state, { type: "earn", coins: 40 });
    expect(after.tasks[0].progress).toBe(50);
  });
});

describe("claimTask / unclaimedCount / allClaimed", () => {
  it("refuses incomplete and double claims, pays reward once", () => {
    const d = rollDaily("2026-09-08");
    const t = d.tasks[0];
    const incomplete = { ...d, tasks: d.tasks.map((x, i) => (i === 0 ? { ...x, progress: 0 } : x)) };
    expect(claimTask(incomplete, 0)).toBeNull();
    const done = advanceDaily(d, eventFor(t.id, 999));
    const res = claimTask(done, 0);
    expect(res!.reward).toBe(t.reward);
    expect(res!.state.tasks[0].claimed).toBe(true);
    expect(claimTask(res!.state, 0)).toBeNull();
  });

  it("unclaimedCount counts completable unclaimed tasks", () => {
    const state = {
      date: "2026-09-08",
      tasks: [
        { id: "harvest" as const, desc: "", target: 3, progress: 3, reward: 5, claimed: false },
        { id: "water" as const, desc: "", target: 5, progress: 1, reward: 5, claimed: false },
        { id: "plant" as const, desc: "", target: 2, progress: 2, reward: 5, claimed: true },
      ],
    };
    expect(unclaimedCount(state)).toBe(1);
    const res = claimTask(state, 0)!;
    expect(unclaimedCount(res.state)).toBe(0);
  });

  it("allClaimed is true only when every task is claimed", () => {
    const base = {
      date: "2026-09-08",
      tasks: [
        { id: "harvest" as const, desc: "", target: 3, progress: 3, reward: 5, claimed: false },
        { id: "water" as const, desc: "", target: 5, progress: 5, reward: 5, claimed: true },
        { id: "plant" as const, desc: "", target: 2, progress: 2, reward: 5, claimed: true },
      ],
    };
    expect(allClaimed(base)).toBe(false);
    expect(allClaimed(claimTask(base, 0)!.state)).toBe(true);
  });
});

describe("todayStr", () => {
  it("formats local date", () => {
    expect(todayStr(new Date(2026, 8, 8))).toBe("2026-09-08");
    expect(todayStr(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});
