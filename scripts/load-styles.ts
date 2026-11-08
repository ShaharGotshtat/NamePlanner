import { readFileSync } from "node:fs";
import postgres from "postgres";
import { readStyles } from "./styles";

/**
 * Writes the style scores from data/name-style.tsv into the names already in the database,
 * matched by Hebrew name. Nothing else in the table changes, and rows are not deleted or added.
 */
const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL to the database connection string first.");

const styles = readStyles();
if (!styles.size) throw new Error("data/name-style.tsv has no scores.");

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
await sql.unsafe(readFileSync("db/schema.sql", "utf8"));

const updated = await sql.begin(async (tx) => {
  const rows = [...styles].map(([name, axes]) => ({ name, axes: JSON.stringify(axes) }));
  let count = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const result = await tx`
      update names set style_axes = v.axes::jsonb
      from (values ${tx(batch.map((r) => [r.name, r.axes]))}) as v (name, axes)
      where names.name_he = v.name`;
    count += result.count;
  }
  return count;
});

const [{ missing }] = await sql<{ missing: number }[]>`select count(*)::int as missing from names where style_axes is null`;
console.log(`Updated style scores for ${updated} of ${styles.size} scored names. Names in the database without scores: ${missing}.`);
await sql.end();
