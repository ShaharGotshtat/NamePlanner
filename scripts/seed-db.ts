import { readFileSync } from "node:fs";
import postgres from "postgres";
import type { NameEntry } from "../src/lib/types";
import { computeFeatures } from "../src/lib/names/features";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL to the database connection string first.");

const names: NameEntry[] = JSON.parse(readFileSync("data/names.json", "utf8"));
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

await sql.unsafe(readFileSync("db/schema.sql", "utf8"));

await sql.begin(async (tx) => {
  // Ids follow the CBS ranking, so a rebuilt list replaces the old one instead of merging with it.
  await tx`truncate names cascade`;
  const rows = names.map((n) => ({
    id: n.id,
    name_he: n.nameHe,
    niqqud: n.niqqud,
    translit: n.translit,
    sex_ratio: n.sexRatio,
    meaning_he: n.meaningHe,
    origin: n.origin,
    origin_he: n.originHe ?? null,
    biblical_ref: n.biblicalRef,
    variants: n.variants ?? [],
    tags: tx.json(n.tags),
    features: tx.json(computeFeatures(n.nameHe, n.translit[0])),
    stats: tx.json(n.stats),
    style_axes: n.styleAxes ? tx.json({ ...n.styleAxes }) : null,
  }));
  for (let i = 0; i < rows.length; i += 200) await tx`insert into names ${tx(rows.slice(i, i + 200))}`;
  await tx`insert into app_settings (key, value) values ('daily_budget_usd', '3') on conflict (key) do nothing`;
});

console.log(`Loaded ${names.length} names into the database.`);
await sql.end();
