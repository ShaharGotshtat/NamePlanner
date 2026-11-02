"use client";

import { useState } from "react";
import { APP_NAME } from "@/lib/constants";
import type { Suggestion } from "@/lib/types";
import { Button } from "../ui";

function buildMessage(names: Suggestion[], favorite: Suggestion | null): string {
  const line = (s: Suggestion) => `${s.name.nameHe} (${s.name.meaningHe})`;
  const others = names.filter((s) => s !== favorite);
  const heading = favorite
    ? [`הבחירה הראשונה שלנו: ${line(favorite)}`, ...(others.length ? ["עוד שמות שאהבנו:"] : [])]
    : ["השמות שאהבנו:"];
  return [...heading, ...others.map((s) => `• ${line(s)}`), "", `מצאנו אותם ב${APP_NAME}: ${location.origin}`].join("\n");
}

export function ExportList({ names, favorite }: { names: Suggestion[]; favorite: Suggestion | null }) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);

  const share = async () => {
    const text = buildMessage(names, favorite);
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    setFallback(true);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(buildMessage(names, favorite));
    setCopied(true);
  };

  return (
    <div className="mt-6">
      <Button className="w-full" onClick={share}>
        ייצוא הרשימה
      </Button>
      {fallback && (
        <div className="mt-3 flex gap-2">
          <a
            className="flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-teal font-medium text-white"
            href={`https://wa.me/?text=${encodeURIComponent(buildMessage(names, favorite))}`}
            target="_blank"
            rel="noreferrer"
          >
            וואטסאפ
          </a>
          <Button variant="secondary" className="flex-1" onClick={copy}>
            {copied ? "הועתק!" : "העתקה"}
          </Button>
        </div>
      )}
    </div>
  );
}
