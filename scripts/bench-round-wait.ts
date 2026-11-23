import { readFileSync } from "node:fs";
import { Messages } from "@anthropic-ai/sdk/resources/messages";
import { MODEL_CANDIDATES, rankCandidates, roundSizeFor } from "../src/lib/engine/round";
import { parsePreferences, pickWithModel } from "../src/lib/server/ai";
import type { NameEntry, NameNote, ParsedProfile, Rating, RoundRequest, Verdict } from "../src/lib/types";

/**
 * Times the model calls behind the wait between rounds, as the app makes them after notes:
 * read the notes (parse), then pick the next round (pick). Needs ANTHROPIC_API_KEY; runs on the
 * full name list with the in-memory store, so nothing is written to the database.
 * npx tsx --env-file=.env.local scripts/bench-round-wait.ts [runs]
 */
const runs = Number(process.argv[2] ?? 2);
// "disabled" turns thinking off on every call, to compare. Each answer's blocks are logged either way.
const thinking = process.env.BENCH_THINKING;
const create = Messages.prototype.create;
Messages.prototype.create = async function (this: Messages, params: Parameters<typeof create>[0], options?: Parameters<typeof create>[1]) {
  const response = (await create.call(this, thinking ? { ...params, thinking: { type: thinking } } as never : params, options)) as Awaited<ReturnType<Messages["create"]>> & { content: { type: string; text?: string; thinking?: string }[] };
  const blocks = response.content.map((b) => `${b.type}:${(b.text ?? b.thinking ?? "").length} chars`).join(", ");
  console.log(`    blocks: ${blocks}`);
  return response;
} as typeof create;
const names: NameEntry[] = JSON.parse(readFileSync("data/names.json", "utf8"));
const FREE_TEXT = "מעדיפה שם קצר, בלי שמות תנכיים";
const NOTES: [Verdict, string][][] = [
  [["no", "נשמע מומצא"], ["interesting", "אוהבת שזה קצר"]],
  [["no", "נפוץ מדי, יש שלוש כאלה בגן"], ["interesting", "משמעות יפה"]],
];
const VERDICTS: Verdict[] = ["no", "interesting", "unsure", "no"];

async function timed<T>(label: string, run: () => Promise<T>): Promise<T> {
  const started = Date.now();
  const result = await run();
  console.log(`  ${label}: ${Date.now() - started}ms`);
  return result;
}

for (let run = 1; run <= runs; run++) {
  console.log(`Run ${run}`);
  const first = await timed("parse free text", () => parsePreferences({ texts: [FREE_TEXT], namesWeLike: [], family: [] }, names));
  let profile: ParsedProfile | null = first && !first.flagged ? first.profile : null;
  const ratings: Rating[] = [];
  const nameNotes: NameNote[] = [];
  const shownIds: number[] = [];

  for (let round = 1; round <= 3; round++) {
    const req: RoundRequest = { babySex: "girl", dueDerived: null, surname: "", family: [], chips: {}, profile, namesWeLike: [], declined: [], ratings, shownIds };
    const ranked = rankCandidates(names, req);
    const picks = await timed(`pick round ${round} (${profile?.requirements.length ?? 0} requirements)`, () =>
      pickWithModel(ranked.slice(0, MODEL_CANDIDATES), req, names, roundSizeFor(names, req)),
    );
    const ids = [...(picks?.keys() ?? [])];
    shownIds.push(...ids);
    ids.forEach((nameId, i) => ratings.push({ nameId, verdict: VERDICTS[i % VERDICTS.length] }));
    if (round === 3) break;
    NOTES[round - 1].forEach(([verdict, note], i) => ids[i] && nameNotes.push({ nameId: ids[i], verdict: verdict as NameNote["verdict"], note }));
    const result = await timed(`parse notes before round ${round + 1} (${nameNotes.length} notes)`, () =>
      parsePreferences({ texts: [FREE_TEXT], nameNotes, namesWeLike: [], family: [], previous: profile }, names),
    );
    if (result && !result.flagged) profile = result.profile;
  }
}
