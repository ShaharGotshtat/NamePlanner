import type { ShareChannel, StoredEvent } from "./events";

export interface Spread {
  mean: number;
  median: number;
  stdDev: number;
}

export interface SpendDay {
  date: string;
  usd: number;
}

export interface DashboardStats {
  visits: number;
  /** Unique users per day, summed over the range. Ids reset daily, so one person on two days counts twice. */
  userDays: number;
  avgDailyUsers: number;
  /** Rounds the server served with and without the model. */
  roundsLlm: number;
  roundsFallback: number;
  runs: number;
  finishedRuns: number;
  sharedRuns: number;
  shareChannels: Record<ShareChannel, number>;
  /** Over finished runs only, from each run's last summary. */
  interesting: Spread | null;
  unsure: Spread | null;
  /** Runs that reached each step, in flow order. */
  funnel: { step: string; runs: number }[];
  goAgainRuns: number;
  ourPickAccepted: number;
  ourPickDismissed: number;
  medianMinutesToFinish: number | null;
  topChips: { chip: string; runs: number }[];
  freeTextRuns: number;
  visitsPerDay: { date: string; visits: number; users: number }[];
  /** Runs that completed each round of their first pass. */
  roundFunnel: { round: number; runs: number }[];
  llmUsd: number;
  budgetDaysHit: number;
}

export function spread(values: number[]): Spread | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  // Population standard deviation: the dashboard describes the runs it has, not a sample of a larger set.
  const stdDev = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
  return { mean, median, stdDev };
}

const FUNNEL_STEPS = ["welcome", "family", "preferences", "rounds", "summary"] as const;

/** Israel time, so a day on the dashboard matches the budget day. */
export const israelDay = (at: Date) => at.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

export function dashboardStats(events: StoredEvent[], spend: SpendDay[], dailyBudget: number): DashboardStats {
  const runsWith = (match: (e: StoredEvent) => boolean) => new Set(events.filter(match).map((e) => e.run));
  const visitEvents = events.filter((e) => e.name === "visit");

  const lastSummary = new Map<string, StoredEvent>();
  const firstAt = new Map<string, Date>();
  for (const e of [...events].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    if (!firstAt.has(e.run)) firstAt.set(e.run, e.at);
    if (e.name === "finished") lastSummary.set(e.run, e);
  }
  const finished = [...lastSummary.values()];
  const prop = (e: StoredEvent, key: string) => Number(e.props[key] ?? 0);

  const shareChannels: Record<ShareChannel, number> = { whatsapp: 0, copy: 0, share: 0 };
  for (const e of events) if (e.name === "share") shareChannels[e.props.channel as ShareChannel]++;

  // Each run's last preferences submit counts once.
  const lastPrefs = new Map<string, StoredEvent>();
  for (const e of events) if (e.name === "preferences") lastPrefs.set(e.run, e);
  const chipRuns = new Map<string, number>();
  for (const e of lastPrefs.values()) for (const chip of (e.props.chips as string[]) ?? []) chipRuns.set(chip, (chipRuns.get(chip) ?? 0) + 1);

  const minutes = finished.map((e) => (e.at.getTime() - firstAt.get(e.run)!.getTime()) / 60000);

  const perDay = new Map<string, { visits: number; users: Set<string> }>();
  for (const e of visitEvents) {
    const day = israelDay(e.at);
    const entry = perDay.get(day) ?? { visits: 0, users: new Set<string>() };
    entry.visits++;
    entry.users.add(e.daily);
    perDay.set(day, entry);
  }
  const visitsPerDay = [...perDay]
    .map(([date, d]) => ({ date, visits: d.visits, users: d.users.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const userDays = visitsPerDay.reduce((a, d) => a + d.users, 0);
  const served = events.filter((e) => e.name === "round_served");

  const roundRuns = new Map<number, Set<string>>();
  for (const e of events) {
    if (e.name !== "round_done" || prop(e, "pass") !== 1) continue;
    const round = prop(e, "round");
    roundRuns.set(round, (roundRuns.get(round) ?? new Set()).add(e.run));
  }

  return {
    visits: visitEvents.length,
    userDays,
    avgDailyUsers: visitsPerDay.length ? userDays / visitsPerDay.length : 0,
    roundsLlm: served.filter((e) => e.props.llm).length,
    roundsFallback: served.filter((e) => !e.props.llm).length,
    runs: runsWith((e) => e.name === "screen" && e.props.step === "family").size,
    finishedRuns: finished.length,
    sharedRuns: runsWith((e) => e.name === "share").size,
    shareChannels,
    interesting: spread(finished.map((e) => prop(e, "interesting"))),
    unsure: spread(finished.map((e) => prop(e, "unsure"))),
    funnel: FUNNEL_STEPS.map((step) => ({ step, runs: runsWith((e) => e.name === "screen" && e.props.step === step).size })),
    goAgainRuns: runsWith((e) => e.name === "go_again").size,
    ourPickAccepted: events.filter((e) => e.name === "our_pick" && e.props.action === "accepted").length,
    ourPickDismissed: events.filter((e) => e.name === "our_pick" && e.props.action === "dismissed").length,
    medianMinutesToFinish: spread(minutes)?.median ?? null,
    topChips: [...chipRuns].map(([chip, runs]) => ({ chip, runs })).sort((a, b) => b.runs - a.runs).slice(0, 10),
    freeTextRuns: [...lastPrefs.values()].filter((e) => e.props.freeText).length,
    visitsPerDay,
    roundFunnel: [...roundRuns]
      .map(([round, runs]) => ({ round, runs: runs.size }))
      .sort((a, b) => a.round - b.round),
    llmUsd: spend.reduce((a, d) => a + d.usd, 0),
    budgetDaysHit: spend.filter((d) => d.usd >= dailyBudget).length,
  };
}
