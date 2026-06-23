<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Ushkyn (Ұшқын) — project guide for AI agents

This file is the handoff brief: what the product is, how it's built, the
conventions to follow, and where it's going. Read it before making changes.

## What this is

**Ushkyn** (Ұшқын — Kazakh for "spark"; formerly "iMektep") is an educational
**web app for Kazakh children, grades 1–4** (ages ~6–10). It teaches **math**
(and some **Kazakh language**) through short adaptive drills, lessons, and games.

- **Trilingual**: Kazakh (kk), Russian (ru), English (en). Every user-facing
  string goes through `lib/i18n.ts` — never hardcode UI text.
- **Goal**: a polished, genuinely engaging learning product, aimed at a
  **Kazakhstan government / startup grant** — so Kazakh cultural and curricular
  relevance matters (e.g. Togyz Kumalak, steppe/national motifs).
- **North-star right now**: make kids *return daily* (retention loop) and make
  math feel like a game. See "Roadmap".

There is also a separate **Android app** (`../iMektep`, Kotlin/Compose +
Firebase) — a different codebase. THIS repo (`mektep.web`) is the web app and
where active development happens.

## Stack & how to run

- **Next.js 16** (App Router) · **React 19** · **TypeScript 5** (strict) ·
  **Tailwind CSS 4** · Turbopack.
- **Supabase**: Postgres + Auth (email/password **and** anonymous guest; no web
  OAuth) + Row Level Security. Browser client via `@supabase/ssr`
  (`createBrowserClient`) in `lib/supabase.ts` — `createClient()` returns it.
- **AI tutor**: Google **Gemini Flash** via the `app/api/coach/route.ts` server
  route (keep the key server-side).

```bash
npm run dev      # local dev (Next dev server)
npm run build    # production build — also full typecheck
npm run lint     # eslint
npx tsc --noEmit # typecheck only
```

- **Env** (`.env.local`, gitignored): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the Gemini key used by `/api/coach`.
- **Deploy = push to `main`** (auto-deploy). So `main` is production — only push
  green code. Small, focused commits.

## Working mode (IMPORTANT — how to behave here)

**Reliability first — "Swiss clockwork".** The owner's explicit priority is that
existing tasks run *flawlessly*. After every change: run `tsc`, `eslint`, and a
`build`; for logic, also reason through edge cases. Build/lint green is necessary
but NOT sufficient — a wrong answer graded correct or an impossible generated
task is the worst kind of bug and tooling won't catch it. When touching task
**generators or answer-grading**, verify the math/answers by hand or with a
quick brute-force. A big visual redesign is **deferred**; don't start one unless
asked.

For non-trivial work, prefer: branch → `/code-review` (and `/security-review`
for anything touching auth/RLS/data) → then merge. Verify, don't assume.

## Architecture / where things live

- `app/` — App Router pages. Routes: `/` (home), `/login`, `/setup`, `/lessons`,
  `/lesson/[id]`, `/train` + trainers (`/train/equations`, `/train/column`,
  `/train/column-sub`, `/train/smart-add|sub|mul|div`, `/train/kazakh`,
  `/train/[id]`), `/game/*` (quick, duel, snake, 2048, checkers, sudoku, clock,
  tictactoe, reflex, simon, togyz, countries), `/leaderboard`, `/profile`,
  `/progress`, `/reset`, `/auth/*`, `/api/coach`.
- `components/` — shared UI. Notable: `SmartTrainer`, `ColumnMath`,
  `KazakhTrainer`, `EquationSolver`, `NumberLineSolver`, `round.tsx`
  (round-of-10 trainer scaffold: `useRound`/`RoundDots`/`RoundMilestone`),
  `ActivityCalendar`, `BottomNav`, `GameIcons`, `LessonComplete`, `PopButton`.
- `lib/` — all logic (keep logic out of components where practical):
  - `i18n.ts` — `t(key, lang)` + the `Lang` type. All UI text lives here.
  - `useLang.ts` — current language hook + `saveLang`.
  - `skills.ts` — **adaptive math engine**: generators (`genAddition` etc.),
    MC option/distractor builders, error-tag diagnosers (`diagnose*`), skill
    ladders, `pickSkill`/`updateStat` (mastery), `ERROR_TAG_LABEL`.
  - `trainers.ts` — equation generator + `trainerById` for generic trainers.
  - `distractors.ts` — wrong-answer generation (`smartOptions`); never returns a
    distractor equal to the answer, always dedups.
  - `mastery.ts` — logs attempts to `user_skill_mastery`.
  - `lessons/` — static lesson content (`math.ts`, `kazakh.ts`), `index.ts`,
    `types.ts`. **Lesson `answer` is often an INDEX into `options`.**
  - `quests.ts` — daily quests (`completeQuest`, `fetchTodayQuests`,
    `QUEST_XP`); the 4 daily tasks are `lesson|words|game|duel`.
  - `streak.ts` — **streak engine** `touchStreak(sb)` (idempotent per day,
    consecutive/freeze/reset, +1 freeze each 7 days), `fetchWeekActivity`,
    `fetchActivityCalendar`. Called from `completeQuest`, lessons, every
    trainer, and every game's XP award, so any daily practice keeps the streak.
  - `tutor.ts` / `tutor-client.ts` — **Сова coach** (`askCoach`). Hybrid:
    **code owns task generation, grading, and SRS; the LLM owns ONLY the
    Socratic dialogue.** Don't let the LLM grade or invent tasks.
  - `realtime/room.ts` — reusable realtime 1v1 layer over the `rooms` table
    (`createRoom`/`joinRoom`/`subscribeRoom`/`pushRoom`, presence). Powers
    online Checkers and 1v1 Duel.
  - `kazakh-vocab.ts`, `sounds.ts`, `speak.ts`, `theme.ts`,
    `database.types.ts`, `supabase.ts`.

