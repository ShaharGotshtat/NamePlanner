import postgres from "postgres";
import type { EventName, StoredEvent } from "@/lib/analytics/events";
import type { NameEntry, Origin, StyleAxes, YearStat } from "@/lib/types";
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
  /** Undefined before the column exists. */
  form_of?: string[];
  tags: NameEntry["tags"];
  stats: YearStat[];
  /** Undefined before the column exists, null for a name without scores. */
  style_axes?: StyleAxes | null;
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
  formOf: r.form_of?.length ? r.form_of : undefined,
  tags: r.tags,
  stats: r.stats,
  styleAxes: r.style_axes ?? undefined,
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

    countReports: async () => {
      const [row] = await sql<{ count: number }[]>`select count(*)::int as count from reports`;
      return row.count;
    },

    takeReports: async () => {
      const rows = await sql<{ type: ReportType; message: string; context: ReportContext; created_at: Date }[]>`
        delete from reports returning type, message, context, created_at`;
      return rows
        .map((r): Report => ({ type: r.type, message: r.message, context: r.context, createdAt: r.created_at }))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },

    addEvent: async ({ daily, run, event }) => {
      await sql`
        insert into events (daily, run, name, props)
        values (${daily}, ${run}, ${event.name}, ${sql.json(event.props as postgres.JSONValue)})`;
    },

    listEvents: async (since) => {
      const rows = await sql<{ at: Date; daily: string; run: string; name: EventName; props: Record<string, unknown> }[]>`
        select at, daily, run, name, props from events
        where ${since ? sql`at >= ${since}` : sql`true`}
        order by at`;
      return rows.map((r): StoredEvent => ({ ...r }));
    },

    listSpend: async (sinceDay) => {
      const rows = await sql<{ date: string; usd_spent: string }[]>`
        select to_char(date, 'YYYY-MM-DD') as date, usd_spent from daily_spend
        where ${sinceDay ? sql`date >= ${sinceDay}` : sql`true`}
        order by date`;
      return rows.map((r) => ({ date: r.date, usd: Number(r.usd_spent) }));
    },
  };
}
