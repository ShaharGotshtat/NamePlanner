"use client";

import { useEffect, useId, useRef, useState } from "react";
import { chartGeometry, HIDDEN_BELOW, historyLine, nameHistory, type SexShare } from "@/lib/names/history";
import type { NameEntry } from "@/lib/types";
import { Mascot } from "../Mascot";

const RECENT_YEARS = 10;
const CHART_W = 326;
const CHART_H = 124;

type Range = "all" | "recent";

const fmt = (n: number) => n.toLocaleString("he-IL");

/** A bottom sheet with a name's yearly counts, its peak and the boys/girls split. */
export function PopularitySheet({ entry, onClose }: { entry: NameEntry; onClose: () => void }) {
  const [range, setRange] = useState<Range>("all");
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("button")?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        <PopularityDetails entry={entry} range={range} setRange={setRange} titleId={titleId} onClose={onClose} />
      </div>
    </div>
  );
}

interface DetailsProps {
  entry: NameEntry;
  range: Range;
  setRange: (r: Range) => void;
  titleId: string;
  onClose: () => void;
}

/** The sheet's content, kept apart so it renders without the browser. */
export function PopularityDetails({ entry, range, setRange, titleId, onClose }: DetailsProps) {
  const h = nameHistory(entry);
  const stats = range === "all" ? entry.stats : entry.stats.slice(-RECENT_YEARS);
  const chart = chartGeometry(stats, CHART_W, CHART_H);
  const firstYear = entry.stats[0].year;
  const chartLabel = `מספר התינוקות בשם ${entry.nameHe} בכל שנה מ-${stats[0].year} עד ${h.latest.year}. השיא: ${fmt(chart.peak.stat.count)} ב-${chart.peak.stat.year}.`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id={titleId} className="font-display text-2xl font-semibold">
            {entry.niqqud} במספרים
          </h2>
          <p className="text-xs text-ink-soft">
            לפי הלמ״ס · תינוקות יהודים · {firstYear}–{h.latest.year}
          </p>
        </div>
        <button aria-label="סגירה" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cream hover:bg-line" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </svg>
        </button>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Tile value={h.counted ? fmt(h.latest.count) : `פחות מ-${HIDDEN_BELOW}`} label={`תינוקות ב-${h.latest.year}`} />
        <Tile value={h.counted ? String(h.latest.rank) : "—"} label={h.counted ? "מקום ברשימה" : "לא ברשימה"} />
        <Tile value={String(h.peak.year)} label="שנת השיא" accent />
      </dl>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold">לאורך השנים</h3>
          <div role="radiogroup" aria-label="טווח שנים" className="flex gap-0.5 rounded-full bg-cream p-[3px]">
            {(
              [
                ["all", `מאז ${firstYear}`],
                ["recent", `${RECENT_YEARS} שנים`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="radio"
                aria-checked={range === id}
                onClick={() => setRange(id)}
                className={`min-h-9 rounded-full px-3 text-xs font-medium ${range === id ? "bg-lavender-dark text-white" : "text-ink-soft"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <svg style={{ direction: "ltr" }} viewBox={`-34 -20 ${CHART_W + 40} ${CHART_H + 40}`} className="w-full" role="img" aria-label={chartLabel}>
          <g stroke="var(--color-line)" strokeWidth="1">
            {chart.ticks.map((t) => (
              <line key={t.value} x1="0" x2={CHART_W} y1={t.y} y2={t.y} strokeDasharray={t.value ? "3 3" : undefined} />
            ))}
          </g>
          <g fontSize="10" fill="var(--color-ink-soft)" textAnchor="end">
            {chart.ticks.map((t) => (
              <text key={t.value} x="-6" y={t.y + 3}>
                {fmt(t.value)}
              </text>
            ))}
          </g>
          <path d={chart.area} fill="var(--color-lavender-soft)" />
          <path d={chart.line} fill="none" stroke="var(--color-lavender-dark)" strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx={chart.peak.x} cy={chart.peak.y} r="4" fill="var(--color-rose-dark)" />
          <text
            x={chart.peak.x > CHART_W / 2 ? chart.peak.x - 7 : chart.peak.x + 7}
            y={Math.max(Math.round(chart.peak.y - 7), -8)}
            direction="rtl"
            fontSize="11"
            fontWeight="600"
            fill="var(--color-rose-dark)"
            textAnchor={chart.peak.x > CHART_W / 2 ? "start" : "end"}
          >
            {fmt(chart.peak.stat.count)} ב-{chart.peak.stat.year}
          </text>
          <circle cx={chart.last.x} cy={chart.last.y} r="4" fill="var(--color-lavender-dark)" />
          <g fontSize="10" fill="var(--color-ink-soft)" textAnchor="middle">
            {chart.years.map((y) => (
              <text key={y.year} x={Math.min(Math.max(y.x, 12), CHART_W - 12)} y={CHART_H + 16}>
                {y.year}
              </text>
            ))}
          </g>
        </svg>
        {!h.counted && <p className="text-xs text-ink-soft">הלמ״ס לא מפרסמת שנים שבהן פחות מ-{HIDDEN_BELOW} תינוקות קיבלו את השם, והן מופיעות כאפס.</p>}
      </section>

      {h.allTimeShare && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[15px] font-semibold">בנים או בנות?</h3>
          <div className="grid grid-cols-[4rem_1fr] items-center gap-x-2.5 gap-y-1.5 text-xs">
            {h.counted && h.latestShare && <ShareRow label={`ב-${h.latest.year}`} share={h.latestShare} />}
            <ShareRow label={`מאז ${firstYear}`} share={h.allTimeShare} />
          </div>
        </section>
      )}

      <div className="flex items-center gap-2 rounded-2xl bg-cream px-3 py-2">
        <Mascot mood="happy" size={36} />
        <p className="text-sm">{historyLine(entry, h)}</p>
      </div>
    </div>
  );
}

function Tile({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col-reverse rounded-2xl bg-cream p-2.5">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className={`font-display text-xl font-semibold ${accent ? "text-rose-dark" : ""}`}>{value}</dd>
    </div>
  );
}

function ShareRow({ label, share }: { label: string; share: SexShare }) {
  return (
    <>
      <span className="text-ink-soft">{label}</span>
      <div className="flex flex-col gap-0.5">
        <div role="img" aria-label={`${label}: ${share.boysPct}% בנים, ${share.girlsPct}% בנות`} className="flex h-3 overflow-hidden rounded-full bg-line">
          <span className="bg-lavender" style={{ width: `${share.boysPct}%` }} />
          <span className="bg-rose" style={{ width: `${share.girlsPct}%` }} />
        </div>
        <div className="flex justify-between text-ink-soft" aria-hidden>
          <span>בנים {share.boysPct}%</span>
          <span>בנות {share.girlsPct}%</span>
        </div>
      </div>
    </>
  );
}
