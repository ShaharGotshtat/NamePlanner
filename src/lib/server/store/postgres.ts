import postgres from "postgres";
import type { NameEntry, Origin, YearStat } from "@/lib/types";
import type { Report, ReportContext, ReportType, Store } from "./types";

interface NameRow {
  id: number;
  name_he: string;
  niqqud: string;
  translit: string[];
  sex_ratio: number;
  meaning_he: string;
  origin: Origin;
  origin_he: string | null;
  biblical_ref: string | null;
  variants: string[];
  tags: NameEntry["tags"];
  stats: YearStat[];
}

const toEntry = (r: NameRow): NameEntry => ({
  id: r.id,
  nameHe: r.name_he,
  niqqud: r.niqqud,
  translit: r.translit,
  sexRatio: r.sex_ratio,
  meaningHe: r.meaning_he,
  origin: r.origin,
  originHe: r.origin_he ?? undefined,
  biblicalRef: r.biblical_ref,
  variants: r.variants,
  tags: r.tags,
  stats: r.stats,
});

export function postgresStore(url: string): Store {
  const sql = postgres(url, { max: 3, prepare: false });

  return {
    loadNames: async () => (await sql<NameRow[]>`select * from names order by id`).map(toEntry),

    getSetting: async (key) => {
      const [row] = await sql<{ value: string }[]>`select value from app_settings where key = ${key}`;
      return row?.value ?? null;
    },

    getSpend: async (day) => {
      const [row] = await sql<{ usd_spent: string }[]>`select usd_spent from daily_spend where date = ${day}`;
      return row ? Number(row.usd_spent) : 0;
    },

    addSpend: async (day, usd) => {
      const [row] = await sql<{ usd_spent: string }[]>`
        insert into daily_spend (date, usd_spent) values (${day}, ${usd})
        on conflict (date) do update set usd_spent = daily_spend.usd_spent + excluded.usd_spent
        returning usd_spent`;
      return Number(row.usd_spent);
    },

    claimSpendAlert: async (day) => {
      const rows = await sql`
        update daily_spend set alert_sent = true
        where date = ${day} and not alert_sent
        returning date`;
      return rows.length > 0;
    },

    addReport: async (report) => {
      await sql`
        insert into reports (type, message, context, created_at)
        values (${report.type}, ${report.message}, ${sql.json(report.context as unknown as postgres.JSONValue)}, ${report.createdAt})`;
    },

    takeReports: async () => {
      const rows = await sql<{ type: ReportType; message: string; context: ReportContext; created_at: Date }[]>`
        delete from reports returning type, message, context, created_at`;
      return rows
        .map((r): Report => ({ type: r.type, message: r.message, context: r.context, createdAt: r.created_at }))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },
  };
}
