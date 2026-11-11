# שֶׁמֶצ׳ · ShemMatch

A Hebrew, RTL, mobile-first web app that takes Israeli parents from "no idea" to a short list of baby names in about ten minutes. The product spec is in [docs/PRD.md](docs/PRD.md). This repository holds the v1 single-parent flow.

## Run it locally

```bash
npm install
cp .env.example .env.local   # every value is optional for local development
npm run dev                  # http://localhost:3000
npm test
```

With no environment variables the app runs on a 56-name sample (`data/names.sample.json`), keeps counters in memory, and writes every suggestion with the built-in ranking and standard explanations. Add `ANTHROPIC_API_KEY` to have Claude pick names and write the reasons.

## How it works

- **Names come only from the database.** The server filters by the hard rules (sex, family names, names already shown, Must chips), scores the rest by Want chips, parsed free text and feedback similarity, then lets Claude Sonnet choose three of the top candidates and write one line on why each fits. Any id outside the candidate list is dropped.
- **Why this name?** is computed from the name data, not by the model: each chip and free-text wish is checked as met, partly met or not met.
- **Free text** (wishes, card notes, round notes) goes to Claude Haiku once, which checks it for abuse and turns it into structured requirements. Flagged text never reaches the main model; after two flags the text box is turned off for the session.
- **Nothing about the parent is stored on the server.** Everything lives in the browser's local storage; each request carries what the server needs. The due date never leaves the device: only the Hebrew month, nearby holiday, zodiac sign and season are sent.
- **Limits.** A signed session token holds the per-session counters (20 LLM calls, 5 reports per hour). A daily spend counter stops LLM calls at the budget ($3 by default, overridable in the `app_settings` table without a deploy) and emails the owners at 80%. When the model is off, every screen keeps working on the ranking rules.
- **Feedback** is held in the `reports` table and sent to the owners once a day by `/api/cron/feedback-digest` (scheduled in `vercel.json` at 05:00 UTC, which is 08:00 Israel summer time and 07:00 in winter), then deleted.

## Name data

- `data/cbs/babynamesIL-jewish.csv` holds the CBS yearly counts for the Jewish sector (from the babynamesIL package).
- `data/name-content.tsv` holds the reviewed content for each name: niqqud, Latin spellings, meaning, origins, biblical source, spelling variants and tags.
- `data/name-style.tsv` holds style scores, 1 to 5, scored once offline by a model and checked by a person: reach (easy to say abroad) and religious (mainly Haredi to mainly secular families). The rubric is in `scripts/styles.ts`. A third axis, era, is computed from CBS data only: the share-weighted average birth year of the babies given the name, cut by decade (`src/lib/names/era.ts`). Ranking uses them only to compare names, for "similar to the siblings" and "similar to names you liked"; they are never shown or used as filters. Sound hardness and length are computed from the letters.
  - `npm run styles:score` scores names that have no row yet (needs `ANTHROPIC_API_KEY`); `npm run styles:sample -- out.md` writes the 50-name sample to check before loading.
- `data/name-merges.tsv` lists spellings of one name that CBS counts apart (בת שבע and בתשבע, ליה and לייה). The first column is the spelling the app shows; the babies of the others are added to it before ranking, so counts, ranks, sex ratio and trends cover the whole name, and the other spellings become its variants. Only spellings said the same way go here; look-alike names (הלל and הילל) stay apart.
- `npm run data:build` joins these into `data/names.json`, keeping every name given to at least 50 babies since 2000.
- `data/names.sample.json` is a small fixed list for local development and tests. The app never imports the full list: in production it reads names only from the database, and `data/names.json` is input for `npm run db:seed`.

## Database

`npm run db:seed` creates the tables from `db/schema.sql` and loads `data/names.json`, replacing any names already there. With Supabase, use the Transaction pooler connection string (port 6543):

```bash
DATABASE_URL="postgres://...pooler.supabase.com:6543/postgres" npm run db:seed
```

`npm run db:styles` writes only the style scores from `data/names.json` (run `npm run data:build` first) into the names already in the database, matched by Hebrew name, and adds the `style_axes` column if needed. It changes nothing else. Until it runs, ranking falls back to the coarse style tag.

Then set the same `DATABASE_URL` in the Vercel project's environment variables and redeploy.

## Project layout

| Path | What it holds |
| --- | --- |
| `src/lib/engine` | Filtering, scoring, diverse picks, Our pick, the per-requirement explanation |
| `src/lib/names` | Name helpers: sex split, popularity trend, derived features |
| `src/lib/server` | Store (Postgres or memory), session token, spend counter, Claude calls and prompts |
| `src/lib/client` | Device-side state and API calls |
| `src/app/api` | Route handlers |
| `src/components` | The screens |
