import { readFileSync, writeFileSync } from "node:fs";
import type { NameEntry } from "../src/lib/types";
import { nameSex } from "../src/lib/names/catalog";
import { RUBRIC, readStyles } from "./styles";

/**
 * A fixed 50-name sample of the style scores for a person to check before the scores are used:
 * 30 names spread over the 300 most common, which most people can judge, and 20 spread over the rest.
 *
 *   npm run styles:sample -- out.md
 */
const out = process.argv[2] ?? "style-sample.md";
const names: NameEntry[] = JSON.parse(readFileSync("data/names.json", "utf8"));
const styles = readStyles();

const spread = (list: NameEntry[], count: number) =>
  Array.from({ length: count }, (_, i) => list[Math.floor((i * list.length) / count)]);
const scored = names.filter((n) => styles.has(n.nameHe));
const sample = [...spread(scored.slice(0, 300), 30), ...spread(scored.slice(300), 20)];

const SEX = { boy: "בן", girl: "בת", unisex: "יוניסקס" } as const;
const rows = sample.map((n, i) => {
  const s = styles.get(n.nameHe)!;
  const latest = n.stats.at(-1)!;
  return `| ${i + 1} | ${n.nameHe} | ${n.translit[0]} | ${SEX[nameSex(n)]} | ${latest.rank === 9999 ? "-" : latest.rank} | ${s.era} | ${s.reach} | ${s.religious} | |`;
});

writeFileSync(
  out,
  `# Style scores: 50-name check

Mark each row OK, or write the axis and the value you would give (for example "era 2").
If more than 5 names need a change, the rubric gets fixed and every name is scored again.

## Rubric

${RUBRIC}

## Sample

| # | Name | Latin | Sex | Rank ${names[0].stats.at(-1)!.year} | era | reach | religious | Your check |
|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}
`,
);
console.log(`Wrote ${sample.length} names to ${out}`);
