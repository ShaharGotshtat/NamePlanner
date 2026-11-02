"use client";

import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
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
  const { state, startOver } = useApp();
  const openFeedback = useFeedback();
  const Screen = SCREENS[state.step];

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      <header className="flex items-center justify-between py-4">
        <span className="font-display text-xl font-semibold">
          {APP_NAME}
          <span className="text-coral">.</span>
        </span>
        {state.step !== "welcome" && (
          <button
            className="min-h-11 text-sm text-ink-soft hover:underline"
            onClick={() => confirm("להתחיל מחדש? כל מה שהזנתם יימחק מהמכשיר.") && startOver()}
          >
            התחלה מחדש
          </button>
        )}
      </header>
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
