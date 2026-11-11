import { readFileSync, writeFileSync } from "node:fs";
import type { NameEntry } from "../src/lib/types";
import { nameSex } from "../src/lib/names/catalog";
import { RUBRIC } from "./styles";

/**
 * A fixed 50-name sample of the style scores in data/names.json (run npm run data:build first) for a person to check before the scores are used:
 * 30 names spread over the 300 most common, which most people can judge, and 20 spread over the rest.
 *
 *   npm run styles:sample -- out.md        the first sample
 *   npm run styles:sample -- out.md 2      a second sample with other names, after the scores were redone
 */
const out = process.argv[2] ?? "style-sample.md";
const round = Math.max(1, Number(process.argv[3] ?? 1));
/** Shifts where each pick falls, so another round checks names nobody has seen yet. */
const offset = ((round - 1) * 0.5) % 1;
const names: NameEntry[] = JSON.parse(readFileSync("data/names.json", "utf8"));

const spread = (list: NameEntry[], count: number) =>
  Array.from({ length: count }, (_, i) => list[Math.floor(((i + offset) * list.length) / count)]);
const scored = names.filter((n) => n.styleAxes);
const sample = [...spread(scored.slice(0, 300), 30), ...spread(scored.slice(300), 20)];

const SEX = { boy: "בן", girl: "בת", unisex: "יוניסקס" } as const;
const rows = sample.map((n, i) => {
  const s = n.styleAxes!;
  const latest = n.stats.at(-1)!;
  return `| ${i + 1} | ${n.nameHe} | ${n.translit[0]} | ${SEX[nameSex(n)]} | ${latest.rank === 9999 ? "-" : latest.rank} | ${s.reach} | ${s.religious} | ${s.era} | |`;
});

writeFileSync(
  out,
  `# Style scores: 50-name check${round > 1 ? ` (round ${round})` : ""}

Mark each row OK, or write the axis and the value you would give (for example "era 2").
If more than 5 names need a change, the rubric gets fixed and every name is scored again.

Era is computed from CBS data (the average birth year of babies given the name), so it is shown for context only.

## Rubric

${RUBRIC}

## Sample

| # | Name | Latin | Sex | Rank ${names[0].stats.at(-1)!.year} | reach (1 מקומי, 5 בינלאומי) | religious (1 חרדי, 5 חילוני) | era (מנתוני CBS, לא לבדיקה) | Your check |
|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}
`,
);
console.log(`Wrote ${sample.length} names to ${out}`);