## Data model (Supabase)

Schema lives in the **hosted Supabase project** (not migrations in-repo); the
`supabase-*.sql` files are the source-of-truth DDL, run by hand in the SQL
editor. Types in `lib/database.types.ts`. Key tables:

- `profiles` (id, name, grade, xp, **streak**, **last_active**, **freeze_count**,
  language, avatar_url) — one per auth user.
- `lesson_progress` (user_id, lesson_id, subject_id, stars, xp_earned,
  completed_at).
- `user_skill_mastery` (user_id, skill_id, mastery_level, total_correct,
  total_attempts, last_error_tag).
- `daily_quests` (user_id, quest_date, quest_id) — PK is the once-per-day guard.
  `streak.ts` also writes a sentinel `quest_id='active'` row as the activity
  footprint for the calendar/strip.
- `rooms` (1v1 game state blob + turn/winner) and `duels`.

**RLS**: every table is own-row only (`auth.uid() = id/user_id`). When adding a
table, add the matching RLS policies + an `supabase-*.sql` file.

**Known tradeoff (not a bug):** XP/streak are written from the **client**, so a
user could inflate *their own* numbers (RLS still blocks touching *others'*
rows). Low-stakes for now; a server RPC would close it if it ever matters.

## Design system

Warm **"Ұшқын / spark"** palette. All tokens are CSS variables in
`app/globals.css` `:root` (+ `.dark`) and exposed to Tailwind via `@theme inline`
— **re-theming is token-only; read from the tokens, don't hardcode colors.**

- `--primary` = softened spark amber-orange · `--accent` = steppe gold ·
  `--brand` = Kazakh-flag **turquoise** (secondary cool accent, kept for the
  grant/flag tie) · surface is warm cream.
- **Rule: green (`--success`) is reserved strictly for the "correct" state** —
  never use green for brand/CTAs.
- CTA gradients (`--gradient-hero`, `--gradient-success`) keep lightness ≤ ~0.66
  so white bold text stays legible (avoid the yellow-CTA contrast trap).
- `.pop-btn` = tactile press + spark-glow (consumes `--pop-shadow`, set inline
  per button). Animations: `animate-mk-pop/-shake/-pop-in`, `togyz-pop`.
- **Fonts**: Nunito (`--font-display`) + Inter (`--font-body`).
- **De-Duolingo'd**: green removed from brand ✅, pop-button reskinned ✅. The
  one remaining "Duolingo tell" is the **owl mascot (Сова)** — replacing it with
  an "Ұшқын" spark character is wanted but needs custom art (not done).

## Roadmap / current state

**Retention loop** (the current focus — Duolingo-style *daily goal → streak →
reminder*):
- ✅ **Daily goal + streak** — DONE. Home has streak chip, freezes, weekly strip,
  "Задания на сегодня 0/4"; streak counts ALL practice via `lib/streak.ts`.
  `/progress` has a GitHub-style activity calendar.
- ⏳ **Reminder channel** — strongest return lever. On web, kids have no inbox →
  go through the **parent** (weekly WhatsApp/email summary + "didn't practice N
  days"). Needs a parent–child model. Also great for the grant.
- ⏳ **Rewards** — spend XP (avatar / spark pet / themes).
- ⏳ **Guided math path** (a map/тропа) instead of the grid of trainers — removes
  choice paralysis.
- ⏳ Polish: a "🔥 streak +1 / at risk" toast on the first activity of the day.

**Parked (don't start without explicit ask):**
- **Parent–child accounts** (one parent, multiple kids) — exists in the Android
  app; not on web yet.
- **KZ data-residency / self-hosting Supabase in Kazakhstan** — relevant to the
  personal-data law before launch/grant.
- **Big visual redesign / mascot illustration** — wanted "in the future".

## Gotchas

- Trilingual always: add kk/ru/en for every string in `lib/i18n.ts`.
- Lesson questions: `answer` is frequently an **index** into `options` — verify
  `options[answer]` is the *true* answer when editing `lib/lessons/*`.
- The streak engine is idempotent per day; don't re-implement it — call
  `touchStreak`.
- Don't make the LLM grade or generate tasks — that's code's job (`/api/coach`
  is dialogue only).
- This is Next.js 16 — see the rules block at the top of this file.
