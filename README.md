# Ushkyn (Ұшқын) — Interactive Learning Platform for Kids

<p align="center">
  <img src="public/favicon.svg" width="64" alt="Ushkyn logo" />
</p>

<p align="center">
  <strong>Ұшқын</strong> ("spark") — a full-stack educational web app for children in grades 1–4,<br/>
  built with Next.js and Supabase. Trilingual: Kazakh · Russian · English.
</p>

<p align="center">
  <a href="https://mektep-web.vercel.app"><strong>🌐 Live →</strong></a>
</p>

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Backend / Auth | Supabase (PostgreSQL · Auth · Storage · Realtime) |
| Realtime 1v1 | Supabase Realtime (WebSocket) |
| Hosting | Vercel |

---

## Features

**Learning**
- Math & Kazakh lessons for grades 1–4, with many question types (multiple-choice, type-in, matching, word problems, clock reading…)
- **Animated explainers** — number-line hops for add/sub, and an equation solver that walks through `x ± a = b` and `a − x = b` step by step
- **Adaptive trainers** (тренажёр) with per-skill mastery tracking: smart addition (carrying), smart subtraction (borrowing), and equations (find *x*) with a *"Show how"* worked example

**Games** (12 mini-games)
- Quick Math · 1v1 Duel (realtime) · Snake · 2048 · Checkers · Sudoku · Clock · Tic-Tac-Toe · Reflex · Simon
- **Togyz Kumalak** (Kazakh national game) · **Countries** (CIS quiz)

**Profile & motivation**
- Email / Google / anonymous-guest sign-in
- Profile photos with an in-app cropper
- XP, daily streaks, and a leaderboard
- Parent progress dashboard
- Kazakh / Russian / English UI, switchable anytime

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database setup

Run the SQL files in the Supabase SQL editor (in order):

| File | Sets up |
|---|---|
| `supabase-schema.sql` | profiles, lesson progress, RLS policies |
| `supabase-skill-mastery.sql` | per-skill mastery for the adaptive trainers |
| `supabase-duels.sql` | 1v1 duel rooms |
| `supabase-avatars.sql` | `avatar_url` column + public `avatars` storage bucket |

---

## Project Structure

```
mektep.web/
├── app/                      # Next.js App Router
│   ├── page.tsx              # Home / dashboard
│   ├── lessons/  lesson/[id] # Lesson list + runner
│   ├── train/                # Adaptive trainers (smart-add, smart-sub, equations)
│   ├── game/                 # 12 mini-games
│   ├── leaderboard/  profile/  progress/  setup/  login/
├── components/
│   ├── EquationSolver.tsx    # Animated find-x explainer
│   ├── NumberLineSolver.tsx  # Animated add/sub explainer
│   ├── AvatarCropper.tsx     # Profile photo cropper
│   ├── SmartTrainer.tsx      # Adaptive trainer engine
│   └── game/                 # Mini-game implementations
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── lessons/              # math.ts, kazakh.ts question generators
│   ├── trainers.ts  skills.ts# Trainer generators + mastery logic
│   └── i18n.ts               # KK / RU / EN strings
├── supabase-*.sql            # Schema + migrations
└── public/
```

---

## Related

> Android app (Kotlin + Jetpack Compose): [github.com/garyshker/iMektep](https://github.com/garyshker/iMektep)  
> Legacy static prototype: [_legacy/](./_legacy/)

---

<p align="center">Made with ❤️ for the children of Kazakhstan</p>
