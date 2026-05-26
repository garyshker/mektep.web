# iMektep — Interactive Learning Platform for Kids

<p align="center">
  <img src="public/favicon.svg" width="64" alt="iMektep logo" />
</p>

<p align="center">
  A full-stack educational platform for children in grades 1–4, built with Next.js and Supabase.
</p>

<p align="center">
  <a href="https://mektep-web.vercel.app"><strong>🌐 Live →</strong></a>
</p>

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, TypeScript |
| Styling | Tailwind CSS |
| Backend / Auth | Supabase (PostgreSQL + Auth + Realtime) |
| Hosting | Vercel |
| 1v1 Realtime | Supabase Realtime (WebSocket) |

---

## Features

- Adaptive math and language lessons for grades 1–4
- Mini-games: Quick Math, Times Table, Sprint, Clock, Tetris, 2048, Memory, Snake
- User accounts with Google login
- XP, streaks, and daily quests
- Leaderboards
- 1v1 challenge mode *(coming soon)*
- Parental screen time controls
- Kazakh / Russian / English interface

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Project Structure

```
mektep.web/
├── app/                  # Next.js App Router pages
│   ├── page.tsx          # Home / dashboard
│   ├── layout.tsx        # Root layout
│   ├── login/            # Auth pages
│   └── lesson/[id]/      # Lesson runner
├── components/
│   ├── game/             # Clock, LessonRunner, mini-games
│   └── ui/               # Shared UI components
├── lib/
│   └── supabase.ts       # Supabase client
├── _legacy/              # Old static version (reference)
└── public/
```

---

## Related

> Legacy static version: [_legacy/](./_legacy/)  
> Android app (Kotlin + Jetpack Compose): [github.com/garyshker/iMektep](https://github.com/garyshker/iMektep)

---

<p align="center">Made with ❤️ for the children of Kazakhstan</p>
