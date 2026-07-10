// Rally matching engine — weighted compatibility scoring.
// Weights: skill 35%, availability overlap 30%, distance 20%, intent 15%.
// The real scoring runs server-side in supabase/schema.sql (find_matches) —
// this file now just recomputes the same per-factor breakdown client-side
// for the Discover UI, since the RPC only returns the final match_score.

import { INTENTS } from "../data/mockData.js";

const intentRank = (intent) => INTENTS.indexOf(intent);

/**
 * scoreParts(me, candidate)
 * `me` — the current user's profile row (ntrp, radius_mi, slots, intent).
 * `candidate` — a row from find_matches() (ntrp, distance_mi, shared_slots, intent).
 * Returns the same 0–100 breakdown the server used to compute match_score —
 * display only, the ranked total always comes from the server.
 */
export function scoreParts(me, candidate) {
  const skill = Math.max(0, 1 - Math.abs(me.ntrp - candidate.ntrp) / 1.5);
  const sharedCount = candidate.shared_slots?.length || 0;
  const avail = me.slots?.length ? sharedCount / me.slots.length : 0;

  // Best pairwise match across every (my intent, their intent) combo —
  // mirrors the same logic in find_matches() server-side.
  let intent = 0;
  for (const mi of me.intent || []) {
    for (const ti of candidate.intent || []) {
      const gap = Math.abs(intentRank(mi) - intentRank(ti));
      const pair = gap === 0 ? 1 : gap === 1 ? 0.6 : 0.25;
      if (pair > intent) intent = pair;
    }
  }

  // Distance isn't shown as a normalized percentage — it's shown as a
  // real mi figure in the card header (see Discover.jsx) since a raw
  // distance is more meaningful to a player than an abstracted score.
  return {
    Skill: Math.round(skill * 100),
    Avail: Math.round(avail * 100),
    Intent: Math.round(intent * 100),
  };
}
