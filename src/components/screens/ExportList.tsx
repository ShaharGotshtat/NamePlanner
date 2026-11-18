"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/client/analytics";
import { APP_NAME } from "@/lib/constants";
import { displayMeaning } from "@/lib/names/catalog";
import type { Suggestion } from "@/lib/types";
import { Button } from "../ui";

function buildMessage(names: Suggestion[], favorite: Suggestion | null, unsure: Suggestion[]): string {
  const line = (s: Suggestion) => {
    const meaning = displayMeaning(s.name);
    return meaning ? `${s.name.nameHe} (${meaning})` : s.name.nameHe;
  };
  const others = names.filter((s) => s !== favorite);
  const heading = favorite
    ? [`הבחירה הראשונה שלנו: ${line(favorite)}`, ...(others.length ? ["עוד שמות שאהבנו:"] : [])]
    : ["השמות שאהבנו:"];
  const maybe = unsure.length ? ["", "ואולי גם:", ...unsure.map((s) => `• ${line(s)}`)] : [];
  return [...heading, ...others.map((s) => `• ${line(s)}`), ...maybe, "", `מצאנו אותם ב-${APP_NAME}: ${location.origin}`].join("\n");
}

export function ExportList({ names, favorite, unsure }: { names: Suggestion[]; favorite: Suggestion | null; unsure: Suggestion[] }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);

  const share = async () => {
    try {
      await navigator.share({ text: buildMessage(names, favorite, unsure) });
      trackEvent({ name: "share", props: { channel: "share" } });
    } catch {
      // Cancelled or blocked: the other options are right there.
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(buildMessage(names, favorite, unsure));
    setCopied(true);
    trackEvent({ name: "share", props: { channel: "copy" } });
  };

  return (
    <div className="mt-6">
      <p className="mb-2 font-medium">ייצוא הרשימה</p>
      <a
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-whatsapp font-medium text-white hover:brightness-95"
        href={`https://wa.me/?text=${encodeURIComponent(buildMessage(names, favorite, unsure))}`}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackEvent({ name: "share", props: { channel: "whatsapp" } })}
      >
        שליחה בוואטסאפ
      </a>
      <div className="mt-2 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={copy}>
          {copied ? "הועתק!" : "העתקת הטקסט"}
        </Button>
        {canShare && (
          <Button variant="secondary" className="flex-1" onClick={share}>
            שיתוף אחר
          </Button>
        )}
      </div>
    </div>
  );
}
