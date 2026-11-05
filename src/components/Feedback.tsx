"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { ApiError, errorIdOf, sendReport, withErrorId, type ReportInput } from "@/lib/client/api";
import { useApp } from "@/lib/client/state";
import { Button, inputClass } from "./ui";

type ReportType = ReportInput["type"];

interface OpenOptions {
  type?: ReportType;
  nameId?: number;
  nameHe?: string;
}

const FeedbackContext = createContext<(options?: OpenOptions) => void>(() => {});

export const useFeedback = () => useContext(FeedbackContext);

const TYPES: { id: ReportType; label: string }[] = [
  { id: "error", label: "דיווח על טעות" },
  { id: "suggestion", label: "הצעה" },
  { id: "other", label: "משוב אחר" },
];

const MAX_LENGTH = 1000;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<OpenOptions | null>(null);
  return (
    <FeedbackContext.Provider value={(o = {}) => setOptions(o)}>
      {children}
      {options && <FeedbackDialog options={options} onClose={() => setOptions(null)} />}
    </FeedbackContext.Provider>
  );
}

function FeedbackDialog({ options, onClose }: { options: OpenOptions; onClose: () => void }) {
  const { state, update } = useApp();
  const openedAt = useRef(Date.now());
  const [type, setType] = useState<ReportType>(options.type ?? "other");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "limited" | "failed">("idle");
  const [failedId, setFailedId] = useState<string | null>(null);

  const submit = async () => {
    setStatus("sending");
    try {
      const { token } = await sendReport(
        { type, message, screen: state.step, nameId: options.nameId, nameHe: options.nameHe, website, elapsedMs: Date.now() - openedAt.current },
        state.token,
      );
      update({ token });
      setStatus("sent");
    } catch (error) {
      setFailedId(errorIdOf(error));
      setStatus(error instanceof ApiError && error.status === 429 ? "limited" : "failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        {status === "sent" ? (
          <div className="py-6 text-center">
            <p className="font-display text-xl font-semibold">תודה! קיבלנו את ההודעה.</p>
            <Button className="mt-6" onClick={onClose}>
              חזרה
            </Button>
          </div>
        ) : (
          <>
            <h2 id="feedback-title" className="font-display text-xl font-semibold">
              שליחת משוב
            </h2>
            {options.nameHe && <p className="mt-1 text-sm text-ink-soft">לגבי השם {options.nameHe}</p>}
            <div className="mt-4 flex flex-wrap gap-2" role="radiogroup">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={type === t.id}
                  onClick={() => setType(t.id)}
                  className={`min-h-11 rounded-full border-2 px-4 text-sm ${type === t.id ? "border-lavender-dark bg-lavender-soft" : "border-line"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              aria-label="ההודעה"
              className={`${inputClass} mt-4 min-h-28 py-2`}
              maxLength={MAX_LENGTH}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="מה תרצו לספר לנו?"
            />
            <input
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-soft">
              {message.length}/{MAX_LENGTH} · ההודעה נשמרת עד שהיא נשלחת לצוות. אנא אל תכללו פרטים אישיים רגישים.
            </p>
            {status === "limited" && <p className="mt-2 text-sm text-rose-dark">שלחתם הרבה הודעות בשעה האחרונה. נסו שוב מאוחר יותר.</p>}
            {status === "failed" && <p className="mt-2 text-sm text-rose-dark">{withErrorId("השליחה לא הצליחה. נסו שוב.", failedId)}</p>}
            <div className="mt-4 flex gap-2">
              <Button onClick={submit} disabled={!message.trim() || status === "sending"}>
                {status === "sending" ? "שולחים..." : "שליחה"}
              </Button>
              <Button variant="secondary" onClick={onClose}>
                ביטול
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
