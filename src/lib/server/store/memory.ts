import names from "../../../../data/names.sample.json";
import type { NameEntry } from "@/lib/types";
import type { StoredEvent } from "@/lib/analytics/events";
import type { Report, Store } from "./types";

/** Local development store, used only without POSTGRES_URL: a 56-name sample and counters that reset on restart. Production reads names from the database. */
export function memoryStore(): Store {
  const spend = new Map<string, number>();
  const alerts = new Set<string>();
  let reports: Report[] = [];
  const events: StoredEvent[] = [];

  return {
    loadNames: async () => names as NameEntry[],
    getSetting: async () => null,
    getSpend: async (day) => spend.get(day) ?? 0,
    addSpend: async (day, usd) => {
      const total = (spend.get(day) ?? 0) + usd;
      spend.set(day, total);
      return total;
    },
    claimSpendAlert: async (day) => {
      if (alerts.has(day)) return false;
      alerts.add(day);
      return true;
    },
    addReport: async (report) => {
      reports.push(report);
    },
    countReports: async () => reports.length,
    takeReports: async () => {
      const taken = reports;
      reports = [];
      return taken;
    },
    addEvent: async ({ daily, run, event }) => {
      events.push({ at: new Date(), daily, run, name: event.name, props: event.props });
    },
    listEvents: async (since) => events.filter((e) => !since || e.at >= since),
    listSpend: async (sinceDay) =>
      [...spend].filter(([date]) => !sinceDay || date >= sinceDay).map(([date, usd]) => ({ date, usd })),
  };
}
