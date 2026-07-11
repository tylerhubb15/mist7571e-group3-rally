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

## In progress

- **Google Maps key on production** — the live site still shows "Google Maps
  isn't configured yet." `.env` is gitignored and never deploys, so Netlify
  needs `VITE_GOOGLE_MAPS_API_KEY` added under Site configuration →
  Environment variables, then a manual redeploy (env var changes don't
  auto-rebuild). Waiting on Tyler, who owns the Netlify account.

---

## Left to do, by role

| Role | Owner | Status | What's left |
|---|---|---|---|
| **1 · Tech Lead** (matching, Discover, data architecture) | Guillermo | Largely done | The 6 `feature/role*` branches are all stale/unused — nobody's been working on their own branch. Decide: clean them up, or formally switch to direct-to-main. |
| **2 · AI Integration Lead** (OpenAI call, server-side proxy) | Tyler | **Not started** | `netlify/functions/ai-brief.js` is still a stub — returns `"AI brief coming soon"`. This is the single biggest rubric gap (20/100 pts) and blocks Role 3. Sole ownership — Tyler needs to be able to defend this in Q&A. |
| **3 · Sessions View** (booking UI, renders the AI brief) | *Unassigned — no commits found* | Blocked | Booking flow (propose/confirm/decline) already works. The AI brief display does not exist anywhere in `CalendarView.jsx`. Blocked on Role 2 shipping a real response shape. |
| **4 · Profile View** (form, validation, persistence) | *Unassigned — no commits found* | Partial | Persistence now works (via Supabase). Validation is genuinely missing — no `required`, no length limits, no error state anywhere in `Profile.jsx`. Well-scoped task, ready to pick up. |
| **5 · QA / Code Quality** (standards, responsiveness) | *Unassigned — no commits found* | **Not started** | No `var`/`==`/array-index-`key` audit has ever been run. No loading/error-state review across async calls. This is a directly graded rubric line item (20 pts, "Code Quality"). |
| **6 · Deployment, Docs, Coordination** (Netlify, README, AI reflection) | Melanie + Guillermo | Partial | README still has "To Be Finalized" placeholders under Component Hierarchy, API Integrations, and Local Setup — all three are required verbatim by the Final Submission checklist. AI Tool Reflection (100–150 words, required) not yet written. |

### Contribution flag

Git history shows commits from only **three** of six members: Tyler, Melanie,
and Guillermo. **Matt, Tearra, and Tabatha have zero commits anywhere in the
repo.** Worth raising directly Monday — the rubric grades Peer Evaluation on
honest contribution reporting, and the final Q&A calls on individual members
by name to explain code they "ostensibly wrote." Roles 3, 4, and 5 above are
unassigned by elimination; better to confirm ownership now than at Week 11.

---

## Priority order (critical path)

1. **AI integration (Role 2)** — everything else is either independent or
   blocked on this. Nothing else matters for the demo without it.
2. **Google Maps env var** — quick, just needs Tyler's 5 minutes in Netlify.
3. **Sessions view AI brief display (Role 3)** — as soon as #1 has a real
   response shape.
4. **Profile validation (Role 4)** and **QA pass (Role 5)** — can run in
   parallel with the above, don't block anything.
5. **README + AI reflection (Role 6)** — quick, but required verbatim for
   Final Submission; don't leave it to the last week.

---

## Questions for Monday

- Who is actually doing Role 3, 4, and 5 work? Need names attached today.
- Tyler: timeline for the OpenAI call — what's blocking it, does he need help?
- Confirm everyone can get Netlify access (or at least visibility) so
  env-var blockers like the Maps key don't sit for days waiting on one person.
