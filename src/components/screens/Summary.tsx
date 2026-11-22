"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/client/analytics";
import { fetchOurPick } from "@/lib/client/api";
import { displayMeaning } from "@/lib/names/catalog";
import { roundRequest, shownSuggestions, unseenNames, useApp } from "@/lib/client/state";
import type { Suggestion } from "@/lib/types";
import { ThinkingMascotSays } from "../Mascot";
import { TagInput } from "../TagInput";
import { Button, Card, ScreenTitle } from "../ui";
import { ExportList } from "./ExportList";

export function Summary() {
  const { state, update } = useApp();
  const shown = shownSuggestions(state);
  const verdictOf = (s: Suggestion) => state.ratings[s.name.id]?.verdict;

  const interesting = shown.filter((s) => verdictOf(s) === "interesting");
  const unsure = shown.filter((s) => verdictOf(s) === "unsure");
  const favorite = interesting.find((s) => s.name.id === state.favoriteId) ?? (interesting.length === 1 ? interesting[0] : null);
  const unseen = unseenNames(state);

  const goAgain = () => {
    trackEvent({ name: "go_again", props: { pass: state.pass } });
    update((s) => ({ pass: s.pass + 1, step: "preferences", favoriteId: null }));
  };

  return (
    <div>
      {interesting.length > 0 ? (
        <>
          <ScreenTitle mood={favorite ? "cheer" : "happy"} subtitle="איזה הכי? אפשר לשנות בכל רגע.">
            {interesting.length === 1 ? "שם אחד שאהבתם" : `${interesting.length} שמות שאהבתם`}
          </ScreenTitle>
          <FavoritePicker
            names={interesting}
            favorite={favorite}
            surname={state.surname.trim()}
            onPick={(id) => update({ favoriteId: id })}
          />
          <div className="mt-4 space-y-1.5 text-sm">
            <MaybeNames unsure={unsure} />
            <UnseenNames unseen={unseen} />
          </div>
          <ExportList names={interesting} favorite={favorite} unsure={unsure} />
          <button className="mx-auto mt-2 block min-h-11 text-sm underline" onClick={goAgain}>
            עוד סבב של שמות חדשים
          </button>
        </>
      ) : (
        <>
          <NoMatch unsure={unsure} unseen={unseen} />
          <Button variant="secondary" className="mt-8 w-full" onClick={goAgain}>
            עוד סבב של שמות חדשים
          </Button>
        </>
      )}
    </div>
  );
}

/** The favourite is a choice on the list itself, so it can be changed at any time. */
function FavoritePicker({
  names,
  favorite,
  surname,
  onPick,
}: {
  names: Suggestion[];
  favorite: Suggestion | null;
  surname: string;
  onPick: (id: number) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">הבחירה הראשונה</legend>
      {names.map((s) => {
        const on = s === favorite;
        return (
          <label
            key={s.name.id}
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 bg-white px-4 py-2.5 ${on ? "border-rose-dark" : "border-line hover:border-rose"}`}
          >
            <input type="radio" name="favorite" checked={on} onChange={() => onPick(s.name.id)} className="size-5 shrink-0 accent-rose-dark" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-display text-2xl leading-tight font-semibold">{s.name.niqqud}</span>
              {displayMeaning(s.name) && <span className="text-sm text-ink-soft">{displayMeaning(s.name)}</span>}
              {on && surname && <span className="text-sm font-medium text-rose-deep">{`${s.name.niqqud} ${surname}`}</span>}
            </span>
            {on && <span className="shrink-0 rounded-full bg-rose-dark px-2.5 py-1 text-xs font-medium text-white">הבחירה הראשונה</span>}
          </label>
        );
      })}
    </fieldset>
  );
}

function MaybeNames({ unsure }: { unsure: Suggestion[] }) {
  if (unsure.length === 0) return null;
  return (
    <p>
      <b className="font-semibold">אולי:</b> {unsure.map((s) => s.name.nameHe).join(", ")}
    </p>
  );
}

/** Names of a round left early from "לסיכום". Showing them reopens the round where it stopped. */
function UnseenNames({ unseen }: { unseen: ReturnType<typeof unseenNames> }) {
  const { update } = useApp();
  if (!unseen) return null;
  const count = unseen.names.length === 1 ? "שם אחד" : `${unseen.names.length} שמות`;
  return (
    <p>
      <b className="font-semibold">עוד לא ראיתם:</b> {count} מסבב {unseen.round} ·{" "}
      <button className="min-h-9 text-lavender-dark underline" onClick={() => update({ step: "rounds" })}>
        להציג
      </button>
    </p>
  );
}

function NoMatch({ unsure, unseen }: { unsure: Suggestion[]; unseen: ReturnType<typeof unseenNames> }) {
  const { state, update } = useApp();
  const [loading, setLoading] = useState(false);
  const requested = useRef(false);
  const pick = state.ourPick?.pass === state.pass ? state.ourPick : null;

  useEffect(() => {
    if (pick || requested.current) return;
    requested.current = true;
    setLoading(true);
    fetchOurPick(roundRequest(state), state.token)
      .then(({ suggestion, token }) => update({ token, ourPick: { pass: state.pass, suggestion, dismissed: false } }))
      .catch(() => update({ ourPick: { pass: state.pass, suggestion: null, dismissed: false } }))
      .finally(() => setLoading(false));
  }, [pick, state, update]);

  const markInteresting = (s: Suggestion) => {
    trackEvent({ name: "our_pick", props: { action: "accepted" } });
    update((st) => ({ ratings: { ...st.ratings, [s.name.id]: { nameId: s.name.id, verdict: "interesting" } }, favoriteId: s.name.id }));
  };

  return (
    <>
      <ScreenTitle mood="hopeful">עוד לא מצאנו את השם המושלם, אפשר להמשיך לחפש!</ScreenTitle>
      <div className="space-y-1.5 text-sm">
        <MaybeNames unsure={unsure} />
        <UnseenNames unseen={unseen} />
      </div>

      <div className="mt-6">
        <p className="mb-2 font-medium">שמות אהובים, גם אם הם תפוסים</p>
        <TagInput
          label="שם אהוב"
          values={state.namesWeLike}
          onChange={(namesWeLike) => update({ namesWeLike })}
          placeholder="למשל: שם של ילד של חברים"
        />
        <p className="mt-1 text-xs text-ink-soft">בסבב הבא נחפש שמות בסגנון שלהם.</p>
      </div>

      {loading && <ThinkingMascotSays className="mt-6">עוד רגע נבחר שם...</ThinkingMascotSays>}
      {pick?.suggestion && !pick.dismissed && (
        <Card className="mt-6">
          <p className="text-xs font-medium text-lavender-dark">הבחירה שלנו, מתוך השמות שלא סומנו</p>
          <h2 className="mt-1 font-display text-3xl font-semibold">{pick.suggestion.name.niqqud}</h2>
          <p className="mt-2 text-sm">{pick.suggestion.reason}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => markInteresting(pick.suggestion!)}>מעניין</Button>
            <Button variant="secondary" onClick={() => {
              trackEvent({ name: "our_pick", props: { action: "dismissed" } });
              update({ ourPick: { ...pick, dismissed: true } });
            }}>
              לא תודה
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
