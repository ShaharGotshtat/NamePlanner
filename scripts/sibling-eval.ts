import { readFileSync } from "node:fs";
import type { NameEntry } from "../src/lib/types";
import { DEFAULT_SETS_PATH, evaluateSiblingSets, parseSiblingSets } from "./sibling-sets";

// npm run siblings:eval [-- path/to/sets.tsv]
const path = process.argv[2] ?? DEFAULT_SETS_PATH;
const names: NameEntry[] = JSON.parse(readFileSync("data/names.json", "utf8"));
const report = evaluateSiblingSets(parseSiblingSets(readFileSync(path, "utf8")), names);

console.log(`Sets: ${report.sets}, names given: ${report.mentions}, not in the list: ${report.missing.length}`);
if (report.missing.length) console.log(`  ${report.missing.join(", ")}`);
console.log(`Distinct sibling pairs: ${report.pairs}, seen in more than one set: ${report.repeatedPairs.length}`);
for (const [pair, n] of report.repeatedPairs) console.log(`  ${pair}: ${n}`);
console.log(
  `Held-out sibling percentile: ${(report.heldOutPercentile * 100).toFixed(1)}% over ${report.heldOutCount} names (50% = chance)`,
);
