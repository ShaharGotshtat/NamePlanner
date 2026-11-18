import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { dashboardStats, israelDay, type Spread } from "@/lib/analytics/stats";
import { chipLabel } from "@/lib/engine/chips";
import { dailyBudget } from "@/lib/server/spend";
import { getStore } from "@/lib/server/store";
import type { ChipId } from "@/lib/types";
import { AutoRefresh } from "./AutoRefresh";

export const metadata: Metadata = { title: "לוח נתונים", robots: { index: false, follow: false } };

const RANGES = { "7": "7 ימים", "30": "30 ימים", all: "הכול" } as const;
type Range = keyof typeof RANGES;

const STEP_LABELS: Record<string, string> = {
  welcome: "פתיחה",
  family: "משפחה",
  preferences: "העדפות",
  rounds: "סבבים",
  summary: "סיכום",
};
const SHARE_LABELS = { whatsapp: "וואטסאפ", copy: "העתקה", share: "שיתוף אחר" } as const;

const fmt = (n: number, digits = 0) => n.toLocaleString("he-IL", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const pct = (part: number, whole: number) => (whole ? `${fmt((100 * part) / whole)}%` : "–");
const usd = (n: number) => `$${n.toFixed(2)}`;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await connection();
  const requested = (await searchParams).range;
  const range: Range = requested && requested in RANGES ? (requested as Range) : "30";
  const since = range === "all" ? null : new Date(Date.now() - Number(range) * 24 * 60 * 60 * 1000);

  const store = getStore();
  const [events, spend, budget] = await Promise.all([
    store.listEvents(since),
    store.listSpend(since ? israelDay(since) : null),
    dailyBudget(),
  ]);
  const s = dashboardStats(events, spend, budget);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <AutoRefresh />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">לוח נתונים</h1>
        <nav className="flex gap-1 rounded-2xl bg-white p-1 ring-1 ring-line" aria-label="טווח זמן">
          {(Object.keys(RANGES) as Range[]).map((r) => (
            <Link
              key={r}
              href={`/admin?range=${r}`}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium ${r === range ? "bg-ink text-white" : "text-ink-soft hover:bg-cream"}`}
              aria-current={r === range ? "page" : undefined}
            >
              {RANGES[r]}
            </Link>
          ))}
        </nav>
      </header>
      <p className="mt-1 text-sm text-ink-soft">מתעדכן כל דקה. ימים לפי שעון ישראל.</p>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="כניסות" value={fmt(s.visits)} />
        <Tile label="משתמשים ייחודיים ביום" value={fmt(s.avgDailyUsers, 1)} hint={`ממוצע יומי. סך הכול ${fmt(s.userDays)} משתמש-יום (המזהה מתחלף כל יום).`} />
        <Tile label="חיפושים שהתחילו" value={fmt(s.runs)} hint="הגיעו למסך המשפחה" />
        <Tile label="סיימו את התהליך" value={fmt(s.finishedRuns)} hint={`${pct(s.finishedRuns, s.runs)} מהחיפושים`} />
        <Tile label="שיתפו את התוצאות" value={fmt(s.sharedRuns)} hint={`${pct(s.sharedRuns, s.finishedRuns)} מהמסיימים`} />
        <Tile label="עלות מודלים" value={usd(s.llmUsd)} hint={s.finishedRuns ? `${usd(s.llmUsd / s.finishedRuns)} לחיפוש שהסתיים` : undefined} />
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <SpreadCard title="שמות שסומנו 'מעניין'" spread={s.interesting} />
        <SpreadCard title="שמות שסומנו 'אולי'" spread={s.unsure} />
      </section>
      <p className="mt-2 text-sm text-ink-soft">לכל חיפוש שהסתיים, לפי הסיכום האחרון שלו.</p>

      <Panel title="כניסות ומשתמשים ייחודיים ליום">
        <DayChart days={s.visitsPerDay} />
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        <Panel title="משפך לפי מסך">
          <Bars rows={s.funnel.map((f) => ({ label: STEP_LABELS[f.step] ?? f.step, value: f.runs }))} base={s.funnel[0]?.runs} />
        </Panel>
        <Panel title="סבבים שהושלמו (חיפוש ראשון)">
          {s.roundFunnel.length ? (
            <Bars rows={s.roundFunnel.map((r) => ({ label: `סבב ${r.round}`, value: r.runs }))} base={s.funnel.find((f) => f.step === "rounds")?.runs} />
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel title="ערוץ שיתוף">
          <Bars rows={(Object.keys(SHARE_LABELS) as (keyof typeof SHARE_LABELS)[]).map((c) => ({ label: SHARE_LABELS[c], value: s.shareChannels[c] }))} />
        </Panel>
        <Panel title="העדפות נפוצות">
          {s.topChips.length ? (
            <Bars rows={s.topChips.map((c) => ({ label: chipLabel(c.chip as ChipId), value: c.runs }))} />
          ) : (
            <Empty />
          )}
          <p className="mt-3 text-sm text-ink-soft">טקסט חופשי: {fmt(s.freeTextRuns)} חיפושים</p>
        </Panel>
      </div>

      <Panel title="עוד">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="חיפוש נוסף אחרי סיכום" value={`${fmt(s.goAgainRuns)} (${pct(s.goAgainRuns, s.finishedRuns)})`} />
          <Row label="זמן חציוני עד סיום" value={s.medianMinutesToFinish === null ? "–" : `${fmt(s.medianMinutesToFinish, 1)} דק'`} />
          <Row label="'הבחירה שלנו' התקבלה / נדחתה" value={`${fmt(s.ourPickAccepted)} / ${fmt(s.ourPickDismissed)}`} />
          <Row label="ימים שבהם נגמר התקציב היומי" value={`${fmt(s.budgetDaysHit)} (תקציב ${usd(budget)})`} />
          <Row label="סבבים בלי מודל (גיבוי)" value={`${fmt(s.roundsFallback)} מתוך ${fmt(s.roundsLlm + s.roundsFallback)}`} />
        </dl>
      </Panel>
    </main>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

function SpreadCard({ title, spread }: { title: string; spread: Spread | null }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
      <p className="font-medium">{title}</p>
      {spread ? (
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          {[
            ["ממוצע", spread.mean],
            ["חציון", spread.median],
            ["סטיית תקן", spread.stdDev],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-xs text-ink-soft">{label}</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums">{fmt(value as number, 1)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <Empty />
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-line">
      <h2 className="mb-3 font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-1">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

const Empty = () => <p className="text-sm text-ink-soft">אין נתונים עדיין.</p>;

/** Horizontal bars, one series. With a base, each row also shows its share of it. */
function Bars({ rows, base }: { rows: { label: string; value: number }[]; base?: number }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-sm" title={`${r.label}: ${fmt(r.value)}`}>
          <span className="truncate">{r.label}</span>
          <span className="h-3 rounded-full bg-cream">
            <span className="block h-3 rounded-full bg-rose-dark" style={{ width: `${(100 * r.value) / max}%` }} />
          </span>
          <span className="tabular-nums text-ink-soft">
            {fmt(r.value)}
            {base ? ` · ${pct(r.value, base)}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Visits per day as vertical bars; hovering a bar shows the day's numbers. */
function DayChart({ days }: { days: { date: string; visits: number; users: number }[] }) {
  if (!days.length) return <Empty />;
  const max = Math.max(1, ...days.map((d) => d.visits));
  return (
    <div>
      <div className="flex h-36 items-end gap-0.5" dir="ltr">
        {days.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end" title={`${d.date}: ${d.visits} כניסות, ${d.users} משתמשים ייחודיים`}>
            <div className="relative w-full rounded-t bg-rose group-hover:brightness-95" style={{ height: `${Math.max(2, (100 * d.visits) / max)}%` }}>
              <div className="absolute inset-x-0 bottom-0 rounded-t bg-rose-dark" style={{ height: `${d.visits ? (100 * d.users) / d.visits : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-rose-dark" /> משתמשים ייחודיים
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-rose" /> כניסות
        </span>
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink-soft" dir="ltr">
        <span>{days[0].date}</span>
        <span>מקסימום {fmt(max)}</span>
        <span>{days.at(-1)!.date}</span>
      </div>
    </div>
  );
}
