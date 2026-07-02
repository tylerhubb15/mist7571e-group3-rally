# Rally — Tennis Partner Finder

MIST 7571E Group Project · Group 3
Melanie Burlew · Matt Holliday · Tyler Hubbard · Guillermo Ledezma · Tearra Perkins · Tabatha Renfroe

Rally helps recreational tennis players find compatible hitting partners using a
weighted matching engine, and generates an AI pre-session brief (OpenAI) for each
proposed session.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 — the app runs fully on mock data (no backend needed)
so everyone can develop immediately.

## Project structure

```
rally/
├── index.html
├── package.json
├── vite.config.js
├── .env.example          # copy to .env — NEVER commit .env
├── supabase/
│   └── schema.sql        # Postgres schema + find_matches() + RLS (Phase 2)
└── src/
    ├── main.jsx          # entry point
    ├── App.jsx           # tab navigation + top-level state
    ├── styles.css        # design system (court paper theme)
    ├── data/
    │   └── mockData.js   # Phase 1 mock players, courts, sessions, messages
    ├── lib/
    │   ├── matching.js   # weighted scoring engine (skill 35 / avail 30 / dist 20 / intent 15)
    │   └── services.js   # Supabase service layer (Phase 2)
    ├── hooks/
    │   └── hooks.jsx     # React Query hooks for live data (Phase 2)
    └── components/
        ├── Shared.jsx        # Avatar, ScoreRing, Header, Field
        ├── Discover.jsx      # ROLE 1 — matching + ranked list
        ├── Profile.jsx       # ROLE 4 — profile form + availability grid
        ├── CalendarView.jsx  # ROLE 3 — session booking flow
        ├── Messages.jsx      # messaging (Phase 2: Supabase Realtime)
        ├── CourtsMap.jsx     # custom SVG map of Athens courts
        └── ProposeModal.jsx  # session proposal sheet
```

## Team ownership

| Role | Owns | Files |
|------|------|-------|
| 1 — Tech lead / Discover | Matching engine, architecture, repo | `Discover.jsx`, `lib/matching.js`, `supabase/` |
| 2 — AI integration | OpenAI brief + server-side proxy | `lib/ai.js` (to create), proxy function |
| 3 — Sessions view | Booking flow, AI brief display | `CalendarView.jsx`, `ProposeModal.jsx` |
| 4 — Profile view | Form, validation, persistence | `Profile.jsx` |
| 5 — QA / code quality | Standards, responsiveness, testing | all files (review) |
| 6 — Deploy / docs | Netlify/Vercel, README, AI reflection | repo root |

## Phase plan

**Phase 1 (now → Week 8 demo):** app runs on mock data. Role 2 builds the AI
pre-session brief: a serverless function (Netlify Functions / Vercel Edge) that
receives two player profiles, calls OpenAI chat completions server-side, and
returns { compatibility, warmup, focus }. The OpenAI key lives ONLY in the
hosting dashboard's environment variables.

**Phase 2 (Weeks 9–10):** wire Supabase. Run `supabase/schema.sql` in the SQL
editor, fill `.env` from `.env.example`, and swap mock imports for the hooks in
`src/hooks/hooks.jsx` (requires `npm install @supabase/supabase-js @tanstack/react-query`).

**Week 11:** final polish, deployed URL, presentation.

## Course code standards (enforced in review)

- `const`/`let` only — no `var`
- Strict equality (`===`) everywhere
- Stable `key` props on all list renders (never array index for dynamic lists)
- Every async call has loading AND error states
- No API keys or `.env` committed — check before every push

## AI integration design (for the demo Q&A)

The AI feature sends structured match data (both players' NTRP, availability,
style, goals) to OpenAI and returns a pre-session brief. It is not a chatbot —
it turns match data the user already entered into actionable session prep,
which is the "genuinely useful" bar in the project guidelines.
