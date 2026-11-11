"use client";

import { useEffect, useRef, useState } from "react";
import { canRestart } from "@/lib/client/options";
import { useApp } from "@/lib/client/state";
import { Mascot } from "./Mascot";
import { Button } from "./ui";

type View = "menu" | "delete";

/** The header's "options" button. It opens a sheet that holds restarting and deleting all data. */
export function OptionsButton({ className = "" }: { className?: string }) {
  const [view, setView] = useState<View | null>(null);
  const button = useRef<HTMLButtonElement>(null);

  const close = () => {
    setView(null);
    button.current?.focus();
  };

  return (
    <>
      <button
        ref={button}
        aria-haspopup="dialog"
        aria-expanded={view !== null}
        className={`flex min-h-11 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-medium ring-1 ring-line hover:ring-lavender-dark/50 ${className}`}
        onClick={() => setView("menu")}
      >
        <DotsIcon />
        אפשרויות
      </button>
      {view && <OptionsSheet view={view} setView={setView} onClose={close} />}
    </>
  );
}

function OptionsSheet({ view, setView, onClose }: { view: View; setView: (v: View) => void; onClose: () => void }) {
  const { state, startOver, deleteAll } = useApp();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("button")?.focus();
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  const titleId = `options-${view}-title`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        {view === "menu" && (
          <>
            <h2 id={titleId} className="font-display text-xl font-semibold">
              מה עכשיו?
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              {canRestart(state) && (
                <>
                  <MenuRow
                    tone="safe"
                    icon={<RestartIcon />}
                    title="התחלה מחדש"
                    hint="ההצבעות מתאפסות. הפרטים וההעדפות נשמרים."
                    onClick={() => {
                      startOver();
                      onClose();
                    }}
                  />
                  <hr className="border-line" />
                </>
              )}
              <MenuRow
                tone="danger"
                icon={<TrashIcon />}
                title="מחיקת כל הנתונים"
                hint="הכול נמחק מהמכשיר. אי אפשר לשחזר."
                onClick={() => setView("delete")}
              />
            </div>
            <button className="mt-3 min-h-11 w-full text-sm font-medium text-ink-soft hover:underline" onClick={onClose}>
              סגירה
            </button>
          </>
        )}

        {view === "delete" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot mood="sad" size={64} className="animate-mascot-pop" />
            <h2 id={titleId} className="font-display text-xl font-semibold">
              למחוק את כל הנתונים?
            </h2>
            <p className="w-full rounded-xl bg-cream px-3 py-2 text-start text-sm">
              <span className="block text-xs font-semibold text-rose-deep">יימחק מהמכשיר הזה</span>
              פרטי המשפחה, ההעדפות, כל ההצבעות והשמות האהובים.
            </p>
            <p className="text-sm font-medium text-rose-deep">אי אפשר לשחזר אחרי המחיקה.</p>
            <div className="mt-1 flex w-full flex-col gap-2">
              <button
                className="min-h-11 w-full rounded-2xl bg-rose-deep px-5 font-medium text-white transition-colors hover:bg-ink"
                onClick={() => {
                  deleteAll();
                  onClose();
                }}
              >
                כן, למחוק הכול
              </button>
              <Button variant="secondary" className="w-full" onClick={onClose}>
                השארת הנתונים
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuRow({
  tone,
  icon,
  title,
  hint,
  onClick,
}: {
  tone: "safe" | "danger";
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  const safe = tone === "safe";
  return (
    <button
      className={`flex min-h-15 items-start gap-3 rounded-2xl p-3 text-start ${safe ? "bg-lavender-soft hover:ring-2 hover:ring-lavender-dark/30" : "hover:bg-rose/15"}`}
      onClick={onClick}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${safe ? "bg-white text-lavender-dark" : "bg-rose/25 text-rose-deep"}`}>
        {icon}
      </span>
      <span>
        <span className={`block font-semibold ${safe ? "" : "text-rose-deep"}`}>{title}</span>
        <span className="block text-sm text-ink-soft">{hint}</span>
      </span>
    </button>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const DotsIcon = () => (
  <svg {...iconProps} className="size-4">
    <circle cx="5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="19" cy="12" r="1.2" />
  </svg>
);

const RestartIcon = () => (
  <svg {...iconProps} className="size-[18px]">
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4.5h4.5" />
  </svg>
);

const TrashIcon = () => (
  <svg {...iconProps} className="size-[18px]">
    <path d="M4 7h16" />
    <path d="M9 7V4.5h6V7" />
    <path d="M6.5 7l1 12.5h9l1-12.5" />
  </svg>
);
