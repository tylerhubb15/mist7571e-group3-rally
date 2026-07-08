# Rally — Project Status

**MIST 7571E · Group 3 · Week 8 of 11**

Rally is a tennis partner-matching app built in React + Vite. It pairs recreational
players by skill, availability, location, and playing intent, and (in progress) generates
an AI pre-session brief for each proposed hit.

**Live app:** https://rally-team3-mist7571e.netlify.app/

---

## Summary

In eight weeks we've gone from proposal to a working, publicly deployed front-end
prototype with a weighted matching engine, restructured into a team-ready codebase with
the backend designed and scaffolded. Remaining work centers on the AI integration (our
core course requirement) and data persistence.

---

## Accomplished

- **Live deployment** — publicly accessible on Netlify; satisfies the deployment
  requirement and the Week 8 progress-check demo URL.
- **Working prototype with 5 views:**
  - **Discover** — ranked partner matching
  - **Courts** — custom SVG map of 6 Athens-area facilities
  - **Messages** — threaded direct messages
  - **Calendar** — propose → confirm → book session flow
  - **Profile** — skill rating, availability grid, playing intent
- **Matching engine** — weighted compatibility scoring:
  skill 35% · availability overlap 30% · distance 20% · intent 15%.
- **Course-compliant codebase** — refactored from a single file into
  single-responsibility components; `const`/`let` only, strict equality (`===`),
  stable `key` props throughout.
- **Backend fully designed and scaffolded** — Postgres schema with Row Level Security,
  a server-side `find_matches()` SQL function mirroring the matching engine, a Supabase
  service layer, and React Query hooks. Written and in the repo, ready to wire.
- **Team structure** — six roles mapped to the grading rubric with file-level ownership
  documented in the README.

---

## Left to do

| # | Task | Notes |
|---|------|-------|
| 1 | **AI integration** *(top priority)* | OpenAI pre-session brief (compatibility summary, warm-up, practice focus). Core course requirement — not yet started. |
| 2 | **Server-side proxy** | Netlify Function to keep the API key off the client. We're already on Netlify, so it deploys from the same repo. |
| 3 | **Loading + error states** | Required on every async operation once AI and backend calls land. |
| 4 | **Persistence** | localStorage on profile first, then full Supabase wiring (Phase 2). |
| 5 | **Continuous deploy check** | Confirm Netlify auto-builds from `main`, not just a one-time deploy. |
| 6 | **Edge cases** | Zero-availability guard, duplicate-session prevention, input length limits. |
| 7 | **Week 11 package** | Final presentation, AI tool reflection, peer evaluations. |

---

## Tech stack

- **Frontend:** React 18, Vite, lucide-react
- **Backend (Phase 2):** Supabase (Postgres + Auth + Realtime)
- **Data layer:** React Query
- **AI:** OpenAI Chat Completions (via server-side proxy)
- **Hosting:** Netlify (continuous deployment)

---

## Getting started

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. The app runs fully on mock data — no backend setup
required to develop locally.

---

## Phase plan

- **Phase 1 (now → Week 8):** app runs on mock data; build AI proxy + brief.
- **Phase 2 (Weeks 9–10):** wire Supabase — run `supabase/schema.sql`, fill `.env`,
  swap mock imports for the hooks in `src/hooks/`.
- **Week 11:** final polish, presentation, submission package.
