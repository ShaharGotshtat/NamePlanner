"use client";

import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { useEffect, useRef } from "react";
import { backPatch } from "@/lib/client/navigation";
import { AppProvider, useApp, type Step } from "@/lib/client/state";
import { FeedbackProvider, useFeedback } from "./Feedback";
import { Family } from "./screens/Family";
import { Preferences } from "./screens/Preferences";
import { Rounds } from "./screens/Rounds";
import { Summary } from "./screens/Summary";
import { Welcome } from "./screens/Welcome";

const SCREENS: Record<Step, () => React.JSX.Element> = {
  welcome: Welcome,
  family: Family,
  preferences: Preferences,
  rounds: Rounds,
  summary: Summary,
};

export function App() {
  return (
    <AppProvider>
      <FeedbackProvider>
        <Shell />
      </FeedbackProvider>
    </AppProvider>
  );
}

function Shell() {
  const { state, update, startOver } = useApp();
  const openFeedback = useFeedback();
  const Screen = SCREENS[state.step];
  const canGoBack = backPatch(state) !== null;

  // Each screen change gets a browser history entry, so the phone's back gesture moves back
  // through the flow instead of leaving the app.
  const fromHistory = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    // depth counts this app's own entries, so the back button never pops a page from another site.
    const depth: number | undefined = history.state?.nameplannerDepth;
    if (depth === undefined) history.replaceState({ nameplannerDepth: 0 }, "");
    else history.pushState({ nameplannerDepth: depth + 1 }, "");
  }, [state.step]);

  useEffect(() => {
    const onPop = () => {
      const patch = backPatch(stateRef.current);
      if (!patch) return;
      fromHistory.current = true;
      update(patch);
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, [update]);

  const goBack = () => {
    if (history.state?.nameplannerDepth > 0) history.back();
    else {
      const patch = backPatch(state);
      if (patch) update(patch);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      {/* The welcome screen shows the name as its own title, so it has no header. */}
      {state.step !== "welcome" && (
        <header className="flex items-center justify-between py-4">
          <span dir="ltr" className="font-display text-xl font-semibold">
            {APP_NAME}
            <span className="text-coral">.</span>
          </span>
          <button
            className="min-h-11 text-sm text-ink-soft hover:underline"
            onClick={() => confirm("להתחיל מחדש? כל מה שהזנתם יימחק מהמכשיר.") && startOver()}
          >
            התחלה מחדש
          </button>
        </header>
      )}
      {canGoBack && (
        <button className="-ms-2 mb-2 flex min-h-11 items-center gap-1 self-start rounded-xl px-2 text-sm font-medium text-ink-soft hover:bg-white" onClick={goBack}>
          <span aria-hidden>→</span> חזרה
        </button>
      )}
      <main className="flex-1 pb-8">
        <Screen />
      </main>
      <footer className="flex justify-center gap-4 border-t border-line py-4 text-sm text-ink-soft">
        <Link href="/terms" className="min-h-11 content-center hover:underline">
          תנאי שימוש
        </Link>
        <button className="min-h-11 hover:underline" onClick={() => openFeedback()}>
          שליחת משוב
        </button>
      </footer>
    </div>
  );
}
