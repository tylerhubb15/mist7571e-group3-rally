# Rally — Status & Action Items for Monday Meeting (2026-07-13)

MIST 7571E · Group 3
**Live app:** https://rally-team3-mist7571e.netlify.app/
**Repo:** https://github.com/tylerhubb15/mist7571e-group3-rally

---

## Since the last status doc (2026-06-09)

- Supabase backend fully wired — real auth, live matching engine, session
  booking, messaging, courts map (replaces mock data)
- Singles/doubles support end-to-end; match history overhaul (log results,
  per-set scores, edit own entries)
- Netlify build fixed — Supabase/Maps/react-query were used in code but
  missing from `package.json`, so every deploy since the Supabase commit
  had silently failed and served the old pre-Supabase build
- Google OAuth confirmed working end-to-end, both locally and in production

## Resolved since this doc (2026-07-12)

- **Role 2 AI integration — shipped.** `netlify/functions/ai-brief.js` now
  makes a real call to `gpt-4o-mini`. A new `AICoach` tab (sparkles icon)
  was added to the nav — users fill in opponent NTRP, format, day/time, and
  optional court to get 3 tactical bullets without needing a booked session.
  OpenAI key is set server-side in Netlify (never in client code). Committed
  as `d896309` by Tyler.
- **Google Maps key on production — resolved.** `VITE_GOOGLE_MAPS_API_KEY`
  set in Netlify environment variables and redeployed. Courts map now loads
  on the live site.
- **All four env vars confirmed in Netlify:** `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_MAPS_API_KEY`, `OPENAI_API_KEY`.

---

## Left to do, by role

| Role                                                                    | Owner                           | Status          | What's left                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------- | ------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 · Tech Lead** (matching, Discover, data architecture)               | Guillermo                       | Largely done    | The 6 `feature/role*` branches are all stale/unused — nobody's been working on their own branch. Decide: clean them up, or formally switch to direct-to-main.                                                                                   |
| **2 · AI Integration Lead** (OpenAI call, server-side proxy)            | Tyler                           | ✅ **Done**     | Real `gpt-4o-mini` call live. Standalone `AICoach` tab added (no session required). Server-side proxy pattern correct — key never in client bundle. Tyler can defend this in Q&A.                                                               |
| **3 · Sessions View** (booking UI, renders the AI brief)                | _Unassigned — no commits found_ | Unblocked       | Booking flow works. Role 2 is shipped. Note: AI brief is now a standalone tab rather than inline in CalendarView — confirm this satisfies the rubric or add an inline brief to confirmed session cards too.                                     |
| **4 · Profile View** (form, validation, persistence)                    | _Unassigned — no commits found_ | Partial         | Persistence now works (via Supabase). Validation is genuinely missing — no `required`, no length limits, no error state anywhere in `Profile.jsx`. Well-scoped task, ready to pick up.                                                          |
| **5 · QA / Code Quality** (standards, responsiveness)                   | _Unassigned — no commits found_ | **Not started** | No `var`/`==`/array-index-`key` audit has ever been run. No loading/error-state review across async calls. This is a directly graded rubric line item (20 pts, "Code Quality").                                                                 |
| **6 · Deployment, Docs, Coordination** (Netlify, README, AI reflection) | Melanie + Guillermo             | Partial         | README still has "To Be Finalized" placeholders under Component Hierarchy, API Integrations, and Local Setup — all three are required verbatim by the Final Submission checklist. AI Tool Reflection (100–150 words, required) not yet written. |

### Contribution flag

Git history shows commits from only **three** of six members: Tyler, Melanie,
and Guillermo. **Matt, Tearra, and Tabatha have zero commits anywhere in the
repo.** Worth raising directly Monday — the rubric grades Peer Evaluation on
honest contribution reporting, and the final Q&A calls on individual members
by name to explain code they "ostensibly wrote." Roles 3, 4, and 5 above are
unassigned by elimination; better to confirm ownership now than at Week 11.

---

## Priority order (critical path)

1. ~~**AI integration (Role 2)**~~ ✅ Done.
2. ~~**Google Maps env var**~~ ✅ Done.
3. **Sessions view / Role 3 ownership** — confirm who owns it and whether
   the AI brief should also appear inline on confirmed session cards.
4. **Profile validation (Role 4)** and **QA pass (Role 5)** — can run in
   parallel, don't block anything.
5. **README + AI reflection (Role 6)** — required verbatim for Final
   Submission; don't leave it to the last week.

---

## Questions for Monday

- Who is actually doing Role 3, 4, and 5 work? Need names attached today.
- Tyler: Role 2 is shipped — demo the AICoach tab at the meeting.
- Confirm everyone can get Netlify access (or at least visibility) so
  env-var blockers like the Maps key don't sit for days waiting on one person.
