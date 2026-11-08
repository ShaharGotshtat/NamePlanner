import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { NameEntry, StyleAxes } from "../src/lib/types";
import { nameSex } from "../src/lib/names/catalog";
import { AXES, RUBRIC, readStyles, writeStyles } from "./styles";

/**
 * Scores names that have no style scores yet, offline, and adds them to data/name-style.tsv.
 * The model only scores names from data/names.json; it never adds a name.
 *
 *   npm run styles:score                  every name without scores
 *   npm run styles:score -- נועה,תמר      only these names, replacing their scores
 *
 * Needs ANTHROPIC_API_KEY. Check a sample of the new rows before loading them with npm run db:styles.
 */
const MODEL = "claude-sonnet-5-5";
const BATCH = 40;

const names: NameEntry[] = JSON.parse(readFileSync("data/names.json", "utf8"));
const styles = readStyles();
const only = process.argv[2]?.split(",").map((n) => n.trim()).filter(Boolean);
const todo = only ? names.filter((n) => only.includes(n.nameHe)) : names.filter((n) => !styles.has(n.nameHe));
if (only && todo.length !== only.length) {
  const known = new Set(todo.map((n) => n.nameHe));
  throw new Error(`Not in data/names.json: ${only.filter((n) => !known.has(n)).join(", ")}`);
}
if (!todo.length) {
  console.log("Every name already has style scores.");
  process.exit(0);
}

const score = z.number().int().min(1).max(5);
const schema = z.object({
  scores: z.array(z.object({ name: z.string(), era: score, reach: score, religious: score })),
});

/** Average birth year of the babies given the name: a hint for the era axis, not the answer. */
function meanYear(entry: NameEntry): number {
  const total = entry.stats.reduce((s, y) => s + y.count, 0);
  return Math.round(entry.stats.reduce((s, y) => s + y.year * y.count, 0) / Math.max(1, total));
}

const describe = (n: NameEntry) =>
  `${n.nameHe} | ${n.translit[0]} | ${nameSex(n)} | origin: ${n.originHe ?? n.origin} | average birth year in CBS data: ${meanYear(n)}`;

const anthropic = new Anthropic();
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  const response = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    system: `${RUBRIC}\n\nScore every name in the list, exactly as written, once. Do not add, change or skip names.`,
    messages: [{ role: "user", content: batch.map(describe).join("\n") }],
    output_config: { format: zodOutputFormat(schema) },
  });
  const parsed = response.parsed_output;
  if (!parsed) throw new Error(`Batch ${i / BATCH + 1}: the model returned output that did not match the schema.`);

  const asked = new Set(batch.map((n) => n.nameHe));
  for (const row of parsed.scores) {
    if (!asked.has(row.name)) {
      console.warn(`Ignored "${row.name}": not in this batch.`);
      continue;
    }
    styles.set(row.name, Object.fromEntries(AXES.map((axis) => [axis, row[axis]])) as unknown as StyleAxes);
    asked.delete(row.name);
  }
  if (asked.size) console.warn(`Not scored, run again: ${[...asked].join(", ")}`);
  writeStyles(styles, names.map((n) => n.nameHe));
  console.log(`Scored ${Math.min(i + BATCH, todo.length)} of ${todo.length}.`);
}
