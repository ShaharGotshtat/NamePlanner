# ShemMatch (Name Planner) — handoff from the Claude design review, 22 Nov 2026

Live site: https://name-planner-beta.vercel.app
Repos: `ShaharGotshtat/NamePlanner` (public), `ShaharGotshtat/name-planner-issues` (private)
Design canvas (Claude artifact, private to its owner until shared): https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE

The review was done by playing the live site three times and reading its local storage and network responses. The source code was NOT read, so file and component names below are unknown: find them in the repo first.

## Decisions

| # | Item | Decision |
|---|------|----------|
| A | Notes carry over after "start over" | Keep everything on start over (as today). Add the clean-up step and fix the menu copy (spec below). |
| B | Holiday/season request can't be met | **Change** (spec below) |
| C | Small bugs | **Fix** (spec below) |
| D | One-line reason under each name | Pending: review the corrected design (artboard "D") |
| E | Ask why after "No" | No change for now |
| F | Merge the two preference sections | **Change** (spec below) |
| G1 | "מה למדנו" panel showing notes, corrections, rejected names | Pending: before/after on the canvas |
| G2 | Start over: choose what to keep | P3 issue, not yet filed. Draft at the end of this file |
| H1 | Replace "מצאתי!" with "לסיכום" + finish check | **Change** (spec below) |
| H2 | New summary screen | Pending: before/after on the canvas |
| I | A URL per step | No change |
| J | New round logic | Redo the simulation after the other changes |
| K | Musts filtered in code, not by the AI | No change for now |

## What the app does today (observed)

- Saved data: one localStorage key, `nameplanner:v1`, with keys `step, terms, babySex, dueDate, dueDerived, surname, family, chips, freeText, notes, namesWeLike, declined, profile, checkedInput, freeTextDisabled, pass, rounds, ratings, favoriteId, ourPick, token, savedAt`. Also `nameplanner:run` and `nameplanner:daily`.
- `chips` maps criterion id to `"want" | "must"`. Ids seen: `clearMeaning, englishFriendly, singleSpelling, notTop20, fitsSiblings, flowsWithSurname, grandparentFriendly, dueDateLink, noUnisex`.
- `notes` is a list of strings, e.g. `"על השם פלג: נשמע לי שם של בן"`, `"על הסבב: רוצים שמות שקשורים לאביב או לפסח"`, `"לגבי \"שם תנ\"כי\": לא לזה התכוונתי"`.
- `dueDerived` example: `{hebrewMonth:"ניסן", holiday:"פסח", zodiac:"טלה", season:"אביב"}`.
- API: `POST /api/session`, `/api/events`, `/api/preferences` (turns free text + notes into `profile.requirements` with `kind/facet/values`, plus a `summary` and `sig`), `/api/rounds` (returns 4 suggestions).
- Name record fields: `id, nameHe, niqqud, translit[], sexRatio (share of boys), meaningHe, origin, originHe, biblicalRef, variants, tags{links[], style, hebrewWord, singleSpelling, englishFriendly, meaningCategories[]}, stats[{rank, year, count}]`. Rank `9999` means "not ranked / 0 births".
- Each suggestion has `reason` (AI text) and `explanation[{requirement, fit: met|partly|not_met, detail}]`.
- Design tokens: Rubik (body), Fredoka (display); `ink #3a3560, ink-soft #625d86, rose #f7a9a8, rose-dark #b84a57, rose-deep #9c3846, lavender-dark #4f5fb0, lavender-soft #eaeefc, cream #fff8f4, line #f0e2dc, whatsapp #1a7f4b`. Cards `rounded-3xl p-5 ring-1 ring-line`; buttons `min-h-11 rounded-2xl border-2`.

## A · Start over keeps everything, plus a clean-up step

Problem: requests whose basis was removed stay active and invisible. Example: after clearing the due date, `chips.dueDateLink` stayed `"want"`. After clearing siblings, `fitsSiblings` stayed selected. Round notes also keep steering suggestions without being shown anywhere.

1. Keep today's behaviour: start over resets `ratings`, `rounds` and the favourite, and keeps everything else.
2. Add `normalize(state)` and run it on every save and on load:
   ```ts
   function normalize(s) {
     const chips = { ...s.chips };
     if (!s.dueDate) delete chips.dueDateLink;
     if (!s.family.some(f => f.relation === 'sibling')) delete chips.fitsSiblings;
     if (!s.surname?.trim()) delete chips.flowsWithSurname;
     return { ...s, chips };
   }
   ```
3. Build requests to `/api/preferences` and `/api/rounds` only from the normalized state, and invalidate `profile.sig` when it changes.
4. Menu copy for "התחלה מחדש": `הדירוגים מתאפסים. הפרטים, ההעדפות וההערות מהסבבים נשמרים.`
5. Test: set a due date and the holiday chip, clear the date, start over. The `/api/rounds` payload must not include the holiday request.
6. Making the kept notes visible and removable is G1 (pending decision).

## B · Holiday/season request

