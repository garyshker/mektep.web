# Ushkyn — design brief for an AI design tool (Lovable)

Paste this whole file as context before asking for screens. It is written to be
read literally: the CONSTRAINTS section is non-negotiable, the OPEN QUESTION is
the only thing we want you to argue about.

---

## 1. Product

**Ushkyn** (Ұшқын — Kazakh for "spark"). A web app that teaches **maths** and
some **Kazakh language** to **Kazakhstani children in grades 1–4 (ages 6–10)**.

- Users are **children who are still learning to read**. Reading load is a cost,
  not a feature.
- **Trilingual**: Kazakh (kk), Russian (ru), English (en). Kazakh and Russian use
  Cyrillic, including the extra Kazakh letters ә ғ қ ң ө ұ ү һ і.
- Primary device: **phone, 390px wide**. Desktop is a secondary layout with a
  240px left sidebar.
- Goal: children **return daily**. Streak, XP, daily tasks already exist.
- Stack: Next.js 16 App Router, React 19, TypeScript strict, **Tailwind CSS v4**
  with tokens exposed via `@theme inline`. All design tokens are CSS variables in
  `app/globals.css`. Icons: `lucide-react` + hand-authored SVG.

## 2. Brand position

The product was renamed from "iMektep" to **Ushkyn** to stop looking like a
Duolingo clone. The identity is a **warm spark on a cream surface**: amber-orange
primary, steppe gold accent, Kazakh turquoise as a cool secondary, and Kazakh
ornament (`qośqar-muyiz`) used as a graphic element.

**We are deliberately NOT green and NOT Duolingo.** See the OPEN QUESTION in §7
before proposing a palette change.

## 3. Design tokens (source of truth)

Colours are **oklch**. Never emit hex. Never invent a colour that is not here.

```css
/* surface */
--background:        oklch(0.985 0.012 83);   /* warm cream */
--foreground:        oklch(0.25 0.03 58);     /* soft brown-ink */
--card:              oklch(1 0.002 90);
--border:            oklch(0.91 0.014 78);
--muted:             oklch(0.955 0.016 80);
--muted-foreground:  oklch(0.53 0.03 64);

/* brand */
--primary:           oklch(0.65 0.13 58);     /* spark amber — FILLS, icons, chips */
--primary-ink:       oklch(0.55 0.13 55);     /* the same amber as TEXT on light surfaces */
--primary-deep:      oklch(0.47 0.115 50);    /* press shadow */
--accent:            oklch(0.82 0.15 85);     /* steppe gold */
--accent-deep:       oklch(0.62 0.16 70);
--brand:             oklch(0.66 0.13 218);    /* Kazakh turquoise — secondary accent */

/* semantic */
--success:           oklch(0.68 0.18 145);    /* RESERVED: "answer is correct" */
--destructive:       oklch(0.62 0.22 25);
--warning:           oklch(0.78 0.16 60);     /* streak / fire */
--xp:                oklch(0.74 0.17 85);

/* category accents — the ONLY hues a game/subject tile may use */
--cat-spark:  oklch(0.65 0.13 58);
--cat-sea:    oklch(0.66 0.13 218);
--cat-gold:   oklch(0.72 0.15 82);
--cat-violet: oklch(0.60 0.14 300);
--cat-rose:   oklch(0.64 0.16 15);
--cat-sky:    oklch(0.64 0.13 250);

/* gradients — only the ONE primary action per screen may use --gradient-hero */
--gradient-hero:    linear-gradient(135deg, oklch(0.58 0.15 50), oklch(0.54 0.16 42));
--gradient-gold:    linear-gradient(135deg, oklch(0.82 0.16 85), oklch(0.74 0.18 70));
--gradient-success: linear-gradient(135deg, oklch(0.625 0.15 56), oklch(0.57 0.165 44));

/* shape */
--radius-sm: 12px;  --radius: 18px;  --radius-lg: 24px;  --radius-pill: 999px;

/* type */
--font-display: Nunito;   /* rounded, friendly — headings, numbers, buttons */
--font-body:    Inter;    /* UI text */
```

Dark theme overrides `--background/--foreground/--card/--border/--muted/
--muted-foreground/--primary-ink` and lifts every `--cat-*` to a lighter value so
labels stay readable on dark cards. **Any new colour you introduce must ship a
dark-theme value too.**

## 4. CONSTRAINTS (hard rules — a design that breaks one is rejected)

1. **Green means "correct" and nothing else.** `--success` may only appear as
   answer feedback. Never a green brand colour, green CTA, or green nav.
2. **Colours come from tokens.** No hex literals, no per-card bespoke pastels. A
   previous version hardcoded 12 pastel game cards + 6 unrelated avatar colours;
   it read as a rainbow with no identity and was removed.
