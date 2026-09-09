import { describe, expect, it } from "vitest";
import {
  advanceDaily,
  advanceOrders,
  allClaimed,
  claimOrder,
  claimTask,
  ensureDaily,
  rollDaily,
  todayStr,
  unclaimedCount,
  type DailyEvent,
  type DailyState,
  type DailyTask,
} from "./daily";
import { PLANT_LIST } from "./plants";

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
      orders: [],
    };
    const after = advanceDaily(state, { type: "earn", coins: 40 });
    expect(after.tasks[0].progress).toBe(50);
  });
});

describe("orders", () => {
  it("rolls 2 distinct-plant orders deterministically, paying 1.5x base price", () => {
    const a = rollDaily("2026-09-08");
    const b = rollDaily("2026-09-08");
    expect(a.orders).toEqual(b.orders);
    expect(a.orders).toHaveLength(2);
    expect(new Set(a.orders.map((o) => o.plant)).size).toBe(2);
    for (const o of a.orders) {
      const def = PLANT_LIST.find((p) => p.id === o.plant)!;
      expect(o.count).toBeGreaterThanOrEqual(2);
      expect(o.count).toBeLessThanOrEqual(4);
      expect(o.reward).toBe(Math.round(def.sellValue * o.count * 1.5));
      expect(o.progress).toBe(0);
      expect(o.claimed).toBe(false);
    }
  });

  it("advances only the matching unclaimed order", () => {
    const d = rollDaily("2026-09-08");
    const [o1, o2] = d.orders;
    const after = advanceOrders(d, o1.plant);
    expect(after.orders[0].progress).toBe(1);
    expect(after.orders[1]).toBe(o2);
    const missing = PLANT_LIST.find((p) => !d.orders.some((o) => o.plant === p.id))!.id;
    expect(advanceOrders(d, missing)).toBe(d);
  });

  it("stops advancing completed orders", () => {
    const d = rollDaily("2026-09-08");
    const target = d.orders[0].count;
    let cur = d;
    for (let i = 0; i < target; i++) cur = advanceOrders(cur, d.orders[0].plant);
    expect(cur.orders[0].progress).toBe(target);
    expect(advanceOrders(cur, d.orders[0].plant)).toBe(cur);
  });

  it("pays the bounty once and refuses incomplete claims", () => {
    const d = rollDaily("2026-09-08");
    const o = d.orders[1];
    expect(claimOrder(d, 1)).toBeNull();
    let cur = d;
    for (let i = 0; i < o.count; i++) cur = advanceOrders(cur, o.plant);
    const res = claimOrder(cur, 1);
    expect(res!.reward).toBe(o.reward);
    expect(res!.state.orders[1].claimed).toBe(true);
    expect(claimOrder(res!.state, 1)).toBeNull();
  });

  it("ensureDaily backfills orders on same-day saves from before orders existed", () => {
    const fresh = rollDaily("2026-09-08");
    const legacy = { date: "2026-09-08", tasks: fresh.tasks } as unknown as DailyState;
    const migrated = ensureDaily(legacy, "2026-09-08");
    expect(migrated.tasks).toBe(fresh.tasks);
    expect(migrated.orders).toEqual(fresh.orders);
    expect(ensureDaily(fresh, "2026-09-08")).toBe(fresh);
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
      orders: [],
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
      orders: [],
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
