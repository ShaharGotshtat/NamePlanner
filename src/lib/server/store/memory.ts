import sample from "../../../../data/names.sample.json";
import type { NameEntry } from "@/lib/types";
import type { Report, Store } from "./types";

/** Local development store: the sample names and counters that reset on restart. */
export function memoryStore(): Store {
  const spend = new Map<string, number>();
  const alerts = new Set<string>();
  let reports: Report[] = [];

  return {
    loadNames: async () => sample as NameEntry[],
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
    takeReports: async () => {
      const taken = reports;
      reports = [];
      return taken;
    },
  };
}