3. **One hero per screen.** Exactly one element may carry `--gradient-hero` — the
   single action we want the child to take. Everything else is a tinted card
   (`color-mix(in oklch, <token> 10-12%, var(--card))`) with a matching border.
4. **Contrast is measured, not eyeballed.** WCAG AA: 4.5:1 for normal text, 3:1
   for large (≥18.66px bold / ≥24px). Translucent white on the hero must be
   ≥85% opacity — at 70% it measured 2.64:1 and failed. `--primary` as *text* on
   cream is 3.22:1, so small text must use `--primary-ink` (4.86:1).
5. **Type sizes in rem (Tailwind scale), never `text-[Npx]`.** Fixed px does not
   respond to a browser's default-font-size setting while the rest of the page
   does, which makes the layout differ per browser. **Nothing below 12px.**
6. **Touch targets ≥44×44px.**
7. **No flag emoji.** 🇰🇿 is a regional-indicator pair and Windows ships no glyph
   for it — Chrome renders tofu (▯▯). Use text codes: `ҚАЗ / РУС / ENG`.
8. **No ALL CAPS** for Cyrillic labels. Caps read slower and 6-year-olds are
   still learning lowercase shapes. Sentence case.
9. **Every user-facing string is trilingual**, via `lib/i18n.ts`. Never hardcode
   text. Kazakh is often 20–40% longer than Russian — layouts must not break.
10. **Icons: one system.** Prefer SVG (lucide or hand-authored). Emoji are
    allowed only for rewards and emotion, never as functional UI icons.
11. **Respect `prefers-reduced-motion`.** A global rule freezes animations, so no
    component may depend on motion to be legible (e.g. a loader's resting state
    must be visible, not opacity 0).

## 5. What has already been redesigned (do not re-solve)

- **Home** was six stacked blocks of near-equal weight, two of them painted with
  the *same* gradient, so nothing said "start here". Now: one gradient hero =
  today's lesson (title 30px, one big CTA), then week strip, then two quiet
  tinted tiles (Trainers / Games), then daily tasks, then a link row to lessons.
- **Games** moved off home into `/game`: a real 2-column (mobile) grid of large
  cards, plus a 5th nav tab. They used to be a horizontal carousel of 144px
  cards with 12px titles.
- **Week strip** shows three distinct states: done = tick on gold, today = amber
  ring, future = empty dot. It previously drew a flame in every circle, which
  only repeated the streak counter.
- **Loading** is a ten-frame that fills itself (the same manipulative the grade-1
  trainers teach on), not a border spinner.
- **Hints**: a 3-tier scaffold that ASKS sub-questions instead of telling. Rule:
  the "I don't understand" button is available **before** the first attempt; the
  full worked solution is only offered **after** an attempt. Do not invert this —
  help that is only a consequence of failure gets avoided by children.

## 6. What we want from you

Design these, in this order. Mobile 390px first, then the desktop variant.

1. **Lesson runner** (`/lesson/[id]`) — the screen a child spends most time on.
   Known problems: content sits squashed at the top with ~50% empty space under
   the OK button; the 11-segment progress bar is illegible at 390px; the numeric
   answer input relies on the system keyboard, which covers half the screen.
   We want: task card vertically centred, OK button pinned to the bottom, one
   continuous progress bar, and an in-app numeric keypad (0–9 + backspace, keys
   ≥56px).
2. **`/lessons`** — subject and lesson browsing. Still full of 10px labels.
3. **Empty / first-run states** — a brand-new guest currently sees abstract
   counters ("Course 0 / 37", "0/4"). Propose something a 7-year-old understands.
4. **A spark character.** The one remaining Duolingo tell is our owl mascot. We
   want an "Ұшқын" spark creature instead: warm, simple, animatable in SVG, with
   3–4 states (idle, cheering on a correct answer, thinking during a hint,
   sleeping when the streak is at risk).

Deliver as: token-driven Tailwind v4 markup (use `var(--token)`), or a visual
mock plus the token mapping. Do not ship a new colour system.

## 7. OPEN QUESTION — the only decision we want you to argue

A reviewer proposed switching `--primary` from warm amber to **teal/blue**,
arguing the current amber feels heavy for a children's product.

Our position: the amber IS the identity (Ұшқын = spark), and the warm palette is
what separates us from every teal edtech app. We already fixed the legitimate
half of the complaint by making the amber **cleaner** — chroma raised 0.13 → 0.15
and kept inside sRGB so it no longer clips flat, plus darker so white text
finally clears 4.5:1.

Note that turquoise already exists in the system as `--brand`
(oklch(0.66 0.13 218)), the Kazakh flag colour, so a switch is technically cheap.

**Give us two side-by-side home screens** — one on the current warm amber, one
with turquoise promoted to primary — and a short argument for which better suits
a 6–10-year-old Kazakhstani audience. If you propose teal, state explicitly how
you keep green (`--success` = "correct") from being confused with a teal brand,
since teal and green sit close in hue.
