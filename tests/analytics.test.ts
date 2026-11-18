import { describe, expect, it } from "vitest";
import { eventRequestSchema, type StoredEvent } from "@/lib/analytics/events";
import { dashboardStats, spread } from "@/lib/analytics/stats";

const RUN_A = "00000000-0000-4000-8000-00000000000a";
const RUN_B = "00000000-0000-4000-8000-00000000000b";
const DAY_A = "00000000-0000-4000-8000-0000000000da";
let minute = 0;
const ev = (run: string, name: StoredEvent["name"], props: Record<string, unknown> = {}): StoredEvent => ({
  at: new Date(Date.UTC(2026, 10, 18, 10, minute++)),
  daily: DAY_A,
  run,
  name,
  props,
});

describe("spread", () => {
  it("gives mean, median and population standard deviation", () => {
    expect(spread([2, 4, 4, 4, 5, 5, 7, 9])).toEqual({ mean: 5, median: 4.5, stdDev: 2 });
    expect(spread([])).toBeNull();
  });
});

describe("dashboardStats", () => {
  it("counts finished runs from each run's last summary only", () => {
    minute = 0;
    const events = [
      ev(RUN_A, "visit", { mobile: true }),
      ev(RUN_A, "screen", { step: "family" }),
      ev(RUN_A, "finished", { pass: 1, interesting: 1, unsure: 3, no: 0, taken: 0 }),
      ev(RUN_A, "go_again", { pass: 1 }),
      ev(RUN_A, "finished", { pass: 2, interesting: 3, unsure: 3, no: 2, taken: 0 }),
      ev(RUN_A, "share", { channel: "whatsapp" }),
      ev(RUN_B, "visit", { mobile: false }),
      ev(RUN_B, "round_served", { llm: false }),
      ev(RUN_B, "screen", { step: "family" }),
      ev(RUN_B, "finished", { pass: 1, interesting: 1, unsure: 1, no: 5, taken: 1 }),
    ];
    const s = dashboardStats(events, [{ date: "2026-11-18", usd: 4 }], 3);
    expect(s.visits).toBe(2);
    expect(s.userDays).toBe(1);
    expect(s.roundsFallback).toBe(1);
    expect(s.runs).toBe(2);
    expect(s.finishedRuns).toBe(2);
    expect(s.interesting).toEqual({ mean: 2, median: 2, stdDev: 1 });
    expect(s.unsure?.mean).toBe(2);
    expect(s.sharedRuns).toBe(1);
    expect(s.shareChannels.whatsapp).toBe(1);
    expect(s.goAgainRuns).toBe(1);
    expect(s.budgetDaysHit).toBe(1);
  });
});

describe("event request", () => {
  it("accepts only known events with their own fields", () => {
    const ok = { daily: DAY_A, run: RUN_A, event: { name: "share", props: { channel: "copy" } } };
    expect(eventRequestSchema.safeParse(ok).success).toBe(true);
    expect(eventRequestSchema.safeParse({ ...ok, event: { name: "share", props: { channel: "email" } } }).success).toBe(false);
    expect(eventRequestSchema.safeParse({ ...ok, event: { name: "names", props: { list: ["נועה"] } } }).success).toBe(false);
  });
});
