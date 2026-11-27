"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/client/analytics";
import { APP_NAME } from "@/lib/constants";
import { displayMeaning } from "@/lib/names/catalog";
import type { Suggestion } from "@/lib/types";
import { Button } from "../ui";

/** The first choice leads, then the liked names, then the "Not sure" names, which are part of the list too. */
export function buildMessage(liked: Suggestion[], maybe: Suggestion[], favorite: Suggestion | null, origin: string): string {
  const line = (s: Suggestion) => {
    const meaning = displayMeaning(s.name);
    return meaning ? `${s.name.nameHe} (${meaning})` : s.name.nameHe;
  };
  const bullets = (list: Suggestion[]) => list.filter((s) => s !== favorite).map((s) => `• ${line(s)}`);
  const likedLines = bullets(liked);
  const maybeLines = bullets(maybe);
  const parts: string[] = favorite ? [`הבחירה הראשונה שלנו: ${line(favorite)}`] : [];
  if (likedLines.length) parts.push(favorite ? "עוד שמות שאהבנו:" : "השמות שאהבנו:", ...likedLines);
  if (maybeLines.length) {
    if (parts.length) parts.push("");
    parts.push(liked.length ? "ואולי גם:" : "שמות שאנחנו שוקלים:", ...maybeLines);
  }
  return [...parts, "", `מצאנו אותם ב-${APP_NAME}: ${origin}`].join("\n");
}

export function ExportList({ liked, maybe, favorite }: { liked: Suggestion[]; maybe: Suggestion[]; favorite: Suggestion | null }) {
  const message = () => buildMessage(liked, maybe, favorite, location.origin);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);

  const share = async () => {
    try {
      await navigator.share({ text: message() });
      trackEvent({ name: "share", props: { channel: "share" } });
    } catch {
      // Cancelled or blocked: the other options are right there.
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(message());
    setCopied(true);
    trackEvent({ name: "share", props: { channel: "copy" } });
  };

  return (
    <div className="mt-6">
      <p className="mb-2 font-medium">ייצוא הרשימה</p>
      <div className="flex gap-2">
        <a
          className="flex min-h-13 flex-2 items-center justify-center gap-2 rounded-2xl bg-whatsapp font-medium text-white hover:brightness-95"
          href={`https://wa.me/?text=${encodeURIComponent(message())}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackEvent({ name: "share", props: { channel: "whatsapp" } })}
        >
          שליחה בוואטסאפ
        </a>
        <Button variant="secondary" className="min-h-13 flex-1" onClick={copy}>
          {copied ? "הועתק!" : "העתקה"}
        </Button>
      </div>
      {canShare && (
        <button className="mx-auto mt-1 block min-h-11 text-sm text-ink-soft underline" onClick={share}>
          שיתוף אחר
        </button>
      )}
    </div>
  );
}