1. Chip label shows the real values from `dueDerived`, e.g. `קשור לפסח או לאביב`. Without a due date the chip is disabled with the hint `צריך תאריך לידה`.
2. Store `tags.links` as fixed codes (`pesach, nisan, spring, aries, sukkot, tubishvat` …) instead of Hebrew strings (`"סוכות"`, `"ט״ו בשבט"` today). Migrate the existing values.
3. Add Pesach/spring links. Candidates to verify before adding: אביב, אביבה, ניצן (Song of Songs, read on Pesach), טל (the prayer for dew), שירה (the Song at the Sea), מרים, גאולה.
4. Compute the fit in code, not in the AI explanation. Due dates move, so use a window around the date (`@hebcal/core` gives Hebrew dates and holidays):
   ```ts
   const wanted = new Set(hebrewDatesAround(dueDate, 14).flatMap(d => d.linkCodes));
   const hits = name.links.filter(l => wanted.has(l));
   fit = hits.length ? 'met' : name.links.length ? 'partly' : 'not_met';   // הדס → "סוכות, לא פסח"
   ```
5. If few names in the pool meet the request, say so plainly ("יש לנו רק N שמות שקשורים לפסח"). Reserving a wildcard slot per round belongs to J (later).

## C · Bugs

1. New step, round or name opens scrolled down (scrollY was 162). On change, scroll to the top and focus the heading:
   ```tsx
   useEffect(() => { window.scrollTo({ top: 0 }); h1Ref.current?.focus({ preventScroll: true }); }, [step, round, nameIdx]);
   // <h1 ref={h1Ref} tabIndex={-1}>
   ```
2. Summary title says "השמות המובילים: אגם, הדס, שלי." while the list shows 4 names. Build the title from the same list (`{liked.length} שמות שאהבתם`).
3. "לחשיפת השם הראשון" is a plain element, not a `<button>`: keyboard and screen readers can't reach it.
4. Each רצוי/חובה pair needs a group label naming its criterion (`role="radiogroup" aria-label="<criterion>"`).

## F · One preference section

1. Remove the separate "כמה זה חשוב?" box. Tapping a chip cycles off → רצוי → חובה → off. `noUnisex` cycles off ↔ חובה only.
2. States aren't colour-only: רצוי = lavender-soft fill + check icon; חובה = lavender-dark fill + lock icon + the word חובה; off = white.
3. Chips whose data is missing are disabled with a hint (no siblings / no surname / no due date). This is the same rule as `normalize` in A.
4. Warn at 3 or more musts: `N דרישות חובה עלולות לצמצם מאוד את ההצעות`.
5. Keep chip order and size stable when the state changes (today they reflow).
6. Short legend under the title: `לחיצה אחת: רצוי. שנייה: חובה. שלישית: מבטלת.`

## H1 · "לסיכום" + finish check

1. Rename the round-header button "מצאתי!" to "לסיכום".
2. If the current round still has unseen names, open a bottom sheet: title `רגע לפני הסיכום`, text `נשארו עוד N שמות בסבב הזה שעוד לא ראיתם.`, primary `להמשיך לראות`, secondary `לסיכום בכל זאת`, footnote `השמות יחכו לכם בסיכום.`
3. Keep unseen names in state so they can be shown later.

## Pending decisions (designs on the canvas)

- **D**: name, translit and one reason line of 40 characters or fewer (`white-space: nowrap; text-overflow: ellipsis`). The existing "למה השם הזה?" opens meaning, source, popularity and the match chips. Limit the length in the prompt and check it on the server.
- **G1**: "מה למדנו · N" button in the round header; a "נשמר ב„מה למדנו”" line under each note; a panel listing form choices, free-text items (filtered or not), round notes and corrections, and rejected or taken names, each removable.
- **H2**: count in the title; the favourite is a choice on the same list and can be changed; full name with surname; "עוד לא ראיתם" list; WhatsApp and copy side by side.

## Other findings from the review (no decision yet)

- "לא לזה התכוונתי" on a requirement is treated as "delete this requirement". In run 2, "no biblical names" was cancelled after the user flagged biblical suggestions.
- The summary claimed "starts with ר׳ after grandma Rachel" was understood, but nothing filters on first letter. 1 of 12 names matched.
- Popularity shows `0 תינוקות … מקום 9999`. The count appears to include boys while the rank is girls-only (אגם 473/41 vs נגה 467/38).
- פלג (sexRatio 0.78) was offered for a girl. תחיה is tagged `englishFriendly`. One reason called ברק one syllable. חלי is spelled like חולי ("illness").

## G2 issue draft (P3, not yet filed)

Title: `Start over: let users choose what to keep` · Label: `p3`

When the user taps "התחלה מחדש", show a dialog, `מה לשמור לסבבים החדשים?`, with one checkbox per group of saved data, all checked by default so the default matches v1: פרטי המשפחה והתאריך · מה חשוב לכם ושמות אהובים · הערות ותיקונים מהסבבים · שמות שלא תרצו לראות שוב · שמות תפוסים במשפחה. Ratings always reset, and the dialog says so. "מחיקת כל הנתונים" stays a separate menu action.
Acceptance: unchecked groups are cleared and never sent to `/api/preferences` or `/api/rounds`. Checked groups are kept.
