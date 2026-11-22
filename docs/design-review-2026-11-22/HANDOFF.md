# ShemMatch (Name Planner) — handoff from the Claude design review, 22 Nov 2026

Live site: https://name-planner-beta.vercel.app
Repo: `ShaharGotshtat/NamePlanner`. All changes go here.
Design canvas: see [Design canvas](#design-canvas) below.

The review was done by playing the live site three times (22 Nov, about 10:40–11:20 UTC) and reading its local storage and network responses. The source code was NOT read, so file and component names below are unknown: find them in the repo first. PRs #72, #73, #75 and #76 merged during or just after the review, so check each finding against the current code.

## Decisions

| # | Item | Decision |
|---|------|----------|
| A | Notes carry over after "start over" | No change |
| B | Holiday/season request can't be met | **Change** (spec below) |
| C | Small bugs | **Fix** (spec below) |
| D | One-line reason under each name | **Change** (spec below) |
| E | Ask why after "No" | No change |
| F | Merge the two preference sections | **Change** (spec below) |
| G1 | "מה למדנו" panel showing notes, corrections, rejected names | Not now. Reminder: #80 (p3) |
| G2 | Start over: choose what to keep | Not now. Reminder: #78 (p3) |
| H1 | Replace "מצאתי!" with "לסיכום" + finish check | **Change** (spec below) |
| H2 | New summary screen | **Change** (spec below) |
| I | A URL per step | No change |
| J | New round logic | No change |
| K | Musts filtered in code, not by the AI | No change |

Suggested order: one PR per item — C, D, H1, H2, F, B.

## Design canvas

Canvas: https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE (a Claude artifact; private to its owner until shared, and it needs a claude.ai sign-in, so a coding session can't open it).

The source of every artboard is in [`demos/`](demos/), with `canvas.json` listing titles and sizes. The files render only inside the canvas, but they are plain HTML with inline styles, so read them as the spec: exact Hebrew copy, colours, sizes and spacing. Links below open each artboard on the canvas; `#play-…` opens it clickable.

| Item | Status | Artboard (canvas link) | Source |
|------|--------|------------------------|--------|
| D · One-line reason | Change | [D](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#artboard-Main) · [play](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#play-Main) | `demos/Main.dc.html` |
| F · One preference section | Change | [F](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#artboard-F-preferences) · [play](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#play-F-preferences) | `demos/F-preferences.dc.html` |
| H1 · Finish check | Change | [H1](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#artboard-H1-finish-check) | `demos/H1-finish-check.dc.html` |
| H2 · Summary, today | Reference | [today](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#artboard-H2-before) · [after tapping a name](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#artboard-H2-before-picked) | `demos/H2-before.dc.html`, `demos/H2-before-picked.dc.html` |
| H2 · Summary, new | Change | [new](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#artboard-H2-summary) · [play](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#play-H2-summary) | `demos/H2-summary.dc.html` |
| G1 · "מה למדנו" | Later (#80) | [today](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#artboard-G1-before) · [entry](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#artboard-G1-entry) · [panel](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#artboard-G1-taking-into-account) | `demos/G1-*.dc.html` |
| G2 · Start over | Later (#78) | [G2](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#artboard-G2-start-over) | `demos/G2-start-over.dc.html` |
| E · Why after "No" | No change | [E](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#artboard-E-why-no) | `demos/E-why-no.dc.html` |
| I · URL per step | No change | [I](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#artboard-I-step-urls) | `demos/I-step-urls.dc.html` |
| J · Round logic | No change | [map](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#artboard-J-flow) · [simulation](https://claude.ai/artifact/3wCdX9fZZs2Cbe9V6mXfpE#play-J-prototype) | `demos/J-flow.dc.html`, `demos/J-prototype.dc.html` |

Where a design and a spec below disagree, the spec wins. Parts of a design that depend on a "No change" item are out of scope (for example, D and H1 show "לסיכום" in the header; that comes from H1, not D).

## What the app does today (observed)

- Saved data: one localStorage key, `nameplanner:v1`, with keys `step, terms, babySex, dueDate, dueDerived, surname, family, chips, freeText, notes, namesWeLike, declined, profile, checkedInput, freeTextDisabled, pass, rounds, ratings, favoriteId, ourPick, token, savedAt`. Also `nameplanner:run` and `nameplanner:daily`.
- `chips` maps criterion id to `"want" | "must"`. Ids seen: `clearMeaning, englishFriendly, singleSpelling, notTop20, fitsSiblings, flowsWithSurname, grandparentFriendly, dueDateLink, noUnisex`.
- `dueDerived` example: `{hebrewMonth:"ניסן", holiday:"פסח", zodiac:"טלה", season:"אביב"}`.
- API: `POST /api/session`, `/api/events`, `/api/preferences`, `/api/rounds` (returns 4 suggestions).
- Name record fields: `id, nameHe, niqqud, translit[], sexRatio (share of boys), meaningHe, origin, originHe, biblicalRef, variants, tags{links[], style, hebrewWord, singleSpelling, englishFriendly, meaningCategories[]}, stats[{rank, year, count}]`. Rank `9999` means "not ranked / 0 births".
- Each suggestion has `reason` (AI text) and `explanation[{requirement, fit: met|partly|not_met, detail}]`.
- Design tokens: Rubik (body), Fredoka (display); `ink #3a3560, ink-soft #625d86, rose #f7a9a8, rose-dark #b84a57, rose-deep #9c3846, lavender-dark #4f5fb0, lavender-soft #eaeefc, cream #fff8f4, line #f0e2dc, whatsapp #1a7f4b`. Cards `rounded-3xl p-5 ring-1 ring-line`; buttons `min-h-11 rounded-2xl border-2`.

## C · Bugs

1. A new step, round or name opens scrolled down (scrollY was 162). On change, scroll to the top and focus the heading:
   ```tsx
   useEffect(() => { window.scrollTo({ top: 0 }); h1Ref.current?.focus({ preventScroll: true }); }, [step, round, nameIdx]);
   // <h1 ref={h1Ref} tabIndex={-1}>
   ```
2. The summary title says "השמות המובילים: אגם, הדס, שלי." while the list shows 4 names. H2 replaces this title; if C ships first, build the title from the same list.
3. "לחשיפת השם הראשון" is a plain element, not a `<button>`, so keyboard and screen-reader users can't reach it.
4. Each רצוי/חובה pair needs a group label naming its criterion (`role="radiogroup" aria-label="<criterion>"`). F removes these pairs; skip this if F ships first.

## D · One-line reason under each name

Design: `demos/Main.dc.html`.

1. Under the name and its Latin spelling, show one line of reason, always visible, e.g. `מארבעת המינים, וזורם עם „הדס כהן”`.
2. One line only: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`, 16px.
3. Keep the AI reason to 40 characters or fewer: say so in the prompt, and check the length on the server (shorten or regenerate if longer).
4. "למה השם הזה?" stays. It opens meaning, source and popularity, plus the match list drawn as small chips: ✓ met, ~ partly, ✗ not met. Use icons as well as colour, so the state doesn't rely on colour alone.

## F · One preference section

Design: `demos/F-preferences.dc.html`.

1. Remove the separate "כמה זה חשוב?" box. Tapping a chip cycles off → רצוי → חובה → off. `noUnisex` cycles off ↔ חובה only.
2. States aren't colour-only: רצוי = lavender-soft fill + check icon; חובה = lavender-dark fill + lock icon + the word חובה; off = white.
3. Chips whose data is missing are shown disabled with a hint (`אין אחים ברשימה`, `צריך תאריך לידה`).
   Open question: today a chip selected before its data was removed stays saved and is still sent (A, not changing). Decide whether a disabled chip should still be sent.
4. Warn at 3 or more musts: `N דרישות חובה עלולות לצמצם מאוד את ההצעות. אפשר להפוך חלק ל„רצוי”.`
5. Keep chip order and size stable when the state changes (today they reflow).
6. Short legend under the title: `לחיצה אחת: רצוי. שנייה: חובה. שלישית: מבטלת.`

## H1 · "לסיכום" + finish check

Design: `demos/H1-finish-check.dc.html`.

1. Rename the round-header button "מצאתי!" to "לסיכום".
2. If the current round still has unseen names, open a bottom sheet: title `רגע לפני הסיכום`, text `נשארו עוד N שמות בסבב הזה שעוד לא ראיתם.`, primary `להמשיך לראות`, secondary `לסיכום בכל זאת`, footnote `השמות יחכו לכם בסיכום, תחת „עוד לא ראיתם”.`
3. Keep unseen names in state; H2 lists them.

## H2 · New summary screen

Today: `demos/H2-before.dc.html`, `demos/H2-before-picked.dc.html`. New: `demos/H2-summary.dc.html`.

1. Title shows the count: `N שמות שאהבתם`, subtitle `איזה הכי? אפשר לשנות בכל רגע.`
2. The favourite is a choice on the same list (radio); tapping another name changes it. No separate "…הוא הבחירה הראשונה!" screen.
3. The chosen row shows the full name with the surname (e.g. `אֲגַם כֹּהֵן`) and a `הבחירה הראשונה` badge.
4. Below the list: `אולי: …` and `עוד לא ראיתם: N שמות מסבב X` (from H1).
5. Export: WhatsApp and copy side by side; "עוד סבב של שמות חדשים" as a text link under them.
6. No head-to-head comparison (J is not changing).
7. Related open issue: #70 (all names marked "לא" leaves the summary empty).

## B · Holiday/season request

1. The chip label shows the real values from `dueDerived`, e.g. `קשור לפסח או לאביב`. Without a due date the chip is disabled with the hint `צריך תאריך לידה`.
2. Store `tags.links` as fixed codes (`pesach, nisan, spring, aries, sukkot, tubishvat` …) instead of Hebrew strings (`"סוכות"`, `"ט״ו בשבט"` today). Migrate the existing values.
3. Add Pesach/spring links. Candidates to verify before adding: אביב, אביבה, ניצן (Song of Songs, read on Pesach), טל (the prayer for dew), שירה (the Song at the Sea), מרים, גאולה.
4. Compute the fit in code, not in the AI explanation. Due dates move, so use a window around the date (`@hebcal/core` gives Hebrew dates and holidays):
   ```ts
   const wanted = new Set(hebrewDatesAround(dueDate, 14).flatMap(d => d.linkCodes));
   const hits = name.links.filter(l => wanted.has(l));
   fit = hits.length ? 'met' : name.links.length ? 'partly' : 'not_met';   // הדס → "סוכות, לא פסח"
   ```
5. If few names in the pool meet the request, say so plainly (`יש לנו רק N שמות שקשורים לפסח`).
6. The names live in Postgres, loaded from `data/`. After merging, someone with the database credentials runs `npm run db:seed`.

## Other findings from the review (no decision yet)

- "לא לזה התכוונתי" was treated as "delete this requirement". The button was removed in #73; follow-up is #74.
- The summary claimed "starts with ר׳ after grandma Rachel" was understood, but nothing filtered on first letter (1 of 12 names matched). #72 added letter filters; recheck.
- Popularity shows `0 תינוקות … מקום 9999`. The count appears to include boys while the rank is girls-only (אגם 473/41 vs נגה 467/38).
- פלג (sexRatio 0.78) was offered for a girl. תחיה is tagged `englishFriendly`. One reason called ברק one syllable. חלי is spelled like חולי ("illness"). Biblical tags are being reworked in PR #71.
